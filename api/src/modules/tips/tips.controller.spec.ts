import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TipsController } from './tips.controller';
import { TipsService } from './tips.service';
import { EntradaNotFoundError, CategoryNotFoundError, MatchNotFoundError } from './tips.errors';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('TipsController', () => {
  let controller: TipsController;
  let service: jest.Mocked<Partial<TipsService>>;

  beforeEach(async () => {
    service = {
      getFeed: jest.fn(),
      unlockEntrada: jest.fn(),
      listCategories: jest.fn(),
      listMatchesByCategory: jest.fn(),
      getMatch: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [TipsController],
      providers: [{ provide: TipsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = moduleRef.get(TipsController);
  });

  const user = { id: 'u1', role: 'user' };

  it('GET feed delegates to service with current user id', async () => {
    (service.getFeed as jest.Mock).mockResolvedValue({ categories: [] });
    const res = await controller.getFeed(user as any);
    expect(service.getFeed).toHaveBeenCalledWith('u1');
    expect(res).toEqual({ categories: [] });
  });

  it('POST unlock delegates to service with user id and entrada id', async () => {
    (service.unlockEntrada as jest.Mock).mockResolvedValue({ alreadyUnlocked: false });
    const res = await controller.unlock(user as any, 'e1');
    expect(service.unlockEntrada).toHaveBeenCalledWith('u1', 'e1');
    expect(res).toEqual({ alreadyUnlocked: false });
  });

  it('maps EntradaNotFoundError to 404', async () => {
    (service.unlockEntrada as jest.Mock).mockRejectedValue(new EntradaNotFoundError('e1'));
    await expect(controller.unlock(user as any, 'e1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps CategoryNotFoundError to 404', async () => {
    (service.listMatchesByCategory as jest.Mock).mockRejectedValue(new CategoryNotFoundError('c1'));
    await expect(controller.matchesByCategory('c1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps MatchNotFoundError to 404', async () => {
    (service.getMatch as jest.Mock).mockRejectedValue(new MatchNotFoundError('m1'));
    await expect(controller.getMatch('m1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
