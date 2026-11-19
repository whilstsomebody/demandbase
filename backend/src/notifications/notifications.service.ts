import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import type { $Enums, Prisma } from '../generated/prisma/client.js';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async notify(params: {
    userId: string;
    type: $Enums.NotificationType;
    payload: object;
    subject: string;
    html: string;
  }): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: params.userId } });
    if (!user) return;

    await this.prisma.notification.create({
      data: { userId: params.userId, type: params.type, payload: params.payload as Prisma.InputJsonValue },
    });

    await this.mail.send({ to: user.email, subject: params.subject, html: params.html });
  }

  listForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification || notification.userId !== userId) return null;
    return this.prisma.notification.update({ where: { id: notificationId }, data: { readAt: new Date() } });
  }
}
