import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateCategoryDto) {
    return this.prisma.category.create({ data });
  }

  findAll() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  private async getOrThrow(id: string) {
    const found = await this.prisma.category.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Category not found');
    return found;
  }

  async update(id: string, data: UpdateCategoryDto) {
    await this.getOrThrow(id);
    return this.prisma.category.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.getOrThrow(id);
    await this.prisma.category.delete({ where: { id } });
  }
}
