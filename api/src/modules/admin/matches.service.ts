import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMatchDto, UpdateMatchDto } from './dto/match.dto';

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateMatchDto) {
    return this.prisma.match.create({
      data: { ...dto, startsAt: new Date(dto.startsAt) },
    });
  }

  findAll() {
    return this.prisma.match.findMany({
      orderBy: { startsAt: 'desc' },
      include: { category: true },
    });
  }

  private async getOrThrow(id: string) {
    const found = await this.prisma.match.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Match not found');
    return found;
  }

  async update(id: string, dto: UpdateMatchDto) {
    await this.getOrThrow(id);
    const data: Record<string, unknown> = { ...dto };
    if (dto.startsAt) data.startsAt = new Date(dto.startsAt);
    return this.prisma.match.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.getOrThrow(id);
    await this.prisma.match.delete({ where: { id } });
  }
}
