import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { SportsFeedService } from '../sports-feed/sports-feed.service';
import { settleBilhete } from './settle';

// A soccer match is treated as over this long after kickoff (90' + halftime +
// stoppage + a safety margin). After this window a captured score is final.
const MATCH_WINDOW_MS = 135 * 60 * 1000;

@Injectable()
export class SettleService {
  private readonly logger = new Logger(SettleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly feed: SportsFeedService,
  ) {}

  // Poll live scores often (a match's final score is the last one we see before
  // the feed drops it), and grade finished matches on a slower cadence. Both
  // swallow errors so a transient feed hiccup never crashes the scheduler.
  @Cron('0 */3 * * * *')
  async pollLiveScoresJob(): Promise<void> {
    try {
      await this.captureLiveScores();
    } catch (err) {
      this.logger.warn(`live score poll failed: ${(err as Error).message}`);
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async settleJob(): Promise<void> {
    try {
      await this.settlePending();
    } catch (err) {
      this.logger.warn(`settle job failed: ${(err as Error).message}`);
    }
  }

  /**
   * Poll live fixtures and freeze their current score onto the cached
   * SportEvent. The feed drops a match once it ends, so the last score we
   * capture here is what settlePending grades against.
   */
  async captureLiveScores(): Promise<number> {
    const live = await this.feed.fetchLive();
    let updated = 0;
    for (const ev of live) {
      const res = await this.prisma.sportEvent.updateMany({
        where: { externalId: ev.externalId },
        data: {
          homeScore: ev.homeScore,
          awayScore: ev.awayScore,
          scoreSeenAt: new Date(),
        },
      });
      updated += res.count;
    }
    return updated;
  }

  /**
   * Grade every pending ticket whose match window has elapsed and whose event
   * has a captured score. Ungradeable markets and pushes stay pending for the
   * admin to resolve by hand.
   */
  async settlePending(): Promise<{ settled: number; skipped: number }> {
    const cutoff = new Date(Date.now() - MATCH_WINDOW_MS);
    const pending = await this.prisma.bilhete.findMany({
      where: {
        publishedAt: { not: null },
        resultado: 'pending',
        startsAt: { lt: cutoff },
        eventExternalId: { not: null },
      },
    });
    if (pending.length === 0) return { settled: 0, skipped: 0 };

    const externalIds = [
      ...new Set(pending.map((b) => b.eventExternalId as string)),
    ];
    const events = await this.prisma.sportEvent.findMany({
      where: {
        externalId: { in: externalIds },
        homeScore: { not: null },
        awayScore: { not: null },
      },
    });
    const byExt = new Map(events.map((e) => [e.externalId, e]));

    let settled = 0;
    let skipped = 0;
    for (const b of pending) {
      const ev = byExt.get(b.eventExternalId as string);
      if (!ev || ev.homeScore == null || ev.awayScore == null) {
        skipped++;
        continue;
      }
      const outcome = settleBilhete(
        { home: ev.homeScore, away: ev.awayScore },
        {
          mercado: b.mercado,
          selecao: b.selecao,
          linha: b.linha == null ? null : Number(b.linha),
          homeTeam: b.homeTeam,
          awayTeam: b.awayTeam,
        },
      );
      if (!outcome) {
        skipped++;
        continue;
      }
      await this.prisma.bilhete.update({
        where: { id: b.id },
        data: { resultado: outcome },
      });
      settled++;
    }

    if (settled > 0) {
      await this.prisma.sportEvent.updateMany({
        where: { externalId: { in: externalIds }, finishedAt: null },
        data: { finishedAt: new Date() },
      });
      this.logger.log(`Settled ${settled} bilhete(s), ${skipped} skipped`);
    }
    return { settled, skipped };
  }
}
