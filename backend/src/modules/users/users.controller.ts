import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { UsersService } from './users.service.js';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('users/me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  findMe(@CurrentUserId() userId: string) {
    return this.users.findMe(userId);
  }

  @Patch('notification-preferences')
  updateNotificationPreferences(@CurrentUserId() userId: string, @Body() dto: UpdateNotificationPreferencesDto) {
    return this.users.updateNotificationPreferences(userId, dto.optedOutCategoryIds);
  }
}
