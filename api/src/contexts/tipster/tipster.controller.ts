import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthUser } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { TipsterService } from './tipster.service';
import { MatchSearchQueryDto } from './dto/match-search-query.dto';
import { AnalyzeDto } from './dto/analyze.dto';
import { AnalyzeLiveDto } from './dto/analyze-live.dto';
import { AnalyzeUpcomingDto } from './dto/analyze-upcoming.dto';

@Controller('tipster')
@UseGuards(JwtAuthGuard)
export class TipsterController {
  constructor(private readonly tipster: TipsterService) {}

  @Get('match-search')
  async search(@Query() query: MatchSearchQueryDto) {
    const matches = await this.tipster.searchMatches(query.q);
    return { matches };
  }

  @Post('analyze')
  async analyze(@CurrentUser() user: AuthUser, @Body() body: AnalyzeDto) {
    return this.tipster.analyze(user.userId, body.matchId);
  }

  @Get('live')
  async live() {
    const matches = await this.tipster.liveMatches();
    return { matches };
  }

  /** Upcoming real fixtures from the sportsbook feed (same games as the book). */
  @Get('upcoming')
  async upcoming() {
    const matches = await this.tipster.upcomingMatches();
    return { matches };
  }

  @Post('analyze-live')
  async analyzeLive(
    @CurrentUser() user: AuthUser,
    @Body() body: AnalyzeLiveDto,
  ) {
    return this.tipster.analyzeLive(user.userId, body.externalId);
  }

  @Post('analyze-upcoming')
  async analyzeUpcoming(
    @CurrentUser() user: AuthUser,
    @Body() body: AnalyzeUpcomingDto,
  ) {
    return this.tipster.analyzeUpcoming(user.userId, body.externalId);
  }
}
