import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let prisma: any;
  let service: ProductsService;

  beforeEach(() => {
    prisma = {
      product: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new ProductsService(prisma);
  });

  it('creates a credits product', async () => {
    const input = {
      provider: 'lastlink',
      externalProductId: 'PKG_100',
      grantType: 'credits' as const,
      grantCredits: 100,
      grantPlanKey: null,
      active: true,
    };
    prisma.product.create.mockResolvedValue({ id: 'p1', ...input });
    await service.create(input);
    expect(prisma.product.create).toHaveBeenCalledWith({ data: input });
  });

  it('rejects a credits product without grantCredits', async () => {
    await expect(
      service.create({
        provider: 'lastlink',
        externalProductId: 'X',
        grantType: 'credits',
        grantCredits: null,
        grantPlanKey: null,
        active: true,
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a plan product without grantPlanKey', async () => {
    await expect(
      service.create({
        provider: 'lastlink',
        externalProductId: 'X',
        grantType: 'plan',
        grantCredits: null,
        grantPlanKey: null,
        active: true,
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates a category access product', async () => {
    const input = {
      provider: 'lastlink',
      externalProductId: 'ALAV_VIDA',
      grantType: 'category_access' as const,
      grantCredits: null,
      grantPlanKey: null,
      grantCategory: 'alavancagem',
      grantPeriodDays: null,
      active: true,
    };
    prisma.product.create.mockResolvedValue({ id: 'p2', ...input });
    await service.create(input);
    expect(prisma.product.create).toHaveBeenCalledWith({ data: input });
  });

  it('rejects a category access product without grantCategory', async () => {
    await expect(
      service.create({
        provider: 'lastlink',
        externalProductId: 'X',
        grantType: 'category_access',
        grantCredits: null,
        grantPlanKey: null,
        grantCategory: null,
        grantPeriodDays: null,
        active: true,
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws NotFound when updating a missing product', async () => {
    prisma.product.findUnique.mockResolvedValue(null);
    await expect(service.update('nope', { active: false })).rejects.toThrow(NotFoundException);
  });
});
