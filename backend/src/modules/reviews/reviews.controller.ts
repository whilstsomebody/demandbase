import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { ReviewsService } from './reviews.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';

@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('loans/:id/reviews')
  createReview(@CurrentUserId() userId: string, @Param('id') loanId: string, @Body() dto: CreateReviewDto) {
    return this.reviews.createReview(loanId, userId, dto);
  }

  @Get('users/:id/reviews')
  listForUser(@Param('id') userId: string) {
    return this.reviews.listForUser(userId);
  }
}
