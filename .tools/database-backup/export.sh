#!/usr/bin/env bash
# Internal helper: run by lightweight-backup.sh inside the PostgreSQL client container.
set -euo pipefail
umask 077

output=/backup/backup.sql.partial
coproc SNAPSHOT_SESSION { psql -X -qAt -v ON_ERROR_STOP=1; }
snapshot_pid="$SNAPSHOT_SESSION_PID"
printf '%s\n' 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;' 'SELECT pg_export_snapshot();' >&"${SNAPSHOT_SESSION[1]}"
IFS= read -r -t 30 snapshot_id <&"${SNAPSHOT_SESSION[0]}"
[[ "$snapshot_id" =~ ^[0-9A-Fa-f-]+$ ]]

# Checks use the same snapshot as all three pg_dump sections and filtered COPYs.
# They also reject unexpected state-table columns instead of silently losing them.
psql -X -qAt -v ON_ERROR_STOP=1 -v source=true -v snapshot="$snapshot_id" \
    -f /tool/checks.sql >/backup/expected.txt

pg_dump --snapshot="$snapshot_id" --lock-wait-timeout=10s \
    --section=pre-data --no-owner --no-privileges --file="$output"
pg_dump --snapshot="$snapshot_id" --lock-wait-timeout=10s \
    --section=data --exclude-table-data=public.device_state \
    --exclude-table-data=public.emergency_state --no-owner --no-privileges >>"$output"

for state_table in device_state emergency_state; do
    latest_query="SELECT id, \"deviceId\", \"createdAt\", \"updatedAt\", state FROM (SELECT DISTINCT ON (\"deviceId\") id, \"deviceId\", \"createdAt\", \"updatedAt\", state FROM public.$state_table WHERE \"deviceId\" IS NOT NULL ORDER BY \"deviceId\", id DESC) AS latest ORDER BY id"
    printf '\n-- Latest row per device only; historical %s rows intentionally omitted.\n\n' "$state_table" >>"$output"
    printf 'COPY public.%s (id, "deviceId", "createdAt", "updatedAt", state) FROM stdin;\n' "$state_table" >>"$output"
    psql -X -qAt -v ON_ERROR_STOP=1 -c \
        "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET TRANSACTION SNAPSHOT '$snapshot_id'; COPY ($latest_query) TO STDOUT; COMMIT;" >>"$output"
    printf '\\.\n\n' >>"$output"
done

pg_dump --snapshot="$snapshot_id" --lock-wait-timeout=10s \
    --section=post-data --no-owner --no-privileges >>"$output"
printf '%s\n' 'COMMIT;' '\q' >&"${SNAPSHOT_SESSION[1]}"
wait "$snapshot_pid"
