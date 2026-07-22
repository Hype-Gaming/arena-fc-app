import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { InsufficientCreditsError } from '../credits/errors';
import { SportsFeedService } from '../sports-feed/sports-feed.service';
import { NormalizedLiveEvent } from '../sports-feed/sports-feed.types';
import { matchTeamLogo } from '../sports-feed/team-logo.match';
import { teamLogoUrl } from '../sports-feed/team-logo-cache.service';
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

export interface UpcomingMatch {
  externalId: string;
  homeTeam: string;
  awayTeam: string;
  competition: string | null;
  startsAt: string;
  oddHome: number | null;
  oddDraw: number | null;
  oddAway: number | null;
  deepLink: string;
  homeLogo: string | null;
  awayLogo: string | null;
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

  /**
   * Find upcoming games by team name from the REAL sportsbook feed (not the
   * admin-curated Match table, which only holds the handful of games an admin
   * built a bilhete for — hence the old "não acha o jogo"). Returns every match
   * of that team so the chat can list them for the user to pick, then analyze
   * the chosen one via analyzeUpcoming (feed-based, works for any fixture).
   */
  async searchMatches(q: string): Promise<UpcomingMatch[]> {
    const upcoming = await this.upcomingMatches(TipsterService.SCAN_LIMIT);
    // rankMatches keys on `id` + team names; wrap each feed match so we can rank
    // by the fuzzy score and then hand back the original feed object untouched.
    const ranked = rankMatches(
      q,
      upcoming.map((m) => ({
        id: m.externalId,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        competition: m.competition ?? '',
        match: m,
      })),
      TipsterService.SEARCH_LIMIT,
    );
    return ranked.map((r) => r.match);
  }

  /** How many in-play matches the "Ao Vivo" tab shows (feed can return dozens). */
  private static readonly LIVE_DISPLAY_LIMIT = 6;

  /**
   * Current in-play matches for the "Ao Vivo" tab. The feed already enriches
   * crests from the catalog; we show ONLY games where both teams matched a crest
   * (the major leagues users recognize), capped to the display limit. Obscure
   * live leagues the catalog doesn't cover are dropped rather than shown as bare
   * initials — the sportsbook feed carries no team logos of its own.
   */
  async liveMatches(
    limit = TipsterService.LIVE_DISPLAY_LIMIT,
  ): Promise<NormalizedLiveEvent[]> {
    const events = await this.sportsFeed.fetchLive();
    return events.filter((e) => e.homeLogo && e.awayLogo).slice(0, limit);
  }

  /**
   * Upcoming real fixtures from the sportsbook feed (cached), soonest first —
   * the games the IA Tipster offers to analyze before kickoff.
   */
  async upcomingMatches(limit = 20): Promise<UpcomingMatch[]> {
    const events = await this.sportsFeed.upcomingCached(limit);
    if (events.length === 0) return [];

    // Attach catalog crests (same source as the live tab) so the "Próximos
    // jogos" cards show logos instead of bare initials. Reuse the feed's cached
    // index rather than re-scanning the Team table here.
    const index = await this.sportsFeed.teamLogoIndex();
    const logo = (name: string): string | null => {
      const ref = matchTeamLogo(name, index);
      return ref ? teamLogoUrl(ref.externalId) : null;
    };

    return events.map((e) => ({
      externalId: e.externalId,
      homeTeam: e.homeTeam,
      awayTeam: e.awayTeam,
      competition: e.competition,
      startsAt: e.startsAt.toISOString(),
      oddHome: e.oddHome == null ? null : Number(e.oddHome),
      oddDraw: e.oddDraw == null ? null : Number(e.oddDraw),
      oddAway: e.oddAway == null ? null : Number(e.oddAway),
      deepLink: e.deepLink,
      homeLogo: logo(e.homeTeam),
      awayLogo: logo(e.awayTeam),
    }));
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

  /**
   * Analyze an upcoming (prematch) fixture picked from the feed. Pulls the
   * event's popular markets and lets the model recommend off the 1X2 board.
   */
  async analyzeUpcoming(
    userId: string,
    externalId: string,
  ): Promise<AnalyzeResult> {
    const preview = await this.sportsFeed.getEventPreview(externalId);
    const candidates = buildPrematchCandidates(preview);
    if (candidates.length === 0) {
      throw new NotFoundException('Sem mercado 1X2 para analisar neste jogo');
    }

    const input: AnalysisInput = {
      homeTeam: preview.homeTeam,
      awayTeam: preview.awayTeam,
      competition: preview.competition ?? 'Próximos jogos',
      candidates,
    };

    return this.runAnalysis(userId, input, LIVE_ANALYSIS_COST, {
      refType: 'tipster_upcoming',
      refId: externalId,
      entradaId: null,
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

/**
 * Build prematch candidates from an event preview's 1X2 board, favourite first
 * (lowest odd → ENTRADA PRINCIPAL). Suspended legs (odd <= 0) are dropped.
 */
export function buildPrematchCandidates(preview: {
  externalId: string;
  markets: { key: string; selections: { label: string; odd: number }[] }[];
}): AnalysisCandidate[] {
  const market = preview.markets.find((m) => m.key === '1x2');
  if (!market) return [];
  const legs = market.selections
    .filter((s) => s.odd > 0)
    .sort((a, b) => a.odd - b.odd);
  return legs.map((l, i) => ({
    id: `${preview.externalId}-${i}`,
    market: 'Resultado Final',
    selection: l.label,
    odd: l.odd,
    justification:
      i === 0 ? 'Favorito no mercado 1X2.' : 'Alternativa no mercado 1X2.',
  }));
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
