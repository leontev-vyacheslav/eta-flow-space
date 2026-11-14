#!/usr/bin/env bash
# Exercises the actual export and restore workflow against disposable fixtures.
set -euo pipefail
umask 077

tool_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
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
test_dir="$(mktemp -d /tmp/eta-flow-backup-test.XXXXXX)"
source_container=''
restored_container=''
backup_path=''
cleanup() {
    for container_id in "$source_container" "$restored_container"; do
        if [[ -n "$container_id" ]]; then
            docker rm --force "$container_id" >/dev/null || true
        fi
    done
    if [[ -n "$backup_path" ]]; then
        rm -f -- "$backup_path"
    fi
    rm -f -- "$test_dir/rejected.log" "$test_dir/remote.log"
    rmdir -- "$test_dir/output" "$test_dir/rejected" "$test_dir"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
mkdir -- "$test_dir/output" "$test_dir/rejected"

wait_for_postgres() {
    local container_id="$1"
    for attempt in {1..30}; do
        if docker exec "$container_id" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then
            return 0
        fi
        sleep 1
    done
    echo 'Disposable PostgreSQL did not become ready.' >&2
    return 1
}

source_container="$(docker run -d --rm --pull never \
    --publish 127.0.0.1::5432 --tmpfs /var/lib/postgresql/data \
    -e POSTGRES_DB=backup_fixture -e POSTGRES_PASSWORD=fixture-only \
    "$image" -c shared_preload_libraries=pg_stat_statements -c timezone=UTC)"
wait_for_postgres "$source_container"
source_port="$(docker inspect --format '{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}' "$source_container")"
[[ "$source_port" =~ ^[0-9]+$ ]]

docker exec -i "$source_container" psql -X -q -U postgres -d backup_fixture \
    -v ON_ERROR_STOP=1 >/dev/null <<'SQL'
CREATE EXTENSION pg_stat_statements;
CREATE TABLE public.device (id serial PRIMARY KEY, code text NOT NULL UNIQUE);
CREATE TABLE public.device_state (
    id serial PRIMARY KEY,
    "deviceId" integer REFERENCES public.device(id),
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    state jsonb
);
CREATE TABLE public.emergency_state (
    id serial PRIMARY KEY,
    "deviceId" integer REFERENCES public.device(id),
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    state jsonb
);
CREATE TABLE public.notes (id integer PRIMARY KEY, description text, settings jsonb);
INSERT INTO public.device (code) VALUES ('first'), ('null-json'), ('no-device-state'), ('escaped');
INSERT INTO public.device_state VALUES
    (10, 1, '2026-11-14 10:00Z', '2026-11-14 10:00Z', '{"reading":10}'),
    (20, 1, '2026-11-13 09:00Z', '2026-11-14 10:00Z', '{"reading":20}'),
    (30, 2, '2026-11-14 10:00Z', '2026-11-14 10:00Z', NULL),
    (40, 4, '2026-11-14 10:00Z', '2026-11-14 10:00Z',
        jsonb_build_object('text', E'Тест\tстрока\nbackslash: \\ and "quotes"', 'active', false)),
    (50, NULL, '2026-11-14 10:00Z', '2026-11-14 10:00Z', '{"unassociated":true}');
INSERT INTO public.emergency_state VALUES
    (61, 1, '2026-11-14 10:00Z', '2026-11-14 10:00Z', '{"reasons":["old"]}'),
    (62, 1, '2026-11-14 10:00Z', '2026-11-14 10:00Z', '{"reasons":["current"]}'),
    (65, 2, '2026-11-14 10:00Z', '2026-11-14 10:00Z', NULL),
    (70, 3, '2026-11-13 10:00Z', '2026-11-14 10:00Z', '{"reasons":[]}'),
    (75, NULL, '2026-11-14 10:00Z', '2026-11-14 10:00Z', '{"unassociated":true}');
INSERT INTO public.notes VALUES
    (1, E'Обычные данные\twith tab\nand newline \\ end', '{"keep":[1,2,3]}'),
    (2, NULL, NULL);
SELECT setval('public.device_state_id_seq', 1001, true);
SELECT setval('public.emergency_state_id_seq', 2002, true);
SQL

run_backup() {
    PGHOST=127.0.0.1 PGPORT="$source_port" PGUSER=postgres PGDATABASE=backup_fixture \
        PGPASSWORD=fixture-only BACKUP_POSTGRES_IMAGE="$image" \
        bash "$tool_dir/lightweight-backup.sh" "$1"
}
run_backup "$test_dir/output"
mapfile -t backups < <(find "$test_dir/output" -maxdepth 1 -type f -name '*.sql' -print)
[[ "${#backups[@]}" -eq 1 ]]
backup_path="${backups[0]}"
[[ "$(stat -c '%a' "$backup_path")" == '600' ]]

restored_container="$(docker run -d --rm --pull never --network none \
    --tmpfs /var/lib/postgresql/data -e POSTGRES_PASSWORD=fixture-only \
    "$image" -c shared_preload_libraries=pg_stat_statements -c timezone=UTC)"
wait_for_postgres "$restored_container"
docker exec -i "$restored_container" psql -X -q -U postgres -d postgres \
    --single-transaction -v ON_ERROR_STOP=1 < "$backup_path" >/dev/null
assertions="$(docker exec "$restored_container" psql -X -At -U postgres -d postgres \
    -v ON_ERROR_STOP=1 -c "SELECT
        (SELECT count(*) FROM public.device) = 4
        AND ARRAY(SELECT id FROM public.device_state ORDER BY id) = ARRAY[20,30,40]
        AND ARRAY(SELECT id FROM public.emergency_state ORDER BY id) = ARRAY[62,65,70]
        AND (SELECT state IS NULL FROM public.device_state WHERE id=30)
        AND (SELECT state->>'reading' FROM public.device_state WHERE id=20) = '20'
        AND (SELECT last_value FROM public.device_state_id_seq) = 1001
        AND (SELECT last_value FROM public.emergency_state_id_seq) = 2002;")"
[[ "$assertions" == 't' ]]
notes_query="SELECT md5(string_agg(row_to_json(n)::text, E'\\n' ORDER BY id)) FROM public.notes AS n;"
original_notes="$(docker exec "$source_container" psql -X -At -U postgres -d backup_fixture -c "$notes_query")"
restored_notes="$(docker exec "$restored_container" psql -X -At -U postgres -d postgres -c "$notes_query")"
[[ "$original_notes" == "$restored_notes" ]]

docker exec "$source_container" psql -X -q -U postgres -d backup_fixture \
    -v ON_ERROR_STOP=1 -c 'ALTER TABLE public.device_state ADD COLUMN future_field text;'
if run_backup "$test_dir/rejected" >"$test_dir/rejected.log" 2>&1; then
    echo 'Unexpected state columns should have failed the export.' >&2
    exit 1
fi
grep -q 'Unexpected columns in public.device_state' "$test_dir/rejected.log"
[[ -z "$(find "$test_dir/rejected" -mindepth 1 -print -quit)" ]]

if DOCKER_CONTEXT='' DOCKER_HOST=tcp://invalid:2375 \
    bash "$tool_dir/lightweight-backup.sh" "$test_dir/rejected" >"$test_dir/remote.log" 2>&1; then
    echo 'A remote Docker endpoint should have been rejected.' >&2
    exit 1
fi
grep -q 'Refusing non-local Docker endpoint' "$test_dir/remote.log"
echo 'Passed: latest rows, NULLs, escaping, other table data, sequences, schema-change rejection and local-only Docker.'
