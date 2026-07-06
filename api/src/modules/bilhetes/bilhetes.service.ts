// api/src/modules/bilhetes/bilhetes.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CATEGORIAS, categoriaDef } from './bilhetes.constants';

export interface BilheteCardDto {
  id: string;
  categoria: string;
  tierLabel: string;
  titulo: string;
  homeTeam: string;
  awayTeam: string;
  homeColor: string | null;
  awayColor: string | null;
  homeLogo: string | null;
  awayLogo: string | null;
  competition: string | null;
  startsAt: Date;
  odd: number;
  resultado: string;
  deepLink: string | null;
}

export interface BilhetesFeedDto {
  plan: { key: string; rank: number };
  categorias: {
    key: string;
    label: string;
    count: number;
    locked: boolean;
  }[];
  bilhetes: BilheteCardDto[];
}

@Injectable()
export class BilhetesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve the viewer's effective plan rank. Mirrors MeService's rule: the
   * subscription counts only while active AND within its paid period; anything
   * else falls back to free (rank 0).
   */
  private async planRank(userId: string): Promise<{ key: string; rank: number }> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      select: {
        status: true,
        currentPeriodEnd: true,
        plan: { select: { key: true, rank: true } },
      },
    });
    const active =
      !!sub &&
      sub.status === 'active' &&
      (sub.currentPeriodEnd === null || sub.currentPeriodEnd > new Date());
    if (!active) return { key: 'free', rank: 0 };
    return { key: sub.plan.key, rank: sub.plan.rank };
  }

  /**
   * The sport-page feed: every category with its ticket count and lock state
   * (so the UI can tease locked markets), but ticket DETAILS only for
   * categories the viewer's plan unlocks.
   */
  async getFeed(userId: string): Promise<BilhetesFeedDto> {
    const plan = await this.planRank(userId);
    const now = new Date();
    const accesses = await this.prisma.userCategoryAccess.findMany({
      where: {
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { categoria: true },
    });
    const unlockedByProduct = new Set(accesses.map((a) => a.categoria));

    const published = await this.prisma.bilhete.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { startsAt: 'asc' },
    });

    const countBy = new Map<string, number>();
    for (const b of published) {
      countBy.set(b.categoria, (countBy.get(b.categoria) ?? 0) + 1);
    }

    const categorias = CATEGORIAS.map((c) => ({
      key: c.key,
      label: c.label,
      count: countBy.get(c.key) ?? 0,
      locked: plan.rank < c.minRank && !unlockedByProduct.has(c.key),
    }));

    const bilhetes = published
      .filter(
        (b) =>
          plan.rank >= categoriaDef(b.categoria).minRank ||
          unlockedByProduct.has(b.categoria),
      )
      .map((b) => ({
        id: b.id,
        categoria: b.categoria,
        tierLabel: categoriaDef(b.categoria).tierLabel,
        titulo: b.titulo,
        homeTeam: b.homeTeam,
        awayTeam: b.awayTeam,
        homeColor: b.homeColor,
        awayColor: b.awayColor,
        homeLogo: b.homeLogo,
        awayLogo: b.awayLogo,
        competition: b.competition,
        startsAt: b.startsAt,
        odd: Number(b.odd),
        resultado: b.resultado,
        deepLink: b.eventDeepLink,
      }));

    return { plan, categorias, bilhetes };
  }
}
