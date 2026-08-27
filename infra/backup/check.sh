#!/bin/sh
set -eu

backup_dir="${BACKUP_DIR:-./backups}"
max_age_hours="${BACKUP_MAX_AGE_HOURS:-30}"
status_file="${backup_dir}/last-success.json"

case "$max_age_hours" in
  ''|*[!0-9]*)
    echo "BACKUP_MAX_AGE_HOURS must be a positive integer" >&2
    exit 1
    ;;
esac

if [ ! -s "$status_file" ]; then
  echo "CRITICAL: no successful database backup status at ${status_file}" >&2
  exit 1
fi

now="$(date +%s)"
modified="$(stat -c %Y "$status_file")"
age_hours="$(( (now - modified) / 3600 ))"

if [ "$age_hours" -gt "$max_age_hours" ]; then
  echo "CRITICAL: latest database backup is ${age_hours}h old (limit ${max_age_hours}h)" >&2
  exit 1
fi

health="$(curl --fail --silent --show-error --max-time 10 \
  http://127.0.0.1:8080/api/health)"
printf '%s' "$health" | grep -Eq '"status"[[:space:]]*:[[:space:]]*"ok"' || {
  echo "CRITICAL: API health is degraded: ${health}" >&2
  exit 1
}

echo "OK: API healthy; latest database backup is ${age_hours}h old"
