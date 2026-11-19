import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EventsPublisherService } from '../../events/events-publisher.service.js';
import { EVENT_PATTERNS } from '../../events/event-types.js';

const DUE_SOON_WINDOW_HOURS = 24;

@Injectable()
export class LoanDueDateScheduler {
  private readonly logger = new Logger(LoanDueDateScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsPublisherService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async checkDueSoonAndOverdue() {
    const now = new Date();
    const dueSoonThreshold = new Date(now.getTime() + DUE_SOON_WINDOW_HOURS * 60 * 60 * 1000);

    const dueSoonLoans = await this.prisma.loan.findMany({
      where: { state: 'ACTIVE', dueSoonNotifiedAt: null, dueAt: { not: null, lte: dueSoonThreshold } },
    });
    for (const loan of dueSoonLoans) {
      await this.prisma.loan.update({ where: { id: loan.id }, data: { dueSoonNotifiedAt: now } });
      this.events.publish(EVENT_PATTERNS.LOAN_DUE_SOON, {
        loanId: loan.id,
        borrowerId: loan.borrowerId,
        dueAt: loan.dueAt?.toISOString(),
      });
    }

    const overdueLoans = await this.prisma.loan.findMany({
      where: { state: 'ACTIVE', overdueNotifiedAt: null, dueAt: { not: null, lte: now } },
    });
    for (const loan of overdueLoans) {
      await this.prisma.loan.update({ where: { id: loan.id }, data: { overdueNotifiedAt: now } });
      this.events.publish(EVENT_PATTERNS.LOAN_OVERDUE, {
        loanId: loan.id,
        borrowerId: loan.borrowerId,
        dueAt: loan.dueAt?.toISOString(),
      });
    }

    if (dueSoonLoans.length || overdueLoans.length) {
      this.logger.log(`Due-soon: ${dueSoonLoans.length}, overdue: ${overdueLoans.length}`);
    }
  }
}
