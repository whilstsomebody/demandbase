import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { RequestOfferLoanModule } from '../request-offer-loan/request-offer-loan.module.js';
import { CommunityFeedService } from './community-feed.service.js';
import { CommunityFeedController } from './community-feed.controller.js';

@Module({
  imports: [CatalogModule, RequestOfferLoanModule],
  controllers: [CommunityFeedController],
  providers: [CommunityFeedService],
  exports: [CommunityFeedService],
})
export class CommunityFeedModule {}
