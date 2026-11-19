import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { CommunityFeedService } from './community-feed.service.js';
import { CreatePostDto } from './dto/create-post.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('community-feed')
export class CommunityFeedController {
  constructor(private readonly feed: CommunityFeedService) {}

  @Post('preview')
  preview(@CurrentUserId() userId: string, @Body() dto: CreatePostDto) {
    return this.feed.preview(userId, dto.body);
  }

  @Post('posts')
  createPost(@CurrentUserId() userId: string, @Body() dto: CreatePostDto) {
    return this.feed.createPost(userId, dto.body);
  }

  @Get('posts')
  listFeed() {
    return this.feed.listFeed();
  }
}
