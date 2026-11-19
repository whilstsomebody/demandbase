import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';

const ACCEPTED_OFFER_TTL_HOURS = 48;

@Injectable()
export class OfferExpiryScheduler {
  private readonly logger = new Logger(OfferExpiryScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async expireStaleAcceptedOffers() {
    const staleBefore = new Date(Date.now() - ACCEPTED_OFFER_TTL_HOURS * 60 * 60 * 1000);

    const { count } = await this.prisma.offer.updateMany({
      where: {
        status: 'ACCEPTED',
        updatedAt: { lte: staleBefore },
        request: { mode: 'BROADCAST' },
      },
      data: { status: 'EXPIRED' },
    });

    if (count) this.logger.log(`Expired ${count} stale accepted broadcast offers`);
  }
}
