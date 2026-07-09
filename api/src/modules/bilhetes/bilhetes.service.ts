// api/src/modules/bilhetes/bilhetes.service.ts
import { Injectable } from '@nestjs/common';
import { Bilhete } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CATEGORIAS, categoriaDef } from './bilhetes.constants';

export interface BilheteCardDto {
  id: string;
  categoria: string;
  tierLabel: string;
  titulo: string;
  mercado: string | null;
  selecao: string | null;
  linha: number | null;
  homeTeam: string;
  awayTeam: string;
  homeColor: string | null;
  awayColor: string | null;
  homeLogo: string | null;
  awayLogo: string | null;
  competition: string | null;
  startsAt: Date;
  validUntil: Date | null;
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
      where: {
        publishedAt: { not: null },
        resultado: 'pending',
        OR: [
          { validUntil: { gt: now } },
          { validUntil: null, startsAt: { gte: now } },
        ],
      },
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
      .map((b) => this.toCard(b));

    return { plan, categorias, bilhetes };
  }

  /**
   * "Últimos greens": every published ticket that already hit (resultado green),
   * most recent first. It's a public track record (no plan lock) so free users
   * see the wins too — the UI groups them by date.
   */
  async getHistorico(): Promise<BilheteCardDto[]> {
    const greens = await this.prisma.bilhete.findMany({
      where: { publishedAt: { not: null }, resultado: 'green' },
      orderBy: { startsAt: 'desc' },
    });
    return greens.map((b) => this.toCard(b));
  }

  private toCard(b: Bilhete): BilheteCardDto {
    return {
      id: b.id,
      categoria: b.categoria,
      tierLabel: categoriaDef(b.categoria).tierLabel,
      titulo: b.titulo,
      mercado: b.mercado,
      selecao: b.selecao,
      linha: b.linha == null ? null : Number(b.linha),
      homeTeam: b.homeTeam,
      awayTeam: b.awayTeam,
      homeColor: b.homeColor,
      awayColor: b.awayColor,
      homeLogo: b.homeLogo,
      awayLogo: b.awayLogo,
        competition: b.competition,
        startsAt: b.startsAt,
        validUntil: b.validUntil,
        odd: Number(b.odd),
      resultado: b.resultado,
      deepLink: b.eventDeepLink,
    };
  }
}
