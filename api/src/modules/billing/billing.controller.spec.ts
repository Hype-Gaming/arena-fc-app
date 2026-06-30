// api/src/modules/billing/billing.controller.spec.ts
import { Test } from '@nestjs/testing';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

describe('BillingController', () => {
  const billing = { processWebhook: jest.fn() };
  let controller: BillingController;

  beforeEach(async () => {
    billing.processWebhook.mockReset();
    const mod = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [{ provide: BillingService, useValue: billing }],
    }).compile();
    controller = mod.get(BillingController);
  });

  it('forwards provider, raw body and headers to the service', async () => {
    billing.processWebhook.mockResolvedValue({ outcome: 'processed', eventId: 'wh_1' });
    const raw = Buffer.from('{"Id":"x"}');
    const req: any = { rawBody: raw, headers: { 'x-lastlink-signature': 'sig' } };

    const res = await controller.handle('lastlink', req);

    expect(billing.processWebhook).toHaveBeenCalledWith('lastlink', raw, {
      'x-lastlink-signature': 'sig',
    });
    expect(res).toEqual({ outcome: 'processed', eventId: 'wh_1' });
  });

  it('falls back to an empty buffer when rawBody is absent', async () => {
    billing.processWebhook.mockResolvedValue({ outcome: 'ignored' });
    const req: any = { headers: {} };
    await controller.handle('payt', req);
    expect(billing.processWebhook).toHaveBeenCalledWith(
      'payt',
      Buffer.alloc(0),
      {},
    );
  });
});
