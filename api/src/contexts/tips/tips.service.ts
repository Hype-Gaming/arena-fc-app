import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { FeedResponseDto } from './dto/feed-response.dto';
import { UnlockResponseDto } from './dto/unlock-response.dto';
import {
  EntradaNotFoundError,
  CategoryNotFoundError,
  MatchNotFoundError,
} from './tips.errors';

@Injectable()
export class TipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    private readonly events: EventEmitter2,
  ) {}

  async getFeed(userId: string): Promise<FeedResponseDto> {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        matches: {
          orderBy: { startsAt: 'asc' },
          include: {
            entradas: { orderBy: { publishedAt: 'desc' } },
          },
        },
      },
    });

    const unlocks = await this.prisma.entradaUnlock.findMany({
      where: { userId },
      select: { entradaId: true },
    });
    const unlockedIds = new Set(unlocks.map((u) => u.entradaId));

    return {
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        matches: c.matches.map((m) => ({
          id: m.id,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          competition: m.competition,
          startsAt: m.startsAt,
          status: m.status,
          entradas: m.entradas.map((e) => {
            const locked = !unlockedIds.has(e.id);
            return {
              id: e.id,
              market: e.market,
              selection: e.selection,
              odd: Number(e.odd),
              costInCredits: e.costInCredits,
              status: e.status,
              publishedAt: e.publishedAt,
              locked,
              justification: locked ? null : e.justification,
            };
          }),
        })),
      })),
    };
  }

  async unlockEntrada(userId: string, entradaId: string): Promise<UnlockResponseDto> {
    const entrada = await this.prisma.entrada.findUnique({ where: { id: entradaId } });
    if (!entrada) {
      throw new EntradaNotFoundError(entradaId);
    }

    const alreadyUnlocked = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.entradaUnlock.findUnique({
        where: { userId_entradaId: { userId, entradaId } },
      });
      if (existing) {
        return true;
      }
      await this.credits.applyTransaction(
        { userId, type: 'unlock', amount: -entrada.costInCredits, refType: 'entrada', refId: entradaId },
        tx,
      );
      await tx.entradaUnlock.create({ data: { userId, entradaId } });
      return false;
    });

    // Award gamification for a NEW unlock only. Decoupled (fire-and-forget) so a
    // gamification failure can never roll back or 500 the paid unlock; the
    // GamificationService @OnEvent('entrada.unlocked') listener handles it.
    if (!alreadyUnlocked) {
      this.events.emit('entrada.unlocked', {
        eventName: 'entrada.unlocked',
        userId,
        entradaId,
      });
    }

    return {
      alreadyUnlocked,
      justification: entrada.justification,
      entrada: {
        id: entrada.id,
        market: entrada.market,
        selection: entrada.selection,
        odd: Number(entrada.odd),
        costInCredits: entrada.costInCredits,
        status: entrada.status,
      },
    };
  }

  async listCategories() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async listMatchesByCategory(categoryId: string) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw new CategoryNotFoundError(categoryId);
    }
    return this.prisma.match.findMany({
      where: { categoryId },
      orderBy: { startsAt: 'asc' },
    });
  }

  async getMatch(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { entradas: { orderBy: { publishedAt: 'desc' } } },
    });
    if (!match) {
      throw new MatchNotFoundError(matchId);
    }
    return match;
  }
}
