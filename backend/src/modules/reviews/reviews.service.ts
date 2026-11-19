import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateReviewDto } from './dto/create-review.dto.js';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReview(loanId: string, raterId: string, dto: CreateReviewDto) {
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw new NotFoundException('Loan not found');
    if (loan.state !== 'CLOSED') throw new ConflictException('You can only review a closed loan');
    if (loan.borrowerId !== raterId && loan.ownerId !== raterId) {
      throw new ForbiddenException('You are not a party to this loan');
    }

    const rateeId = raterId === loan.borrowerId ? loan.ownerId : loan.borrowerId;

    const existing = await this.prisma.review.findUnique({ where: { loanId_raterId: { loanId, raterId } } });
    if (existing) throw new ConflictException('You already reviewed this loan');

    const review = await this.prisma.review.create({
      data: { loanId, raterId, rateeId, score: dto.score, comment: dto.comment },
    });

    await this.recalculateTrustScore(rateeId);

    return review;
  }

  listForUser(userId: string) {
    return this.prisma.review.findMany({
      where: { rateeId: userId },
      include: { rater: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * trustScore (0-5) blends: review average (60%), completion rate - closed vs.
   * cancelled loans (25%), and on-time rate - closed loans that never went overdue (15%).
   * Users with no finished loans yet get a neutral 2.5 rather than 0, so a brand-new
   * account doesn't look actively untrustworthy.
   */
  private async recalculateTrustScore(userId: string) {
    const [reviewAggregate, finishedLoans] = await Promise.all([
      this.prisma.review.aggregate({ where: { rateeId: userId }, _avg: { score: true } }),
      this.prisma.loan.findMany({
        where: { OR: [{ borrowerId: userId }, { ownerId: userId }], state: { in: ['CLOSED', 'CANCELLED'] } },
        select: { state: true, overdueNotifiedAt: true },
      }),
    ]);

    const avgReviewScore = reviewAggregate._avg.score ?? 2.5;
    const closedLoans = finishedLoans.filter((loan) => loan.state === 'CLOSED');
    const completionRate = finishedLoans.length > 0 ? closedLoans.length / finishedLoans.length : 1;
    const onTimeRate =
      closedLoans.length > 0 ? closedLoans.filter((loan) => !loan.overdueNotifiedAt).length / closedLoans.length : 1;

    const trustScore = avgReviewScore * 0.6 + completionRate * 5 * 0.25 + onTimeRate * 5 * 0.15;

    await this.prisma.user.update({
      where: { id: userId },
      data: { trustScore: Math.max(0, Math.min(5, trustScore)) },
    });
  }
}
