#!/usr/bin/env bash
set -euo pipefail
umask 077

tool_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_dir="$(cd -- "$tool_dir/../.." && pwd)"

usage() {
    echo 'Usage: bash .tools/database-backup/lightweight-backup.sh [OUTPUT_DIRECTORY]'
    echo 'Export plain SQL with the latest device and emergency state per device, then restore-test it.'
    echo 'Default destination: flow-space-backups/ in this checkout.'
    echo 'Connection: PGHOST, PGPORT, PGUSER, PGDATABASE, PGPASSWORD (see README.md).'
}

if [[ "${1:-}" == '--help' || "${1:-}" == '-h' ]]; then
    usage
    exit 0
fi
if [[ $# -gt 1 || "${1:-}" == -* ]]; then
    usage >&2
    exit 2
fi

command -v docker >/dev/null || { echo 'Docker is required.' >&2; exit 1; }
# DOCKER_CONTEXT takes precedence over DOCKER_HOST in the Docker CLI.
if [[ -n "${DOCKER_CONTEXT:-}" ]]; then
    endpoint="$(docker context inspect "$DOCKER_CONTEXT" --format '{{.Endpoints.docker.Host}}')"
else
    endpoint="${DOCKER_HOST:-$(docker context inspect --format '{{.Endpoints.docker.Host}}')}"
fi
case "$endpoint" in
    unix://*) ;;
    *) echo "Refusing non-local Docker endpoint: $endpoint" >&2; exit 1 ;;
esac

image="${BACKUP_POSTGRES_IMAGE:-postgres:17}"
docker image inspect "$image" >/dev/null

export PGHOST="${PGHOST:-127.0.0.1}"
export PGPORT="${PGPORT:-35432}"
export PGUSER="${PGUSER:-postgres}"
export PGDATABASE="${PGDATABASE:-eta_flow_space_database}"
export PGCONNECT_TIMEOUT=10
export PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=60000 -c timezone=UTC -c datestyle=ISO,YMD'

if [[ -z "${PGPASSWORD:-}" ]]; then
    command -v python3 >/dev/null || { echo 'Python 3 is required to read the reporting database password.' >&2; exit 1; }
    PGPASSWORD="$(python3 - "$repo_dir/flow-space-reporting/.env-reporting" <<'PY'
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

try:
    value = next(
        line.split('=', 1)[1].strip()
        for line in Path(sys.argv[1]).read_text().splitlines()
        if line.startswith('DATABASE_URL=')
    )
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        value = value[1:-1]
    password = unquote(urlsplit(value.replace('+asyncpg', '')).password or '')
    if not password:
        raise ValueError('Missing password')
except (OSError, StopIteration, ValueError):
    sys.exit('Set PGPASSWORD or configure DATABASE_URL in flow-space-reporting/.env-reporting.')
print(password)
PY
    )"
fi
export PGPASSWORD

output_dir="${1:-$repo_dir/flow-space-backups}"
mkdir -p -- "$output_dir"
output_dir="$(cd -- "$output_dir" && pwd -P)"
backup_name="eta_flow_space_database_$(TZ=Europe/Moscow date +%Y%m%d_%H%M%S)_latest_device_and_emergency_states.sql"
backup_path="$output_dir/$backup_name"
if [[ -e "$backup_path" || -L "$backup_path" ]]; then
    echo "Refusing to overwrite an existing backup: $backup_path" >&2
    exit 1
fi

work_dir="$(mktemp -d "$output_dir/.lightweight-backup.XXXXXX")"
verify_container=''
cleanup() {
    if [[ -n "$verify_container" ]]; then
        docker rm --force "$verify_container" >/dev/null || true
    fi
    rm -f -- "$work_dir/backup.sql.partial" "$work_dir/expected.txt" \
        "$work_dir/actual.txt" "$work_dir/restore.log"
    rmdir -- "$work_dir"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

echo "Exporting $PGDATABASE from $PGHOST:$PGPORT using a read-only snapshot..."
docker run --rm --pull never --network host --user "$(id -u):$(id -g)" \
    -e PGHOST -e PGPORT -e PGUSER -e PGDATABASE -e PGPASSWORD -e PGCONNECT_TIMEOUT -e PGOPTIONS \
    -v "$tool_dir:/tool:ro" -v "$work_dir:/backup" \
    "$image" bash /tool/export.sh
unset PGPASSWORD

echo 'Verifying the SQL in a disposable local PostgreSQL database...'
verify_container="$(docker run -d --rm --pull never --network none \
    --tmpfs /var/lib/postgresql/data -e POSTGRES_PASSWORD=temporary-backup-verification \
    -v "$tool_dir:/tool:ro" -v "$work_dir:/backup:ro" \
    "$image" -c shared_preload_libraries=pg_stat_statements -c timezone=UTC)"
for attempt in {1..30}; do
    if docker exec "$verify_container" pg_isready -h 127.0.0.1 -U postgres -d postgres >/dev/null 2>&1; then
        break
    fi
    sleep 1
done
docker exec "$verify_container" pg_isready -h 127.0.0.1 -U postgres -d postgres >/dev/null
if ! docker exec "$verify_container" psql -X -q -U postgres -d postgres \
    --single-transaction -v ON_ERROR_STOP=1 -f /backup/backup.sql.partial \
    >"$work_dir/restore.log" 2>&1; then
    # COPY error context can contain complete production rows and credentials.
    echo 'SQL restore failed; no final backup was published.' >&2
    exit 1
fi
docker exec "$verify_container" psql -X -qAt -U postgres -d postgres \
    -v ON_ERROR_STOP=1 -v source=false -f /tool/checks.sql >"$work_dir/actual.txt"
if ! cmp -s "$work_dir/expected.txt" "$work_dir/actual.txt"; then
    echo 'Restored row counts or state contents differ from the source snapshot; no final backup was published.' >&2
    exit 1
fi

# The staging directory is on the output filesystem. A hard link publishes the
# completed file atomically and fails if another backup has claimed this name.
ln -T -- "$work_dir/backup.sql.partial" "$backup_path"
awk -F '|' '$1 == "devices" { print "Devices: " $2 }
    $1 == "device_state" { print "Latest device states: " $2 }
    $1 == "emergency_state" { print "Latest emergency states: " $2 }' "$work_dir/actual.txt"
printf 'Verified backup: %s\n' "$backup_path"
stat -c '%s bytes; mode %a' "$backup_path"
sha256sum "$backup_path"
