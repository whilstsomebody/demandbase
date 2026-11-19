import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateReportDto } from './dto/create-report.dto.js';
import type { ResolveReportDto } from './dto/resolve-report.dto.js';

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(reporterId: string, dto: CreateReportDto) {
    if (dto.loanId) {
      const loan = await this.prisma.loan.findUnique({ where: { id: dto.loanId } });
      if (!loan) throw new NotFoundException('Loan not found');
      if (loan.borrowerId !== reporterId && loan.ownerId !== reporterId) {
        throw new ForbiddenException('You are not a party to this loan');
      }
    }

    return this.prisma.report.create({
      data: {
        reporterId,
        type: dto.type,
        description: dto.description,
        loanId: dto.loanId,
        itemId: dto.itemId,
      },
    });
  }

  listMine(reporterId: string) {
    return this.prisma.report.findMany({ where: { reporterId }, orderBy: { createdAt: 'desc' } });
  }

  listAll() {
    return this.prisma.report.findMany({
      include: { reporter: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveReport(reportId: string, resolverId: string, dto: ResolveReportDto) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');

    if (dto.suspendReportedUser && dto.reportedUserId) {
      await this.prisma.user.update({ where: { id: dto.reportedUserId }, data: { isSuspended: true } });
    }

    return this.prisma.report.update({
      where: { id: reportId },
      data: { status: 'RESOLVED', resolution: dto.resolution, resolvedById: resolverId },
    });
  }

  dismissReport(reportId: string, resolverId: string, resolution: string) {
    return this.prisma.report.update({
      where: { id: reportId },
      data: { status: 'DISMISSED', resolution, resolvedById: resolverId },
    });
  }

  listUsers() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, trustScore: true, isAdmin: true, isSuspended: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async setSuspended(userId: string, isSuspended: boolean) {
    return this.prisma.user.update({ where: { id: userId }, data: { isSuspended }, select: { id: true, isSuspended: true } });
  }
}
