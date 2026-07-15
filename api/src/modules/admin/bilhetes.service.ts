// api/src/modules/admin/bilhetes.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { BilheteCategoria } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateBilheteDto,
  FromEventsDto,
  UpdateBilheteDto,
} from './dto/bilhete.dto';
import { parseBetslip } from './betslip.parse';
import {
  buildTeamLogoIndex,
  matchTeamLogo,
} from '../sports-feed/team-logo.match';
import { teamLogoUrl } from '../sports-feed/team-logo-cache.service';
import { AdminTeamsService } from './teams.service';

const LOGO_FALLBACK_CAP = 40;

function defaultHomeSelection(ev: {
  homeTeam: string;
  oddHome: unknown;
  markets?: unknown;
  mercado?: string | null;
  selecao?: string | null;
  linha?: number | null;
}): { mercado: string; selecao: string; linha: number | null; odd: number } {
  const markets = Array.isArray(ev.markets) ? ev.markets : [];
  const preferredKey = ev.mercado ?? '1x2';
  const market = markets.find(
    (m) =>
      typeof m === 'object' &&
      m !== null &&
      (m as { key?: unknown }).key === preferredKey,
  ) as { key?: string; selections?: { label?: unknown; odd?: unknown; line?: unknown }[] } | undefined;
  const winner = markets.find(
    (m) =>
      typeof m === 'object' &&
      m !== null &&
      (m as { key?: unknown }).key === '1x2',
  ) as { selections?: { label?: unknown; odd?: unknown; line?: unknown }[] } | undefined;
  const homeSelection =
    ev.selecao
      ? market?.selections?.find(
          (s) =>
            s.label === ev.selecao &&
            (ev.linha == null || s.line === ev.linha),
        )
      : market?.key === '1x2'
      ? market.selections?.find((s) => s.label === ev.homeTeam)
      : market?.selections?.[0];
  const fallbackHome = winner?.selections?.find((s) => s.label === ev.homeTeam);
  const selection = homeSelection ?? fallbackHome;
  return {
    mercado: market?.key ?? '1x2',
    selecao: typeof selection?.label === 'string' ? selection.label : ev.homeTeam,
    linha: typeof selection?.line === 'number' ? selection.line : null,
    odd: Number(
      typeof selection?.odd === 'number' ? selection.odd : ev.oddHome,
    ),
  };
}

