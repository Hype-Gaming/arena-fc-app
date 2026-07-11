const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const workflow = fs.readFileSync(
  path.join(root, '.github', 'workflows', 'ci-cd.yml'),
  'utf8',
);

assert.ok(
  /group:\s*production-deploy-\$\{\{ github\.repository \}\}/.test(workflow),
  'production deploys must share an exclusive concurrency group',
);
assert.ok(
  /EXPECTED_SHA="\$\{\{ github\.sha \}\}"/.test(workflow),
  'deploy must capture the exact validated commit SHA',
);
assert.ok(
  /git checkout --detach "\$EXPECTED_SHA"/.test(workflow),
  'deploy must check out the validated SHA instead of the moving branch',
);
assert.ok(
  /test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_SHA"/.test(workflow),
  'deploy must verify the checked-out revision',
);
assert.ok(
  /compose up -d --build --wait --wait-timeout 240/.test(workflow),
  'deploy must wait for container health',
);
assert.ok(
  /127\.0\.0\.1:8080\/api\/health/.test(workflow),
  'deploy must smoke-test the public API path',
);
assert.ok(
  /compose logs --no-color --tail=200 api web nginx/.test(workflow),
  'deploy failures must print service logs',
);

console.log('workflow OK');
