import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EventsPublisherService } from '../../events/events-publisher.service.js';
import { EVENT_PATTERNS } from '../../events/event-types.js';
import { CatalogService, ITEM_SEARCH_INCLUDE } from '../catalog/catalog.service.js';

const LOAN_INCLUDE = {
  item: { include: ITEM_SEARCH_INCLUDE },
  offer: { include: { request: true } },
} as const;

@Injectable()
export class RequestOfferLoanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsPublisherService,
    private readonly catalog: CatalogService,
  ) {}

  async createDirectRequest(requesterId: string, itemId: string) {
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');
    if (item.ownerId === requesterId) {
      throw new BadRequestException('You cannot request your own item');
    }
    if (item.status !== 'AVAILABLE') {
      throw new ConflictException('This item is not currently available');
    }

    const offer = await this.prisma.$transaction(async (tx) => {
      const request = await tx.request.create({
        data: { requesterId, mode: 'DIRECT', targetOwnerId: item.ownerId, status: 'OPEN' },
      });
      return tx.offer.create({
        data: { requestId: request.id, ownerId: item.ownerId, itemId, status: 'PENDING' },
        include: { request: true, item: { include: ITEM_SEARCH_INCLUDE } },
      });
    });

    this.events.publish(EVENT_PATTERNS.OFFER_CREATED, {
      offerId: offer.id,
      requestId: offer.requestId,
      ownerId: offer.ownerId,
      itemId: offer.itemId,
      requesterId,
    });

    return offer;
  }

  /**
   * Broadcast mode: search already ran a plain keyword match (no AI); this creates the
   * Request + one Offer per matching, non-opted-out item and fans out OFFER_CREATED events.
   * Zero matches is a terminal state with no events published, per design.
   */
  async createBroadcastRequest(requesterId: string, rawText: string, requirementText: string) {
    const matches = await this.catalog.searchAvailableItems(requirementText, requesterId);

    const ownerIds = [...new Set(matches.map((item) => item.ownerId))];
    const owners = await this.prisma.user.findMany({
      where: { id: { in: ownerIds } },
      select: { id: true, optedOutCategoryIds: true },
    });
    const optOutsByOwner = new Map(owners.map((owner) => [owner.id, owner.optedOutCategoryIds]));
    const eligible = matches.filter((item) => !(optOutsByOwner.get(item.ownerId) ?? []).includes(item.categoryId));

    if (eligible.length === 0) {
      const request = await this.prisma.request.create({
        data: { requesterId, mode: 'BROADCAST', rawText, requirementText, status: 'NO_MATCH' },
      });
      return { request, offers: [] };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const request = await tx.request.create({
        data: { requesterId, mode: 'BROADCAST', rawText, requirementText, status: 'OPEN' },
      });
      const offers = await Promise.all(
        eligible.map((item) =>
          tx.offer.create({ data: { requestId: request.id, ownerId: item.ownerId, itemId: item.id, status: 'PENDING' } }),
        ),
      );
      return { request, offers };
    });

    for (const offer of result.offers) {
      this.events.publish(EVENT_PATTERNS.OFFER_CREATED, {
        offerId: offer.id,
        requestId: offer.requestId,
        ownerId: offer.ownerId,
        itemId: offer.itemId,
        requesterId,
      });
    }

    return result;
  }

  listMyRequests(requesterId: string) {
    return this.prisma.request.findMany({
      where: { requesterId },
      include: { offers: { include: { item: { include: ITEM_SEARCH_INCLUDE } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  listOffersReceived(ownerId: string) {
    return this.prisma.offer.findMany({
      where: { ownerId },
      include: {
        item: { include: ITEM_SEARCH_INCLUDE },
        request: { include: { requester: { select: { id: true, name: true, trustScore: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Direct mode: accepting immediately creates the loan (there's only ever one offer).
   * Broadcast mode: accepting only marks the owner as willing - the requester still has to
   * pick one of the (possibly several) accepted offers via `selectOffer`.
   */
  async acceptOffer(offerId: string, ownerId: string) {
    const offer = await this.prisma.offer.findUnique({ where: { id: offerId }, include: { item: true, request: true } });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.ownerId !== ownerId) throw new ForbiddenException('You do not own this offer');
    if (offer.status !== 'PENDING') throw new ConflictException('This offer is no longer pending');

    if (offer.request.mode === 'BROADCAST') {
      const updated = await this.prisma.offer.update({ where: { id: offerId }, data: { status: 'ACCEPTED' } });
      this.events.publish(EVENT_PATTERNS.BROADCAST_OFFER_ACCEPTED, {
        offerId,
        requestId: offer.requestId,
        requesterId: offer.request.requesterId,
        ownerId,
        itemId: offer.itemId,
      });
      return updated;
    }

    const loan = await this.prisma.$transaction(async (tx) => {
      const flipped = await tx.item.updateMany({
        where: { id: offer.itemId, status: 'AVAILABLE' },
        data: { status: 'UNAVAILABLE' },
      });
      if (flipped.count !== 1) {
        throw new ConflictException('This item is no longer available');
      }

      await tx.offer.update({ where: { id: offerId }, data: { status: 'ACCEPTED' } });
      await tx.request.update({ where: { id: offer.requestId }, data: { status: 'FULFILLED' } });

      // Someone else may have sent a separate direct request for this same item while this
      // one was pending - now that it's taken, decline those too instead of leaving them stuck.
      const siblingOffers = await tx.offer.findMany({
        where: { itemId: offer.itemId, id: { not: offerId }, status: { in: ['PENDING', 'ACCEPTED'] } },
        include: { request: true },
      });
      for (const sibling of siblingOffers) {
        await tx.offer.update({ where: { id: sibling.id }, data: { status: 'DECLINED' } });
        if (sibling.request.mode === 'DIRECT') {
          await tx.request.update({ where: { id: sibling.requestId }, data: { status: 'CANCELLED' } });
        }
      }

      const createdLoan = await tx.loan.create({
        data: { offerId, itemId: offer.itemId, borrowerId: offer.request.requesterId, ownerId, state: 'APPROVED' },
        include: LOAN_INCLUDE,
      });

      await tx.loanEvent.create({ data: { loanId: createdLoan.id, type: 'APPROVED', actorId: ownerId } });

      return { loan: createdLoan, siblingOffers };
    });

    this.events.publish(EVENT_PATTERNS.OFFER_ACCEPTED, {
      offerId,
      loanId: loan.loan.id,
      ownerId,
      borrowerId: loan.loan.borrowerId,
      itemId: loan.loan.itemId,
    });
    for (const sibling of loan.siblingOffers) {
      this.events.publish(EVENT_PATTERNS.OFFER_DECLINED, {
        offerId: sibling.id,
        ownerId,
        requesterId: sibling.request.requesterId,
        itemId: sibling.itemId,
      });
    }

    return loan.loan;
  }

  async declineOffer(offerId: string, ownerId: string) {
    const offer = await this.prisma.offer.findUnique({ where: { id: offerId }, include: { request: true } });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.ownerId !== ownerId) throw new ForbiddenException('You do not own this offer');
    if (offer.status !== 'PENDING') throw new ConflictException('This offer is no longer pending');

    await this.prisma.$transaction(async (tx) => {
      await tx.offer.update({ where: { id: offerId }, data: { status: 'DECLINED' } });
      if (offer.request.mode === 'DIRECT') {
        await tx.request.update({ where: { id: offer.requestId }, data: { status: 'CANCELLED' } });
      }
    });

    this.events.publish(EVENT_PATTERNS.OFFER_DECLINED, {
      offerId,
      ownerId,
      requesterId: offer.request.requesterId,
      itemId: offer.itemId,
    });

    return { declined: true };
  }

  /** Broadcast mode only: the requester finalizes one accepted offer into a loan. */
  async selectOffer(offerId: string, requesterId: string) {
    const offer = await this.prisma.offer.findUnique({ where: { id: offerId }, include: { item: true, request: true } });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.request.mode !== 'BROADCAST') throw new BadRequestException('Only broadcast offers need to be selected');
    if (offer.request.requesterId !== requesterId) throw new ForbiddenException('This is not your request');
    if (offer.status !== 'ACCEPTED') throw new ConflictException('This offer has not been accepted by its owner yet');

    const loan = await this.prisma.$transaction(async (tx) => {
      const flipped = await tx.item.updateMany({
        where: { id: offer.itemId, status: 'AVAILABLE' },
        data: { status: 'UNAVAILABLE' },
      });
      if (flipped.count !== 1) {
        throw new ConflictException('This item is no longer available');
      }

      await tx.offer.update({ where: { id: offerId }, data: { status: 'ACCEPTED' } });
      await tx.request.update({ where: { id: offer.requestId }, data: { status: 'FULFILLED' } });

      const otherOffers = await tx.offer.findMany({
        where: { requestId: offer.requestId, id: { not: offerId }, status: { in: ['PENDING', 'ACCEPTED'] } },
      });
      for (const other of otherOffers) {
        await tx.offer.update({ where: { id: other.id }, data: { status: 'DECLINED' } });
      }

      const createdLoan = await tx.loan.create({
        data: { offerId, itemId: offer.itemId, borrowerId: requesterId, ownerId: offer.ownerId, state: 'APPROVED' },
        include: LOAN_INCLUDE,
      });
      await tx.loanEvent.create({ data: { loanId: createdLoan.id, type: 'APPROVED', actorId: requesterId } });

      return { loan: createdLoan, otherOffers };
    });

    this.events.publish(EVENT_PATTERNS.OFFER_ACCEPTED, {
      offerId,
      loanId: loan.loan.id,
      ownerId: offer.ownerId,
      borrowerId: requesterId,
      itemId: offer.itemId,
    });
    for (const other of loan.otherOffers) {
      this.events.publish(EVENT_PATTERNS.OFFER_DECLINED, {
        offerId: other.id,
        ownerId: other.ownerId,
        requesterId,
        itemId: other.itemId,
      });
    }

    return loan.loan;
  }

  /** Broadcast mode only: requester gives up on a request, notifying any matched owners. */
  async cancelRequest(requestId: string, requesterId: string) {
    const request = await this.prisma.request.findUnique({ where: { id: requestId }, include: { offers: true } });
    if (!request) throw new NotFoundException('Request not found');
    if (request.requesterId !== requesterId) throw new ForbiddenException('This is not your request');
    if (request.status !== 'OPEN') throw new ConflictException('This request is no longer open');

    const activeOffers = request.offers.filter((offer) => offer.status === 'PENDING' || offer.status === 'ACCEPTED');

    await this.prisma.$transaction(async (tx) => {
      await tx.request.update({ where: { id: requestId }, data: { status: 'CANCELLED' } });
      for (const offer of activeOffers) {
        await tx.offer.update({ where: { id: offer.id }, data: { status: 'WITHDRAWN' } });
      }
    });

    for (const offer of activeOffers) {
      this.events.publish(EVENT_PATTERNS.REQUEST_CANCELLED, { requestId, ownerId: offer.ownerId, itemId: offer.itemId });
    }

    return { cancelled: true };
  }

  listMyLoans(userId: string) {
    return this.prisma.loan.findMany({
      where: { OR: [{ borrowerId: userId }, { ownerId: userId }] },
      include: LOAN_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async confirmPickup(loanId: string, userId: string) {
    const loan = await this.getLoanForActor(loanId, userId);
    if (loan.state !== 'APPROVED') {
      throw new ConflictException('This loan is not awaiting pickup confirmation');
    }

    const isBorrower = userId === loan.borrowerId;
    const alreadyConfirmed = isBorrower ? loan.pickupConfirmedByBorrowerAt : loan.pickupConfirmedByOwnerAt;
    if (alreadyConfirmed) return loan;

    const item = await this.prisma.item.findUnique({ where: { id: loan.itemId } });
    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const data = isBorrower ? { pickupConfirmedByBorrowerAt: now } : { pickupConfirmedByOwnerAt: now };
      let result = await tx.loan.update({ where: { id: loanId }, data, include: LOAN_INCLUDE });

      const bothConfirmed = Boolean(result.pickupConfirmedByBorrowerAt && result.pickupConfirmedByOwnerAt);
      if (bothConfirmed) {
        const dueAt = new Date(now.getTime() + (item?.maxLoanDurationDays ?? 7) * 24 * 60 * 60 * 1000);
        result = await tx.loan.update({
          where: { id: loanId },
          data: { state: 'ACTIVE', activatedAt: now, dueAt },
          include: LOAN_INCLUDE,
        });
        await tx.loanEvent.create({ data: { loanId, type: 'ACTIVATED', actorId: userId } });
      } else {
        await tx.loanEvent.create({ data: { loanId, type: 'PICKUP_CONFIRMED', actorId: userId } });
      }

      return result;
    });

    this.events.publish(EVENT_PATTERNS.LOAN_PICKUP_CONFIRMED, {
      loanId,
      borrowerId: loan.borrowerId,
      ownerId: loan.ownerId,
      itemId: loan.itemId,
      confirmedBy: userId,
    });

    if (updated.state === 'ACTIVE') {
      this.events.publish(EVENT_PATTERNS.LOAN_ACTIVATED, {
        loanId,
        borrowerId: loan.borrowerId,
        ownerId: loan.ownerId,
        itemId: loan.itemId,
        dueAt: updated.dueAt?.toISOString(),
      });
    }

    return updated;
  }

  async confirmReturn(loanId: string, userId: string) {
    const loan = await this.getLoanForActor(loanId, userId);
    if (loan.state !== 'ACTIVE' && loan.state !== 'RETURN_REQUESTED') {
      throw new ConflictException('This loan is not active');
    }

    const isBorrower = userId === loan.borrowerId;
    const alreadyConfirmed = isBorrower ? loan.returnConfirmedByBorrowerAt : loan.returnConfirmedByOwnerAt;
    if (alreadyConfirmed) return loan;

    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const data = isBorrower ? { returnConfirmedByBorrowerAt: now } : { returnConfirmedByOwnerAt: now };
      let result = await tx.loan.update({ where: { id: loanId }, data, include: LOAN_INCLUDE });

      const bothConfirmed = Boolean(result.returnConfirmedByBorrowerAt && result.returnConfirmedByOwnerAt);
      if (bothConfirmed) {
        result = await tx.loan.update({
          where: { id: loanId },
          data: { state: 'CLOSED', closedAt: now },
          include: LOAN_INCLUDE,
        });
        await tx.item.update({ where: { id: loan.itemId }, data: { status: 'AVAILABLE' } });
        await tx.loanEvent.create({ data: { loanId, type: 'CLOSED', actorId: userId } });
      } else {
        result = await tx.loan.update({ where: { id: loanId }, data: { state: 'RETURN_REQUESTED' }, include: LOAN_INCLUDE });
        await tx.loanEvent.create({ data: { loanId, type: 'RETURN_REQUESTED', actorId: userId } });
      }

      return result;
    });

    if (updated.state === 'CLOSED') {
      this.events.publish(EVENT_PATTERNS.LOAN_CLOSED, {
        loanId,
        borrowerId: loan.borrowerId,
        ownerId: loan.ownerId,
        itemId: loan.itemId,
      });
    } else {
      this.events.publish(EVENT_PATTERNS.LOAN_RETURN_REQUESTED, {
        loanId,
        borrowerId: loan.borrowerId,
        ownerId: loan.ownerId,
        itemId: loan.itemId,
        confirmedBy: userId,
      });
    }

    return updated;
  }

  async cancelLoan(loanId: string, userId: string) {
    const loan = await this.getLoanForActor(loanId, userId);
    if (loan.state !== 'APPROVED') {
      throw new ConflictException('Only a loan awaiting pickup can be cancelled');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.loan.update({ where: { id: loanId }, data: { state: 'CANCELLED' }, include: LOAN_INCLUDE });
      await tx.item.update({ where: { id: loan.itemId }, data: { status: 'AVAILABLE' } });
      await tx.loanEvent.create({ data: { loanId, type: 'CANCELLED', actorId: userId } });
      return result;
    });

    this.events.publish(EVENT_PATTERNS.LOAN_CANCELLED, {
      loanId,
      borrowerId: loan.borrowerId,
      ownerId: loan.ownerId,
      itemId: loan.itemId,
    });

    return updated;
  }

  private async getLoanForActor(loanId: string, userId: string) {
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId }, include: LOAN_INCLUDE });
    if (!loan) throw new NotFoundException('Loan not found');
    if (loan.borrowerId !== userId && loan.ownerId !== userId) {
      throw new ForbiddenException('You are not a party to this loan');
    }
    return loan;
  }
}
