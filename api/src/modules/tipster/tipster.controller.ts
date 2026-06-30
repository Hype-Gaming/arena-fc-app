import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthUser } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { TipsterService } from './tipster.service';
import { MatchSearchQueryDto } from './dto/match-search-query.dto';
import { AnalyzeDto } from './dto/analyze.dto';

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
}
