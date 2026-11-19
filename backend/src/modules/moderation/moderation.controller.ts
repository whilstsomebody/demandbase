import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { ModerationService } from './moderation.service.js';
import { CreateReportDto } from './dto/create-report.dto.js';
import { ResolveReportDto } from './dto/resolve-report.dto.js';

@UseGuards(JwtAuthGuard)
@Controller()
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Post('reports')
  createReport(@CurrentUserId() userId: string, @Body() dto: CreateReportDto) {
    return this.moderation.createReport(userId, dto);
  }

  @Get('reports/mine')
  listMine(@CurrentUserId() userId: string) {
    return this.moderation.listMine(userId);
  }

  @UseGuards(AdminGuard)
  @Get('admin/reports')
  listAll() {
    return this.moderation.listAll();
  }

  @UseGuards(AdminGuard)
  @Patch('admin/reports/:id/resolve')
  resolveReport(@CurrentUserId() userId: string, @Param('id') id: string, @Body() dto: ResolveReportDto) {
    return this.moderation.resolveReport(id, userId, dto);
  }

  @UseGuards(AdminGuard)
  @Patch('admin/reports/:id/dismiss')
  dismissReport(@CurrentUserId() userId: string, @Param('id') id: string, @Body('resolution') resolution: string) {
    return this.moderation.dismissReport(id, userId, resolution);
  }

  @UseGuards(AdminGuard)
  @Get('admin/users')
  listUsers() {
    return this.moderation.listUsers();
  }

  @UseGuards(AdminGuard)
  @Patch('admin/users/:id/suspend')
  suspendUser(@Param('id') id: string) {
    return this.moderation.setSuspended(id, true);
  }

  @UseGuards(AdminGuard)
  @Patch('admin/users/:id/unsuspend')
  unsuspendUser(@Param('id') id: string) {
    return this.moderation.setSuspended(id, false);
  }
}
