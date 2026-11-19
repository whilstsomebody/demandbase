import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { RequestOfferLoanService } from './request-offer-loan.service.js';
import { RequestOfferLoanController } from './request-offer-loan.controller.js';
import { LoanDueDateScheduler } from './loan-due-date.scheduler.js';
import { OfferExpiryScheduler } from './offer-expiry.scheduler.js';

@Module({
  imports: [CatalogModule],
  controllers: [RequestOfferLoanController],
  providers: [RequestOfferLoanService, LoanDueDateScheduler, OfferExpiryScheduler],
  exports: [RequestOfferLoanService],
})
export class RequestOfferLoanModule {}
