// api/src/modules/admin/sport-events.controller.ts
import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from './admin-role.guard';
import { SportsFeedService } from '../sports-feed/sports-feed.service';

@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('admin/sport-events')
export class AdminSportEventsController {
  constructor(private readonly feed: SportsFeedService) {}

  @Get() list(@Query('q') q?: string) { return this.feed.list(q); }

  @Post('sync') sync() { return this.feed.sync(); }
}
