import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { rankMatches } from './match-search.util';
import { composeAnalysisMessage } from './response-composer';

export interface AnalyzeResult {
  sessionId: string;
  message: string;
  entradaId: string;
  balanceAfter: number;
}

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

  async analyze(userId: string, matchId: string): Promise<AnalyzeResult> {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const entradas = await this.prisma.entrada.findMany({
      where: { matchId },
      orderBy: { publishedAt: 'asc' },
    });
    if (entradas.length === 0) {
      throw new NotFoundException('No entradas available for this match');
    }

    const principal = entradas[0];
    const message = composeAnalysisMessage(
      {
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        competition: match.competition,
      },
      entradas.map((e) => ({
        id: e.id,
        market: e.market,
        selection: e.selection,
        odd: Number(e.odd),
        justification: e.justification,
      })),
    );

    return this.prisma.$transaction(async (tx) => {
      // Money moves ONLY through CreditsService.applyTransaction. We pass the
      // active transaction client as the SECOND positional arg so the debit is
      // atomic with the chat persistence: a failed debit aborts the whole tx,
      // leaving neither a charge nor an orphan analysis.
      const credit = await this.credits.applyTransaction(
        {
          userId,
          type: 'unlock',
          amount: -principal.costInCredits,
          refType: 'tipster_analyze',
          refId: principal.id,
        },
        tx,
      );

      const session = await tx.chatSession.create({ data: { userId } });

      await tx.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'user',
          content: `Quero a análise de ${match.homeTeam} x ${match.awayTeam}.`,
        },
      });

      await tx.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'assistant',
          content: message,
          entradaId: principal.id,
        },
      });

      return {
        sessionId: session.id,
        message,
        entradaId: principal.id,
        balanceAfter: credit.balanceAfter,
      };
    });
  }
}
