#!/bin/sh
set -eu

umask 077

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

case "${BACKUP_RETENTION_DAYS:-14}" in
  ''|*[!0-9]*)
    echo "BACKUP_RETENTION_DAYS must be a positive integer" >&2
    exit 1
    ;;
esac

if [ "${BACKUP_RETENTION_DAYS:-14}" -lt 1 ]; then
  echo "BACKUP_RETENTION_DAYS must be at least 1" >&2
  exit 1
fi

mkdir -p /backups

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
final="/backups/arenafc-${timestamp}.dump"
temporary="${final}.partial"
status_tmp="/backups/last-success.json.partial"

cleanup() {
  rm -f "$temporary" "$status_tmp"
}
trap cleanup EXIT HUP INT TERM

echo "Starting logical database backup at ${timestamp}"
pg_dump \
  --dbname="$DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="$temporary"

# A successful pg_dump is not enough: make sure pg_restore can read the archive
# before publishing it as the latest recovery point.
pg_restore --list "$temporary" >/dev/null
mv "$temporary" "$final"

checksum="$(sha256sum "$final" | awk '{print $1}')"
size_bytes="$(wc -c < "$final" | tr -d ' ')"
printf '{"status":"ok","createdAt":"%s","file":"%s","sizeBytes":%s,"sha256":"%s"}\n' \
  "$timestamp" "$(basename "$final")" "$size_bytes" "$checksum" > "$status_tmp"
mv "$status_tmp" /backups/last-success.json

sha256sum "$final" > "${final}.sha256"
find /backups -type f \( -name 'arenafc-*.dump' -o -name 'arenafc-*.dump.sha256' \) \
  -mtime "+${BACKUP_RETENTION_DAYS:-14}" -delete

trap - EXIT HUP INT TERM
echo "Backup verified: $(basename "$final") (${size_bytes} bytes)"
