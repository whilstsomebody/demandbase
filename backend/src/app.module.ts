import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { MailModule } from './mail/mail.module.js';
import { StorageModule } from './storage/storage.module.js';
import { EventsModule } from './events/events.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { CommunityFeedModule } from './modules/community-feed/community-feed.module.js';
import { MatchingModule } from './modules/matching/matching.module.js';
import { RequestOfferLoanModule } from './modules/request-offer-loan/request-offer-loan.module.js';
import { ReviewsModule } from './modules/reviews/reviews.module.js';
import { ModerationModule } from './modules/moderation/moderation.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    MailModule,
    StorageModule,
    EventsModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    CommunityFeedModule,
    MatchingModule,
    RequestOfferLoanModule,
    ReviewsModule,
    ModerationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
