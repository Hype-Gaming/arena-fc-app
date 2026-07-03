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

@Injectable()
export class AdminBilhetesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Turn the synced Esportiva fixtures into bilhetes in one go: soonest
   * upcoming games with a home odd, crests cross-matched from the team catalog,
   * skipping any fixture already published as a bilhete.
   */
  async createFromEvents(dto: FromEventsDto) {
    const categoria = dto.categoria ?? 'safes';
    const limit = Math.min(Math.max(dto.limit ?? 12, 1), 50);
    const publishedAt = dto.publish === false ? null : new Date();

    // Wide window (soonest first) so crest-prioritisation can reach games in a
    // synced league even when the next hours are dominated by friendlies.
    const events = await this.prisma.sportEvent.findMany({
      where: { oddHome: { not: null }, startsAt: { gte: new Date() } },
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
    const crest = (name: string): string | null => {
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
        homeLogo: crest(ev.homeTeam),
        awayLogo: crest(ev.awayTeam),
      }))
      .map((s) => ({ ...s, hasCrest: !!(s.homeLogo || s.awayLogo) }));
    scored.sort((a, b) => Number(b.hasCrest) - Number(a.hasCrest));

    const created = [];
    for (const s of scored.slice(0, limit)) {
      created.push(
        await this.prisma.bilhete.create({
          data: {
            categoria,
            homeTeam: s.ev.homeTeam,
            awayTeam: s.ev.awayTeam,
            homeLogo: s.homeLogo,
            awayLogo: s.awayLogo,
            competition: s.ev.competition,
            startsAt: s.ev.startsAt,
            odd: s.ev.oddHome!,
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
    const { publish, startsAt, ...data } = dto;
    return this.prisma.bilhete.create({
      data: {
        ...data,
        startsAt: new Date(startsAt),
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
    const { startsAt, ...data } = dto;
    return this.prisma.bilhete.update({
      where: { id },
      data: { ...data, ...(startsAt ? { startsAt: new Date(startsAt) } : {}) },
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
