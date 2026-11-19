import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { RequestOfferLoanService } from './request-offer-loan.service.js';
import { CreateDirectRequestDto } from './dto/create-direct-request.dto.js';

@UseGuards(JwtAuthGuard)
@Controller()
export class RequestOfferLoanController {
  constructor(private readonly service: RequestOfferLoanService) {}

  @Post('requests')
  createDirectRequest(@CurrentUserId() userId: string, @Body() dto: CreateDirectRequestDto) {
    return this.service.createDirectRequest(userId, dto.itemId);
  }

  @Get('requests/mine')
  listMyRequests(@CurrentUserId() userId: string) {
    return this.service.listMyRequests(userId);
  }

  @Get('offers/received')
  listOffersReceived(@CurrentUserId() userId: string) {
    return this.service.listOffersReceived(userId);
  }

  @Post('offers/:id/accept')
  acceptOffer(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.service.acceptOffer(id, userId);
  }

  @Post('offers/:id/decline')
  declineOffer(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.service.declineOffer(id, userId);
  }

  @Post('offers/:id/select')
  selectOffer(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.service.selectOffer(id, userId);
  }

  @Post('requests/:id/cancel')
  cancelRequest(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.service.cancelRequest(id, userId);
  }

  @Get('loans/mine')
  listMyLoans(@CurrentUserId() userId: string) {
    return this.service.listMyLoans(userId);
  }

  @Post('loans/:id/confirm-pickup')
  confirmPickup(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.service.confirmPickup(id, userId);
  }

  @Post('loans/:id/confirm-return')
  confirmReturn(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.service.confirmReturn(id, userId);
  }

  @Post('loans/:id/cancel')
  cancelLoan(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.service.cancelLoan(id, userId);
  }
}
