import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findMe(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, email: true, trustScore: true, verificationLevel: true, optedOutCategoryIds: true },
    });
  }

  updateNotificationPreferences(userId: string, optedOutCategoryIds: string[]) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { optedOutCategoryIds },
      select: { id: true, optedOutCategoryIds: true },
    });
  }
}
