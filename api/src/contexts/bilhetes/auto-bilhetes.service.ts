import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BilheteCategoria, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SportsFeedService } from '../sports-feed/sports-feed.service';
import {
  NormalizedEventPreview,
  NormalizedMarket,
  NormalizedSelection,
} from '../sports-feed/sports-feed.types';
import { buildEsportivaSelectionsUrl } from '../sports-feed/esportiva-link';

type DetailedEvent = NormalizedEventPreview & {
  homeLogo: string | null;
  awayLogo: string | null;
};

export interface AutoPick {
  categoria: BilheteCategoria;
  event: DetailedEvent;
  market: NormalizedMarket;
  selection: NormalizedSelection;
}

export interface AutoGenerationSummary {
  synced: number;
  detailed: number;
  createdOrUpdated: number;
  skippedDetails: number;
}

const PRIMARY_KEYS = new Set(['1x2', 'double_chance', 'dnb']);
const NOISY_KEYS = new Set(['correct_score', 'first_goal']);

const RULES: {
  categoria: BilheteCategoria;
  min: number;
  max: number;
  limit: number;
  secondary?: boolean;
  preferred: string[];
}[] = [
  { categoria: 'safes', min: 1.25, max: 1.65, limit: 5, preferred: ['double_chance', 'dnb', 'over_under', 'btts', '1x2'] },
  { categoria: 'pro', min: 1.66, max: 2.10, limit: 4, preferred: ['1x2', 'over_under', 'btts', 'handicap', 'team_total'] },
  { categoria: 'ultra', min: 2.11, max: 3.50, limit: 3, preferred: ['1x2', 'handicap', 'over_under', 'btts', 'half_full'] },
  { categoria: 'alavancagem', min: 1.35, max: 1.80, limit: 3, preferred: ['double_chance', 'dnb', 'over_under', '1x2'] },
  { categoria: 'secundario', min: 1.40, max: 2.80, limit: 4, secondary: true, preferred: ['corners', 'cards', 'team_total', 'handicap', 'half_time', 'over_under', 'btts'] },
];

