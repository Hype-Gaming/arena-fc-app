// api/test/toolchain.test.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const dir = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));

['@nestjs/core', '@nestjs/common', '@nestjs/platform-express', '@prisma/client', 'class-validator', 'class-transformer']
  .forEach((d) => assert.ok(pkg.dependencies[d], 'missing dependency ' + d));
['prisma', 'jest', 'ts-jest', 'supertest', '@types/supertest', 'typescript']
  .forEach((d) => assert.ok(pkg.devDependencies[d], 'missing devDependency ' + d));

assert.ok(pkg.scripts.test && /jest/.test(pkg.scripts.test), 'test script must run jest');
assert.ok(pkg.scripts['test:e2e'] && /e2e/.test(pkg.scripts['test:e2e']), 'test:e2e script required');
assert.ok(pkg.jest, 'jest config required in package.json');
assert.strictEqual(pkg.jest.moduleFileExtensions.includes('ts'), true, 'jest must resolve ts');

const tsconfig = JSON.parse(fs.readFileSync(path.join(dir, 'tsconfig.json'), 'utf8'));
assert.strictEqual(tsconfig.compilerOptions.experimentalDecorators, true, 'decorators required for Nest');
assert.strictEqual(tsconfig.compilerOptions.emitDecoratorMetadata, true, 'metadata required for Nest');

console.log('api toolchain OK');
