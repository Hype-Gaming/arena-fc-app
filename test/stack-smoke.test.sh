#!/usr/bin/env bash
set -euo pipefail

cp -n .env.example .env || true
docker compose up -d --build

# wait up to 60s for the proxied health endpoint to report db up
ok=""
for i in $(seq 1 30); do
  body="$(curl -fsS http://localhost/api/health || true)"
  if printf '%s' "$body" | grep -q '"db":"up"'; then
    ok="yes"; echo "health: $body"; break
  fi
  sleep 2
done

docker compose down

if [ -z "$ok" ]; then
  echo "FAIL: /api/health never reported db up"; exit 1
fi
echo "stack smoke OK"
