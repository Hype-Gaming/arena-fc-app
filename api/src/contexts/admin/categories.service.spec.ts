import { NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let prisma: any;
  let service: CategoriesService;

  beforeEach(() => {
    prisma = {
      category: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new CategoriesService(prisma);
  });

  it('creates a category', async () => {
    const input = { name: 'Futebol', slug: 'futebol', icon: 'ball' };
    prisma.category.create.mockResolvedValue({ id: 'c1', ...input });
    const result = await service.create(input);
    expect(prisma.category.create).toHaveBeenCalledWith({ data: input });
    expect(result).toEqual({ id: 'c1', ...input });
  });

  it('lists categories ordered by name', async () => {
    prisma.category.findMany.mockResolvedValue([{ id: 'c1' }]);
    const result = await service.findAll();
    expect(prisma.category.findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
    expect(result).toEqual([{ id: 'c1' }]);
  });

  it('updates an existing category', async () => {
    prisma.category.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.category.update.mockResolvedValue({ id: 'c1', name: 'Tenis' });
    const result = await service.update('c1', { name: 'Tenis' });
    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { name: 'Tenis' },
    });
    expect(result.name).toBe('Tenis');
  });

  it('throws NotFound when updating a missing category', async () => {
    prisma.category.findUnique.mockResolvedValue(null);
    await expect(service.update('nope', { name: 'x' })).rejects.toThrow(NotFoundException);
  });

  it('deletes a category', async () => {
    prisma.category.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.category.delete.mockResolvedValue({ id: 'c1' });
    await service.remove('c1');
    expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });
});
