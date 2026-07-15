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

  /**
   * Resolve a crest for a typed team name: catalog first, then an
   * API-Football search (seleções translated PT→EN), caching the result.
   * Powers the "type a name → crest appears" preview in the create form.
   */
  @Get('resolve-logo')
  async resolveLogo(@Query('name') name = '', @Query('iso') iso?: string) {
    const logo = await this.service.resolveTeamLogo(name, iso || null);
    return { logo };
  }

  @Post('sync') sync(@Body() dto: SyncTeamsDto) {
    return this.service.sync(dto.league ?? 71, dto.season ?? 2024);
  }

  /** Fetch crests for the teams currently in play (Ao Vivo). */
  @Post('sync-live-logos') syncLiveLogos() {
    return this.service.syncLiveLogos();
  }

  /** Pull teams for every league the Esportiva prematch feed is showing. */
  @Post('sync-esportiva-leagues') syncEsportivaLeagues() {
    return this.service.syncEsportivaLeagues();
  }

  /** Pull national-team squads (World Cup / Euro / Copa América) for crests. */
  @Post('sync-national-teams') syncNationalTeams() {
    return this.service.syncNationalTeams();
  }
}
