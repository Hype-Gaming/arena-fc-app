// api/src/modules/admin/bilhetes.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { BilheteCategoria } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateBilheteDto,
  UpdateBilheteDto,
} from './dto/bilhete.dto';
import { parseBetslip } from './betslip.parse';

@Injectable()
export class AdminBilhetesService {
  constructor(private readonly prisma: PrismaService) {}

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
