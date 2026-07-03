import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { InsufficientCreditsError } from '../credits/errors';
import { SportsFeedService } from '../sports-feed/sports-feed.service';
import { NormalizedLiveEvent } from '../sports-feed/sports-feed.types';
import { rankMatches } from './match-search.util';
import {
  AI_ANALYSIS_PROVIDER,
  AiAnalysisProvider,
  AnalysisCandidate,
  AnalysisInput,
} from './ai/ai-analysis.types';

export interface AnalyzeResult {
  sessionId: string;
  message: string;
  /** The recommended prematch entrada, or null for a live analysis. */
  entradaId: string | null;
  balanceAfter: number;
}

/** A live analysis costs a flat credit (there is no curated entrada to price). */
const LIVE_ANALYSIS_COST = 1;

@Injectable()
export class TipsterService {
  private static readonly SEARCH_LIMIT = 10;
  private static readonly SCAN_LIMIT = 200;

  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    private readonly sportsFeed: SportsFeedService,
    @Inject(AI_ANALYSIS_PROVIDER)
    private readonly ai: AiAnalysisProvider,
  ) {}

  async searchMatches(q: string) {
    const candidates = await this.prisma.match.findMany({
      where: { status: { in: ['scheduled', 'live'] } },
      orderBy: { startsAt: 'asc' },
      take: TipsterService.SCAN_LIMIT,
    });
    return rankMatches(q, candidates, TipsterService.SEARCH_LIMIT);
  }

  /** Current in-play matches for the "Ao Vivo" tab. */
  liveMatches(): Promise<NormalizedLiveEvent[]> {
    return this.sportsFeed.fetchLive();
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
    const input: AnalysisInput = {
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      competition: match.competition,
      candidates: entradas.map((e) => ({
        id: e.id,
        market: e.market,
        selection: e.selection,
        odd: Number(e.odd),
        justification: e.justification,
      })),
    };

    return this.runAnalysis(userId, input, principal.costInCredits, {
      refType: 'tipster_analyze',
      refId: principal.id,
      entradaId: principal.id,
    });
  }

  /** Analyze a live match picked from the feed, using its current score/odds. */
  async analyzeLive(userId: string, externalId: string): Promise<AnalyzeResult> {
    const live = await this.sportsFeed.fetchLive();
    const event = live.find((e) => e.externalId === externalId);
    if (!event) {
      throw new NotFoundException('Live match not found');
    }

    const candidates = buildLiveCandidates(event);
    if (candidates.length === 0) {
      // Every 1X2 leg is suspended right now (common between goals) — the model
      // would have no market to recommend.
      throw new NotFoundException('Odds are suspended for this match right now');
    }

    const input: AnalysisInput = {
      homeTeam: event.homeTeam,
      awayTeam: event.awayTeam,
      competition: event.competition ?? 'Ao vivo',
      candidates,
      live: {
        minute: parseMinute(event.minute),
        homeScore: event.homeScore,
        awayScore: event.awayScore,
        status: event.statusText,
      },
    };

    return this.runAnalysis(userId, input, LIVE_ANALYSIS_COST, {
      refType: 'tipster_live',
      refId: event.externalId,
      entradaId: null,
    });
  }

  /**
   * Shared analysis pipeline: affordability pre-check → AI (outside the tx) →
   * atomic debit-or-skip (unlimited pass) + chat persistence. Money moves ONLY
   * through CreditsService.applyTransaction.
   */
  private async runAnalysis(
    userId: string,
    input: AnalysisInput,
    cost: number,
    ref: { refType: string; refId: string; entradaId: string | null },
  ): Promise<AnalyzeResult> {
    // Active "acesso ilimitado" pass → analyses are free (no credit debit).
    const owner = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { iaUnlimitedUntil: true },
    });
    const unlimited =
      !!owner?.iaUnlimitedUntil && owner.iaUnlimitedUntil > new Date();

    // Affordability pre-check: never spend a (paid) AI call on a user who can't
    // cover it. The debit inside the tx is still the source of truth for races.
    if (!unlimited) {
      const balance = await this.credits.getBalance(userId);
      if (balance < cost) {
        throw new InsufficientCreditsError(userId, balance, -cost);
      }
    }

    // The AI runs OUTSIDE the transaction — a network call must not hold the
    // per-user advisory lock / DB tx open for its full latency.
    const message = await this.ai.analyze(input);

    return this.prisma.$transaction(async (tx) => {
      let balanceAfter: number;
      if (unlimited) {
        const latest = await tx.creditTransaction.findFirst({
          where: { userId },
          orderBy: { seq: 'desc' },
          select: { balanceAfter: true },
        });
        balanceAfter = latest?.balanceAfter ?? 0;
      } else {
        const credit = await this.credits.applyTransaction(
          {
            userId,
            type: 'unlock',
            amount: -cost,
            refType: ref.refType,
            refId: ref.refId,
          },
          tx,
        );
        balanceAfter = credit.balanceAfter;
      }

      const session = await tx.chatSession.create({ data: { userId } });

      await tx.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'user',
          content: `Quero a análise de ${input.homeTeam} x ${input.awayTeam}.`,
        },
      });

      await tx.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'assistant',
          content: message,
          entradaId: ref.entradaId,
        },
      });

      return {
        sessionId: session.id,
        message,
        entradaId: ref.entradaId,
        balanceAfter,
      };
    });
  }
}

/** Elapsed minutes as an int ("25'" → 25); non-numeric labels → 0. */
function parseMinute(label: string): number {
  const n = parseInt(label, 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Build 1X2 candidates from a live event, favourite first (so it becomes the
 * model's ENTRADA PRINCIPAL). Suspended legs (null odd) are dropped.
 */
export function buildLiveCandidates(
  event: NormalizedLiveEvent,
): AnalysisCandidate[] {
  const score = `${event.homeScore}x${event.awayScore}`;
  const legs = [
    { selection: event.homeTeam, odd: event.oddHome },
    { selection: 'Empate', odd: event.oddDraw },
    { selection: event.awayTeam, odd: event.oddAway },
  ]
    .filter((l): l is { selection: string; odd: number } => l.odd != null)
    .sort((a, b) => a.odd - b.odd);

  return legs.map((l, i) => ({
    id: `${event.externalId}-${i}`,
    market: 'Resultado Final (ao vivo)',
    selection: l.selection,
    odd: l.odd,
    justification:
      i === 0
        ? `Favorito agora aos ${event.minute || event.statusText} (placar ${score}).`
        : `Alternativa no momento (placar ${score}).`,
  }));
}
