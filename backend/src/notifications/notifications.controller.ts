import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtAuthGuard } from '../modules/auth/jwt-auth.guard.js';
import { CurrentUserId } from '../modules/auth/current-user.decorator.js';
import { NotificationsService } from './notifications.service.js';
import { EVENT_PATTERNS } from '../events/event-types.js';
import type {
  BroadcastOfferAcceptedEvent,
  LoanActorEvent,
  LoanDueEvent,
  OfferAcceptedEvent,
  OfferCreatedEvent,
  OfferDeclinedEvent,
  RequestCancelledEvent,
  RequestNoMatchEvent,
} from '../events/event-types.js';

@Controller()
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('notifications/mine')
  listMine(@CurrentUserId() userId: string) {
    return this.notifications.listForUser(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('notifications/:id/read')
  markRead(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.notifications.markRead(id, userId);
  }

  @EventPattern(EVENT_PATTERNS.OFFER_CREATED)
  async onOfferCreated(@Payload() event: OfferCreatedEvent) {
    const item = await this.prisma.item.findUnique({ where: { id: event.itemId } });
    await this.notifications.notify({
      userId: event.ownerId,
      type: 'OFFER_RECEIVED',
      payload: event,
      subject: 'Someone wants to borrow your item',
      html: `<p>Someone requested to borrow your item "${item?.title ?? 'item'}". Open the app to accept or decline.</p>`,
    });
  }

  @EventPattern(EVENT_PATTERNS.OFFER_ACCEPTED)
  async onOfferAccepted(@Payload() event: OfferAcceptedEvent) {
    const item = await this.prisma.item.findUnique({ where: { id: event.itemId } });
    await this.notifications.notify({
      userId: event.borrowerId,
      type: 'OFFER_ACCEPTED',
      payload: event,
      subject: 'Your borrow request was accepted',
      html: `<p>Your request for "${item?.title ?? 'item'}" was accepted. Coordinate pickup with the owner, then confirm pickup in the app.</p>`,
    });
  }

  @EventPattern(EVENT_PATTERNS.OFFER_DECLINED)
  async onOfferDeclined(@Payload() event: OfferDeclinedEvent) {
    const item = await this.prisma.item.findUnique({ where: { id: event.itemId } });
    await this.notifications.notify({
      userId: event.requesterId,
      type: 'OFFER_DECLINED',
      payload: event,
      subject: 'Your borrow request was declined',
      html: `<p>Your request for "${item?.title ?? 'item'}" was declined.</p>`,
    });
  }

  @EventPattern(EVENT_PATTERNS.LOAN_PICKUP_CONFIRMED)
  async onLoanPickupConfirmed(@Payload() event: LoanActorEvent & { confirmedBy: string }) {
    const otherParty = event.confirmedBy === event.borrowerId ? event.ownerId : event.borrowerId;
    await this.notifications.notify({
      userId: otherParty,
      type: 'LOAN_PICKUP_CONFIRMED',
      payload: event,
      subject: 'Pickup confirmed - waiting on you',
      html: `<p>The other party confirmed pickup. Confirm it too once you've handed over/received the item.</p>`,
    });
  }

  @EventPattern(EVENT_PATTERNS.LOAN_ACTIVATED)
  async onLoanActivated(@Payload() event: LoanActorEvent & { dueAt: string }) {
    const item = await this.prisma.item.findUnique({ where: { id: event.itemId } });
    for (const userId of [event.borrowerId, event.ownerId]) {
      await this.notifications.notify({
        userId,
        type: 'LOAN_ACTIVATED',
        payload: event,
        subject: 'Loan is now active',
        html: `<p>The loan for "${item?.title ?? 'item'}" is active. Due back by ${event.dueAt}.</p>`,
      });
    }
  }

  @EventPattern(EVENT_PATTERNS.LOAN_RETURN_REQUESTED)
  async onLoanReturnRequested(@Payload() event: LoanActorEvent & { confirmedBy: string }) {
    const otherParty = event.confirmedBy === event.borrowerId ? event.ownerId : event.borrowerId;
    await this.notifications.notify({
      userId: otherParty,
      type: 'LOAN_RETURN_REQUESTED',
      payload: event,
      subject: 'Return confirmed - waiting on you',
      html: `<p>The other party confirmed the return. Confirm it too to close out the loan.</p>`,
    });
  }

  @EventPattern(EVENT_PATTERNS.LOAN_CLOSED)
  async onLoanClosed(@Payload() event: LoanActorEvent) {
    const item = await this.prisma.item.findUnique({ where: { id: event.itemId } });
    for (const userId of [event.borrowerId, event.ownerId]) {
      await this.notifications.notify({
        userId,
        type: 'LOAN_CLOSED',
        payload: event,
        subject: 'Loan closed',
        html: `<p>The loan for "${item?.title ?? 'item'}" is now closed. Leave a review for the other party!</p>`,
      });
    }
  }

  @EventPattern(EVENT_PATTERNS.LOAN_CANCELLED)
  async onLoanCancelled(@Payload() event: LoanActorEvent) {
    const item = await this.prisma.item.findUnique({ where: { id: event.itemId } });
    for (const userId of [event.borrowerId, event.ownerId]) {
      await this.notifications.notify({
        userId,
        type: 'LOAN_CANCELLED',
        payload: event,
        subject: 'Loan cancelled',
        html: `<p>The loan for "${item?.title ?? 'item'}" was cancelled before pickup.</p>`,
      });
    }
  }

  @EventPattern(EVENT_PATTERNS.LOAN_DUE_SOON)
  async onLoanDueSoon(@Payload() event: LoanDueEvent) {
    await this.notifications.notify({
      userId: event.borrowerId,
      type: 'LOAN_DUE_SOON',
      payload: event,
      subject: 'Your borrowed item is due soon',
      html: `<p>Reminder: your borrowed item is due back by ${event.dueAt}.</p>`,
    });
  }

  @EventPattern(EVENT_PATTERNS.LOAN_OVERDUE)
  async onLoanOverdue(@Payload() event: LoanDueEvent) {
    await this.notifications.notify({
      userId: event.borrowerId,
      type: 'LOAN_OVERDUE',
      payload: event,
      subject: 'Your borrowed item is overdue',
      html: `<p>Your borrowed item was due back by ${event.dueAt} and is now overdue. Please return it.</p>`,
    });
  }

  @EventPattern(EVENT_PATTERNS.REQUEST_NO_MATCH)
  async onRequestNoMatch(@Payload() event: RequestNoMatchEvent) {
    await this.notifications.notify({
      userId: event.requesterId,
      type: 'REQUEST_NO_MATCH',
      payload: event,
      subject: 'No matches found for your request',
      html: `<p>No one currently has "${event.requirementText}" listed as available.</p>`,
    });
  }

  @EventPattern(EVENT_PATTERNS.BROADCAST_OFFER_ACCEPTED)
  async onBroadcastOfferAccepted(@Payload() event: BroadcastOfferAcceptedEvent) {
    const item = await this.prisma.item.findUnique({ where: { id: event.itemId } });
    await this.notifications.notify({
      userId: event.requesterId,
      type: 'BROADCAST_OFFER_ACCEPTED',
      payload: event,
      subject: 'Someone can lend you what you need',
      html: `<p>An owner is willing to lend you "${item?.title ?? 'an item'}". Open the app to pick an offer.</p>`,
    });
  }

  @EventPattern(EVENT_PATTERNS.REQUEST_CANCELLED)
  async onRequestCancelled(@Payload() event: RequestCancelledEvent) {
    const item = await this.prisma.item.findUnique({ where: { id: event.itemId } });
    await this.notifications.notify({
      userId: event.ownerId,
      type: 'REQUEST_CANCELLED',
      payload: event,
      subject: 'A request you matched was cancelled',
      html: `<p>The request for "${item?.title ?? 'an item'}" was cancelled by the requester.</p>`,
    });
  }
}
