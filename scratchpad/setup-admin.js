// One-off: make an account admin + Diamante (active) + top up credits.
// Runs inside the api container (has @prisma/client + DATABASE_URL).
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAIL = process.env.TARGET_EMAIL || 'devhypegaming@gmail.com';
const TARGET_BALANCE = 9999; // top the ledger up to this
const ONE_YEAR = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

async function main() {
  // 1) user (create if missing) + role=admin
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    create: { email: EMAIL, role: 'admin' },
    update: { role: 'admin' },
  });
  console.log('user:', user.id, user.email, 'role=', user.role);

  // 2) Diamante plan must exist (it is seeded, but be safe)
  await prisma.plan.upsert({
    where: { key: 'diamante' },
    create: { key: 'diamante', name: 'Diamante', priceLabel: 'R$ 127 VIDA', monthlyCredits: 120, rank: 2 },
    update: {},
  });

  // 3) active Diamante subscription (unique per user)
  const sub = await prisma.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      planKey: 'diamante',
      status: 'active',
      provider: 'manual-admin-setup',
      currentPeriodEnd: ONE_YEAR,
    },
    update: {
      planKey: 'diamante',
      status: 'active',
      currentPeriodEnd: ONE_YEAR,
    },
  });
  console.log('subscription:', sub.planKey, sub.status, 'until', sub.currentPeriodEnd?.toISOString());

  // 4) top up credits via the ledger (balanceAfter = prev + amount)
  const latest = await prisma.creditTransaction.findFirst({
    where: { userId: user.id },
    orderBy: { seq: 'desc' },
    select: { balanceAfter: true },
  });
  const current = latest?.balanceAfter ?? 0;
  const delta = TARGET_BALANCE - current;
  if (delta > 0) {
    const txn = await prisma.creditTransaction.create({
      data: {
        userId: user.id,
        type: 'grant',
        amount: delta,
        balanceAfter: current + delta,
        refType: 'admin_manual_grant',
        refId: 'test-account',
      },
    });
    console.log('credits: +' + delta, '-> balance', txn.balanceAfter);
  } else {
    console.log('credits: already at', current, '(no top-up)');
  }

  console.log('\nDONE. Login with:', EMAIL);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
