// api/test/webhooks.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHmac } from 'crypto';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const SECRET = 'lastlink_e2e_secret';
const EMAIL = 'webhook-buyer@example.com';

function sign(body: Buffer): string {
  return createHmac('sha256', SECRET).update(body).digest('hex');
}

async function latestBalance(prisma: PrismaService, userId: string): Promise<number> {
  const last = await prisma.creditTransaction.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return last?.balanceAfter ?? 0;
}

describe('POST /webhooks/:provider (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.LASTLINK_WEBHOOK_SECRET = SECRET;
    process.env.PAYT_WEBHOOK_TOKEN = 'payt_e2e_token';

    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication({ rawBody: true });
    prisma = app.get(PrismaService);
    await app.init();

    // Clean slate + seed product
    await prisma.creditTransaction.deleteMany({ where: { user: { email: EMAIL } } });
    await prisma.webhookEvent.deleteMany({ where: { externalId: 'e2e_evt_1' } });
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    await prisma.product.deleteMany({ where: { externalProductId: 'e2e_credits_50' } });
    await prisma.product.create({
      data: {
        provider: 'lastlink',
        externalProductId: 'e2e_credits_50',
        grantType: 'credits',
        grantCredits: 50,
        active: true,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  // Send the body as a verbatim JSON string. supertest re-serializes a Buffer
  // passed to .send() into {"type":"Buffer",...}, which would change the exact
  // bytes the HMAC is computed over; a string is sent unchanged, so the signed
  // bytes equal req.rawBody on the server.
  const payloadStr = JSON.stringify({
    Id: 'e2e_evt_1',
    Event: 'Purchase_Order_Confirmed',
    Data: { Buyer: { Email: EMAIL }, Products: [{ Id: 'e2e_credits_50' }] },
  });
  const payload = Buffer.from(payloadStr);

  it('rejects an invalid signature with 401', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/lastlink')
      .set('content-type', 'application/json')
      .set('x-lastlink-signature', 'deadbeef')
      .send(payloadStr)
      .expect(401);
  });

  it('processes a valid webhook: creates user, records event, grants 50 credits', async () => {
    const res = await request(app.getHttpServer())
      .post('/webhooks/lastlink')
      .set('content-type', 'application/json')
      .set('x-lastlink-signature', sign(payload))
      .send(payloadStr)
      .expect(201);

    expect(res.body.outcome).toBe('processed');

    const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
    expect(await latestBalance(prisma, user.id)).toBe(50);

    const event = await prisma.webhookEvent.findUnique({ where: { externalId: 'e2e_evt_1' } });
    expect(event).not.toBeNull();
  });

  it('is idempotent: replaying the same event does not double-grant', async () => {
    const res = await request(app.getHttpServer())
      .post('/webhooks/lastlink')
      .set('content-type', 'application/json')
      .set('x-lastlink-signature', sign(payload))
      .send(payloadStr)
      .expect(201);

    expect(res.body.outcome).toBe('duplicate');

    const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
    expect(await latestBalance(prisma, user.id)).toBe(50); // unchanged
  });
});