function envInt(name: string, fallback: number, min: number, max: number): number {
  const parsed = Number(process.env[name]);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function autoEnabled(): boolean {
  return !['0', 'false', 'off'].includes((process.env.AUTO_BILHETES_ENABLED ?? 'true').toLowerCase());
}

function marketRank(market: NormalizedMarket, preferred: string[]): number {
  const rank = preferred.indexOf(market.key);
  return rank < 0 ? preferred.length : rank;
}

/** Deterministic football picks from real, open Altenar outcomes. */
export function selectAutomaticPicks(events: DetailedEvent[]): AutoPick[] {
  const picks: AutoPick[] = [];
  for (const rule of RULES) {
    const candidates = events.flatMap((event) =>
      event.markets.flatMap((market) => {
        if (rule.secondary && PRIMARY_KEYS.has(market.key)) return [];
        if (!rule.secondary && NOISY_KEYS.has(market.key)) return [];
        return market.selections
          .filter((selection) =>
            Number.isFinite(selection.odd) &&
            selection.odd >= rule.min &&
            selection.odd <= rule.max &&
            selection.oddId > 0,
          )
          .map((selection) => ({ categoria: rule.categoria, event, market, selection }));
      }),
    );
    const target = (rule.min + rule.max) / 2;
    candidates.sort((a, b) =>
      marketRank(a.market, rule.preferred) - marketRank(b.market, rule.preferred) ||
      Math.abs(a.selection.odd - target) - Math.abs(b.selection.odd - target) ||
      a.event.startsAt.getTime() - b.event.startsAt.getTime(),
    );
    const usedEvents = new Set<string>();
    for (const candidate of candidates) {
      if (usedEvents.has(candidate.event.externalId)) continue;
      picks.push(candidate);
      usedEvents.add(candidate.event.externalId);
      if (usedEvents.size >= rule.limit) break;
    }
  }
  return picks;
}

@Injectable()
export class AutoBilhetesService {
  private readonly logger = new Logger(AutoBilhetesService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly feed: SportsFeedService,
  ) {}

  @Cron(process.env.AUTO_BILHETES_CRON || '0 10 5 * * *', {
    timeZone: process.env.AUTO_BILHETES_TIMEZONE || 'America/Sao_Paulo',
  })
  async generateDailyJob(): Promise<void> {
    if (!autoEnabled() || this.running) return;
    this.running = true;
    try {
      const summary = await this.generateDaily();
      this.logger.log(`Automatic football bilhetes: ${JSON.stringify(summary)}`);
    } catch (err) {
      this.logger.warn(`automatic bilhete generation failed: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  async generateDaily(): Promise<AutoGenerationSummary> {
    const sync = await this.feed.sync();
    const now = new Date();
    const horizonHours = envInt('AUTO_BILHETES_HORIZON_HOURS', 36, 6, 96);
    const maxEvents = envInt('AUTO_BILHETES_MAX_EVENTS', 32, 4, 100);
    const events = await this.prisma.sportEvent.findMany({
      where: {
        startsAt: {
          gte: new Date(now.getTime() + 30 * 60_000),
          lte: new Date(now.getTime() + horizonHours * 60 * 60_000),
        },
      },
      orderBy: { startsAt: 'asc' },
      take: maxEvents,
    });

    const detailed: DetailedEvent[] = [];
    let skippedDetails = 0;
    const concurrency = envInt('AUTO_BILHETES_DETAIL_CONCURRENCY', 4, 1, 10);
    for (let i = 0; i < events.length; i += concurrency) {
      const batch = events.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        batch.map((event) => this.feed.getEventPreview(event.externalId)),
      );
      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result.status === 'rejected') {
          skippedDetails++;
          continue;
        }
        detailed.push(result.value);
        await this.prisma.sportEvent.update({
          where: { id: batch[j].id },
          data: {
            markets: result.value.markets as unknown as Prisma.InputJsonValue,
            syncedAt: new Date(),
          },
        });
      }
    }

    const picks = selectAutomaticPicks(detailed);
    let createdOrUpdated = 0;
    for (const pick of picks) {
      await this.upsertSingle(pick);
      createdOrUpdated++;
    }
    if (await this.upsertMultiple(detailed)) createdOrUpdated++;

    return {
      synced: sync.upserted,
      detailed: detailed.length,
      createdOrUpdated,
      skippedDetails,
    };
  }

  private upsertSingle(pick: AutoPick) {
    const { event, market, selection, categoria } = pick;
    const id = `auto-${categoria}-${event.externalId}`;
    const data = {
      titulo: market.name,
      categoria,
      mercado: market.key,
      selecao: selection.label,
      linha: selection.line,
      homeTeam: event.homeTeam,
      awayTeam: event.awayTeam,
      homeLogo: event.homeLogo,
      awayLogo: event.awayLogo,
      competition: event.competition,
      startsAt: event.startsAt,
      validUntil: event.startsAt,
      odd: selection.odd,
      oddId: String(selection.oddId),
      eventDeepLink: event.deepLink,
      eventExternalId: event.externalId,
      esportivaShareUrl: buildEsportivaSelectionsUrl([
        { eventId: event.externalId, oddId: selection.oddId },
      ]),
      publishedAt: new Date(),
    };
    return this.prisma.bilhete.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
  }

  private async upsertMultiple(events: DetailedEvent[]): Promise<boolean> {
    const safe = selectAutomaticPicks(events)
      .filter((pick) => pick.categoria === 'safes')
      .slice(0, 3);
    if (safe.length < 3) return false;
    const date = new Intl.DateTimeFormat('en-CA', {
      timeZone: process.env.AUTO_BILHETES_TIMEZONE || 'America/Sao_Paulo',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date()).replace(/\D/g, '');
    const id = `auto-multiplas-${date}`;
    const odd = Number(safe.reduce((total, pick) => total * pick.selection.odd, 1).toFixed(2));
    const startsAt = new Date(Math.min(...safe.map((pick) => pick.event.startsAt.getTime())));
    const shareUrl = buildEsportivaSelectionsUrl(safe.map((pick) => ({
      eventId: pick.event.externalId,
      oddId: pick.selection.oddId,
    })));
    const face = safe[0].event;
    const legs = safe.map((pick, position) => ({
      position,
      homeTeam: pick.event.homeTeam,
      awayTeam: pick.event.awayTeam,
      mercado: pick.market.key,
      selecao: pick.selection.label,
      linha: pick.selection.line,
      odd: pick.selection.odd,
      eventExternalId: pick.event.externalId,
      oddId: String(pick.selection.oddId),
    }));
    const data = {
      titulo: 'Múltipla automática do dia',
      categoria: 'multiplas' as BilheteCategoria,
      homeTeam: face.homeTeam,
      awayTeam: face.awayTeam,
      homeLogo: face.homeLogo,
      awayLogo: face.awayLogo,
      competition: 'Múltipla do dia',
      startsAt,
      validUntil: startsAt,
      odd,
      eventDeepLink: face.deepLink,
      eventExternalId: face.externalId,
      esportivaShareUrl: shareUrl,
      publishedAt: new Date(),
    };
    await this.prisma.bilhete.upsert({
      where: { id },
      create: { id, ...data, legs: { create: legs } },
      update: { ...data, legs: { deleteMany: {}, create: legs } },
    });
    return true;
  }
}
