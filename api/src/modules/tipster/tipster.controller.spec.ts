import { Test } from '@nestjs/testing';
import { TipsterController } from './tipster.controller';
import { TipsterService } from './tipster.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const serviceMock = {
  searchMatches: jest.fn(),
  analyze: jest.fn(),
};

describe('TipsterController', () => {
  let controller: TipsterController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [TipsterController],
      providers: [{ provide: TipsterService, useValue: serviceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = moduleRef.get(TipsterController);
  });

  it('GET match-search delegates the query string to the service', async () => {
    serviceMock.searchMatches.mockResolvedValue([{ id: 'm1' }]);
    const res = await controller.search({ q: 'sao paulo' });
    expect(serviceMock.searchMatches).toHaveBeenCalledWith('sao paulo');
    expect(res).toEqual({ matches: [{ id: 'm1' }] });
  });

  it('POST analyze passes the authenticated userId and matchId to the service', async () => {
    serviceMock.analyze.mockResolvedValue({ sessionId: 's1', message: 'hi', entradaId: 'e1', balanceAfter: 5 });
    const res = await controller.analyze({ userId: 'u1', email: 'u1@test.dev' } as any, { matchId: 'm1' });
    expect(serviceMock.analyze).toHaveBeenCalledWith('u1', 'm1');
    expect(res).toEqual({ sessionId: 's1', message: 'hi', entradaId: 'e1', balanceAfter: 5 });
  });
});
