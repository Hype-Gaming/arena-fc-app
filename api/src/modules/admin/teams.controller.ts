// api/src/modules/admin/teams.controller.ts
import {
  Body, Controller, Get, Post, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from './admin-role.guard';
import { AdminTeamsService } from './teams.service';
import { SyncTeamsDto } from './dto/team.dto';

@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('admin/teams')
export class AdminTeamsController {
  constructor(private readonly service: AdminTeamsService) {}

  @Get() list(@Query('q') q?: string) { return this.service.list(q); }

  @Post('sync') sync(@Body() dto: SyncTeamsDto) {
    return this.service.sync(dto.league ?? 71, dto.season ?? 2024);
  }

  /** Fetch crests for the teams currently in play (Ao Vivo). */
  @Post('sync-live-logos') syncLiveLogos() {
    return this.service.syncLiveLogos();
  }
}
