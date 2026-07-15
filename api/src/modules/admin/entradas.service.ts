import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { CreateEntradaDto, UpdateEntradaDto } from './dto/entrada.dto';

@Injectable()
export class EntradasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService,
  ) {}

  create(dto: CreateEntradaDto) {
    return this.prisma.entrada.create({ data: { ...dto, status: 'pending' } });
  }

  findByMatch(matchId: string) {
    return this.prisma.entrada.findMany({ where: { matchId } });
  }

  private async getOrThrow(id: string) {
    const found = await this.prisma.entrada.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Entrada not found');
    return found;
  }

  async update(id: string, dto: UpdateEntradaDto) {
    await this.getOrThrow(id);
    return this.prisma.entrada.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.getOrThrow(id);
    await this.prisma.entrada.delete({ where: { id } });
  }

  async setResult(id: string, result: 'green' | 'red') {
    if (result !== 'green' && result !== 'red') {
      throw new BadRequestException('result must be green or red');
    }
    await this.getOrThrow(id);
    const updated = await this.prisma.entrada.update({
      where: { id },
      data: { status: result },
    });
    if (result === 'green') {
      const unlocks = await this.prisma.entradaUnlock.findMany({
        where: { entradaId: id },
        select: { userId: true },
      });
      for (const u of unlocks) {
        await this.gamification.handleEvent({
          eventName: 'entrada.green',
          userId: u.userId,
          entradaId: id,
        });
      }
    }
    return updated;
  }
}