@Injectable()
export class AdminBilhetesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamsService: AdminTeamsService,
  ) {}

  /**
   * Turn the synced Esportiva fixtures into bilhetes in one go: soonest
   * upcoming games with a home odd, crests cross-matched from the team catalog,
   * skipping any fixture already published as a bilhete.
   */
  async createFromEvents(dto: FromEventsDto) {
    const categoria = dto.categoria ?? 'safes';
    const limit = Math.min(Math.max(dto.limit ?? 12, 1), 50);
    const publishedAt = dto.publish === false ? null : new Date();
    const pickByExternalId = new Map(
      (dto.eventPicks ?? []).map((p) => [p.eventExternalId, p]),
    );
    const selectedExternalIds = new Set([
      ...(dto.eventExternalIds ?? []),
      ...pickByExternalId.keys(),
    ]);

    // Wide window (soonest first) so crest-prioritisation can reach games in a
    // synced league even when the next hours are dominated by friendlies.
    const events = await this.prisma.sportEvent.findMany({
      where: {
        oddHome: { not: null },
        startsAt: { gte: new Date() },
        ...(selectedExternalIds.size > 0
          ? { externalId: { in: [...selectedExternalIds] } }
          : {}),
      },
      orderBy: { startsAt: 'asc' },
      take: 1000,
    });
    const usedRows = await this.prisma.bilhete.findMany({
      where: { eventExternalId: { not: null } },
      select: { eventExternalId: true },
    });
    const used = new Set(usedRows.map((r) => r.eventExternalId));

    const teams = await this.prisma.team.findMany({
      select: { externalId: true, name: true, logoUrl: true, country: true },
    });
    const index = buildTeamLogoIndex(teams);
    const catalogCrest = (name: string): string | null => {
      const ref = matchTeamLogo(name, index);
      return ref ? teamLogoUrl(ref.externalId) : null;
    };

    // Resolve crests up front and float games that HAVE a crest to the top, so
    // "bring games with crests" actually does when the catalog covers them
    // (kept soonest-first within each group — sort is stable).
    const scored = events
      .filter((ev) => !ev.externalId || !used.has(ev.externalId))
      .map((ev) => ({
        ev,
        homeLogo: catalogCrest(ev.homeTeam),
        awayLogo: catalogCrest(ev.awayTeam),
      }));

    let fallbackLookups = 0;
    const fallbackCrests = new Map<string, Promise<string | null>>();
    const fallback = (name: string, iso: string | null): Promise<string | null> => {
      const key = `${name}|${iso ?? ''}`;
      if (!fallbackCrests.has(key)) {
        fallbackCrests.set(key, this.teamsService.resolveTeamLogo(name, iso));
      }
      return fallbackCrests.get(key)!;
    };

    for (const s of scored) {
      if (fallbackLookups >= LOGO_FALLBACK_CAP) break;
      if (!s.homeLogo) {
        fallbackLookups += 1;
        s.homeLogo = await fallback(s.ev.homeTeam, s.ev.countryIso);
      }
      if (!s.awayLogo && fallbackLookups < LOGO_FALLBACK_CAP) {
        fallbackLookups += 1;
        s.awayLogo = await fallback(s.ev.awayTeam, s.ev.countryIso);
      }
    }
    const scoredWithCrests = scored.map((s) => ({
      ...s,
      hasCrest: !!(s.homeLogo || s.awayLogo),
    }));
    scoredWithCrests.sort((a, b) => Number(b.hasCrest) - Number(a.hasCrest));

    const created = [];
    for (const s of scoredWithCrests.slice(0, limit)) {
      const requested = s.ev.externalId
        ? pickByExternalId.get(s.ev.externalId)
        : undefined;
      const pick = defaultHomeSelection({
        ...s.ev,
        mercado: requested?.mercado ?? dto.mercado ?? null,
        selecao: requested?.selecao ?? null,
        linha: requested?.linha ?? null,
      });
      created.push(
        await this.prisma.bilhete.create({
          data: {
            categoria,
            mercado: pick.mercado,
            selecao: pick.selecao,
            linha: pick.linha,
            homeTeam: s.ev.homeTeam,
            awayTeam: s.ev.awayTeam,
            homeLogo: s.homeLogo,
            awayLogo: s.awayLogo,
            competition: s.ev.competition,
            startsAt: s.ev.startsAt,
            validUntil: s.ev.startsAt,
            odd: pick.odd!,
            eventDeepLink: s.ev.deepLink,
            eventExternalId: s.ev.externalId,
            publishedAt,
          },
        }),
      );
    }
    return {
      created: created.length,
      withCrest: created.filter((b) => b.homeLogo || b.awayLogo).length,
      availableEvents: events.length,
    };
  }

  /**
   * Create one bilhete per selection in a pasted Esportiva betslip JSON
   * (WSDK_esportiva_betSelections). Lets the admin build the ticket on the
   * sportsbook and mirror it here with the exact odds.
   */
  async importBetslip(json: string, categoria: BilheteCategoria, publish?: boolean) {
    const selections = parseBetslip(json);
    const publishedAt = publish === false ? null : new Date();
    const created = [];
    for (const s of selections) {
      created.push(
        await this.prisma.bilhete.create({
          data: {
            categoria,
            homeTeam: s.homeTeam,
            awayTeam: s.awayTeam,
            competition: null,
            startsAt: s.startsAt ?? new Date(),
            odd: s.odd,
            eventExternalId: s.externalId,
            publishedAt,
          },
        }),
      );
    }
    return { imported: created.length, bilhetes: created };
  }

  list() {
    return this.prisma.bilhete.findMany({ orderBy: { startsAt: 'asc' } });
  }

  create(dto: CreateBilheteDto) {
    const { publish, startsAt, validUntil, ...data } = dto;
    return this.prisma.bilhete.create({
      data: {
        ...data,
        startsAt: new Date(startsAt),
        validUntil: validUntil ? new Date(validUntil) : new Date(startsAt),
        // Live by default: the admin creates a ticket to sell it now.
        publishedAt: publish === false ? null : new Date(),
      },
    });
  }

  private async getOrThrow(id: string) {
    const found = await this.prisma.bilhete.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Bilhete not found');
    return found;
  }

  async update(id: string, dto: UpdateBilheteDto) {
    await this.getOrThrow(id);
    const { startsAt, validUntil, ...data } = dto;
    return this.prisma.bilhete.update({
      where: { id },
      data: {
        ...data,
        ...(startsAt ? { startsAt: new Date(startsAt) } : {}),
        ...(validUntil ? { validUntil: new Date(validUntil) } : {}),
      },
    });
  }

  async setResult(id: string, resultado: 'pending' | 'green' | 'red') {
    await this.getOrThrow(id);
    return this.prisma.bilhete.update({ where: { id }, data: { resultado } });
  }

  async setPublished(id: string, published: boolean) {
    const found = await this.getOrThrow(id);
    // Re-publishing keeps the original timestamp; publishing fresh stamps now.
    const publishedAt = published ? found.publishedAt ?? new Date() : null;
    return this.prisma.bilhete.update({ where: { id }, data: { publishedAt } });
  }

  async remove(id: string) {
    await this.getOrThrow(id);
    await this.prisma.bilhete.delete({ where: { id } });
  }
}
