import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { rankMatches } from './match-search.util';

@Injectable()
export class TipsterService {
  private static readonly SEARCH_LIMIT = 10;
  private static readonly SCAN_LIMIT = 200;

  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
  ) {}

  async searchMatches(q: string) {
    const candidates = await this.prisma.match.findMany({
      where: { status: { in: ['scheduled', 'live'] } },
      orderBy: { startsAt: 'asc' },
      take: TipsterService.SCAN_LIMIT,
    });
    return rankMatches(q, candidates, TipsterService.SEARCH_LIMIT);
  }
}
