import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    if (dto.grantType === 'credits' && !dto.grantCredits) {
      throw new BadRequestException('grantCredits required for credits product');
    }
    if (dto.grantType === 'plan' && !dto.grantPlanKey) {
      throw new BadRequestException('grantPlanKey required for plan product');
    }
    // Lifetime must be an explicit choice, never an accident: omitting the
    // field would otherwise silently grant a never-expiring subscription.
    if (dto.grantType === 'plan' && dto.grantPeriodDays === undefined) {
      throw new BadRequestException(
        'grantPeriodDays required for plan products: days as a number, or null for lifetime (VIDA)',
      );
    }
    return this.prisma.product.create({ data: dto as any });
  }

  findAll() {
    return this.prisma.product.findMany({ orderBy: { provider: 'asc' } });
  }

  private async getOrThrow(id: string) {
    const found = await this.prisma.product.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Product not found');
    return found;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.getOrThrow(id);
    return this.prisma.product.update({ where: { id }, data: dto as any });
  }

  async remove(id: string) {
    await this.getOrThrow(id);
    await this.prisma.product.delete({ where: { id } });
  }
}
