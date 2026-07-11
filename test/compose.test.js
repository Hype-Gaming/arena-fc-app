// test/compose.test.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
// validate compose syntax via docker (config) — fails if file is malformed
const compose = JSON.parse(
  execSync('docker compose -f docker-compose.yml config --format json', {
    cwd: root,
    stdio: 'pipe',
  }).toString(),
);

const raw = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8');
['nginx:', 'web:', 'api:', 'postgres:'].forEach((s) =>
  assert.ok(raw.includes(s), 'compose must define service ' + s));

assert.ok(/pgdata:/.test(raw), 'must declare a named volume pgdata');
assert.ok(/\/var\/lib\/postgresql\/data/.test(raw), 'postgres data must be on the persistent volume');
assert.ok(/condition:\s*service_healthy/.test(raw), 'api must wait for healthy postgres');
assert.ok(/pg_isready/.test(raw), 'postgres needs a healthcheck');
assert.ok(/"80:80"/.test(raw) || /80:80/.test(raw), 'nginx must publish port 80');
assert.ok(compose.services.api.healthcheck, 'api needs a healthcheck');
assert.ok(
  compose.services.api.healthcheck.test.join(' ').includes('127.0.0.1:3000/health'),
  'api healthcheck must call its /health endpoint',
);
assert.ok(
  compose.services.api.healthcheck.test.join(' ').includes("body.db !== 'up'"),
  'api healthcheck must reject a degraded database',
);
assert.strictEqual(
  compose.services.nginx.depends_on.api.condition,
  'service_healthy',
  'nginx must wait for a healthy api',
);

// The api service must forward every secret the code reads, under the exact
// names the code expects (a name mismatch = crash-loop on boot).
['DATABASE_URL', 'JWT_SECRET', 'LASTLINK_WEBHOOK_SECRET', 'PAYT_WEBHOOK_TOKEN'].forEach((v) =>
  assert.ok(
    new RegExp(v + ':\\s*\\$\\{' + v + '\\}').test(raw),
    'api service must pass ' + v,
  ));

console.log('compose OK');
