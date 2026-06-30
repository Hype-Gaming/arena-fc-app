// test/infra.test.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const nginx = read('infra/nginx/nginx.conf');
assert.ok(/proxy_pass\s+http:\/\/api:3000/.test(nginx), 'nginx must proxy to api:3000');
assert.ok(/location\s+\/api\//.test(nginx), 'nginx must expose /api/');
assert.ok(/location\s+\/webhooks\//.test(nginx), 'nginx must route /webhooks/ to api (spec section 5)');
assert.ok(/proxy_pass\s+http:\/\/web:80/.test(nginx), 'nginx must proxy web app');

const apiDocker = read('api/Dockerfile');
assert.ok(/prisma generate/.test(apiDocker), 'api image must run prisma generate');
assert.ok(/prisma migrate deploy/.test(apiDocker), 'api start must apply migrations');

const webDocker = read('web/Dockerfile');
assert.ok(/npm run build/.test(webDocker), 'web image must build static assets');

const tls = read('infra/TLS.md');
assert.ok(/certbot/i.test(tls), 'TLS note must mention certbot/Let\'s Encrypt');

console.log('infra files OK');
