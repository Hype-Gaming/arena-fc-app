// test/workspace.test.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

assert.deepStrictEqual(pkg.workspaces, ['api', 'web'], 'workspaces must be [api, web]');
assert.strictEqual(pkg.private, true, 'root package must be private');
assert.ok(fs.existsSync(path.join(root, '.gitignore')), '.gitignore must exist');
assert.ok(fs.existsSync(path.join(root, '.env.example')), '.env.example must exist');

const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
assert.ok(/node_modules/.test(gitignore), '.gitignore must ignore node_modules');
assert.ok(/\.env\b/.test(gitignore), '.gitignore must ignore .env');

const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
['POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB', 'DATABASE_URL'].forEach((k) => {
  assert.ok(new RegExp('^' + k + '=', 'm').test(envExample), '.env.example must define ' + k);
});

console.log('workspace scaffold OK');
