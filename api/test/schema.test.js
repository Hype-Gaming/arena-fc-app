// api/test/schema.test.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

const apiDir = path.resolve(__dirname, '..');
const schemaPath = path.join(apiDir, 'prisma', 'schema.prisma');
const src = fs.readFileSync(schemaPath, 'utf8');

const models = ['User', 'AuthCode', 'RefreshToken', 'Plan', 'Subscription', 'CreditTransaction',
  'Category', 'Match', 'Entrada', 'EntradaUnlock', 'Product', 'WebhookEvent', 'Achievement',
  'UserAchievement', 'ChatSession', 'ChatMessage'];
models.forEach((m) => assert.ok(new RegExp('model\\s+' + m + '\\s*\\{').test(src), 'missing model ' + m));

const enums = ['Role', 'PlanKey', 'SubscriptionStatus', 'CreditTransactionType', 'MatchStatus',
  'EntradaStatus', 'GrantType', 'ChatRole'];
enums.forEach((e) => assert.ok(new RegExp('enum\\s+' + e + '\\s*\\{').test(src), 'missing enum ' + e));

// Ledger field that the whole credits system depends on
assert.ok(/balanceAfter\s+Int/.test(src), 'CreditTransaction must have balanceAfter Int');
// uniqueness constraints from spec
assert.ok(/email\s+String\s+@unique/.test(src), 'User.email must be @unique');
assert.ok(/@@unique\(\[userId,\s*entradaId\]\)/.test(src), 'EntradaUnlock must be unique per (userId, entradaId)');
assert.ok(/externalId\s+String\s+@unique/.test(src), 'WebhookEvent.externalId must be @unique');

// schema must be valid Prisma
execSync('npx prisma validate', { cwd: apiDir, stdio: 'pipe' });
console.log('prisma schema OK');
