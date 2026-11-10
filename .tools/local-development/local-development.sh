#!/usr/bin/env bash
set -euo pipefail

tool_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

usage() {
    echo 'Usage: bash .tools/local-development/local-development.sh {up|down|status|logs|psql|restore|help}'
    echo '       bash .tools/local-development/local-development.sh restore PLAIN_SQL_BACKUP [--yes]'
    echo 'Local PostgreSQL on 127.0.0.1:55432 and Redis on 127.0.0.1:56379; down preserves data.'
}

action="${1:-help}"
case "$action" in
    help|--help|-h)
        usage
        exit 0
        ;;
    up|down|status|logs|psql|restore) ;;
    *) usage >&2; exit 2 ;;
esac

command -v docker >/dev/null || { echo 'Docker is required.' >&2; exit 1; }
# Reject remote Docker endpoints: this helper is only for the developer machine.
endpoint="${DOCKER_HOST:-$(docker context inspect --format '{{.Endpoints.docker.Host}}')}"
case "$endpoint" in
    unix://*|npipe://*) ;;
    *) echo "Refusing non-local Docker endpoint: $endpoint" >&2; exit 1 ;;
esac

# Keep the original project name so existing containers and volumes are reused.
compose=(docker compose --env-file /dev/null --project-name eta-flow-space-local-db
    --file "$tool_dir/docker-compose.yaml")

case "$action" in
    up)
        "${compose[@]}" up --detach --wait --wait-timeout 90
        "${compose[@]}" exec -T database psql -X -U postgres -d eta_flow_space_local \
            -v ON_ERROR_STOP=1 -c 'DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public."user" WHERE name = '\''demo-admin'\'') THEN RAISE EXCEPTION '\''Demo initialization is incomplete; check logs'\''; END IF; END $$;'
        echo 'Local database ready: 127.0.0.1:55432 / eta_flow_space_local'
        echo 'Local Redis ready: 127.0.0.1:56379'
        echo 'Demo accounts: demo-admin / demo-viewer; password: demo-local-only'
        ;;
    down) "${compose[@]}" down ;;
    status) "${compose[@]}" ps --all ;;
    logs) "${compose[@]}" logs --tail 100 ;;
    psql)
        shift
        # Read SQL from stdin or pass psql arguments after the action.
        "${compose[@]}" exec -T database psql -X -U postgres -d eta_flow_space_local \
            -v ON_ERROR_STOP=1 "$@"
        ;;
    restore)
        backup_path="${2:-}"
        confirmation="${3:-}"
        if [[ -z "$backup_path" || ( -n "$confirmation" && "$confirmation" != '--yes' ) || -n "${4:-}" ]]; then
            usage >&2
            exit 2
        fi
        if [[ ! -f "$backup_path" || ! -r "$backup_path" ]]; then
            echo "Plain SQL backup is not a readable file: $backup_path" >&2
            exit 1
        fi
        if ! grep -m 1 -q '^-- PostgreSQL database dump' "$backup_path"; then
            echo "Refusing file without a PostgreSQL plain-text dump header: $backup_path" >&2
            exit 1
        fi

        echo 'This replaces only the isolated local PostgreSQL database eta_flow_space_local.'
        echo 'The local Redis data and the source backup file are not changed.'
        if [[ "$confirmation" != '--yes' ]]; then
            if [[ ! -t 0 ]]; then
                echo 'Refusing non-interactive restore without --yes.' >&2
                exit 1
            fi
            read -r -p 'Type RESTORE to continue: ' answer
            if [[ "$answer" != 'RESTORE' ]]; then
                echo 'Restore cancelled.'
                exit 1
            fi
        fi

        local_database='eta_flow_space_local'
        restore_database='eta_flow_space_restore_tmp'
        previous_database='eta_flow_space_local_previous'

        "${compose[@]}" up --detach --wait --wait-timeout 90 database
        "${compose[@]}" exec -T database dropdb -U postgres --if-exists "$restore_database"
        "${compose[@]}" exec -T database createdb -U postgres --template=template0 "$restore_database"

        echo "Restoring $backup_path into a temporary local database..."
        if ! "${compose[@]}" exec -T database psql -X -q -U postgres -d "$restore_database" \
            --single-transaction -v ON_ERROR_STOP=1 < "$backup_path"; then
            "${compose[@]}" exec -T database dropdb -U postgres --if-exists "$restore_database"
            echo 'Restore failed; the current local database was not changed.' >&2
            exit 1
        fi

        schema_ready="$("${compose[@]}" exec -T database psql -X -U postgres -d "$restore_database" \
            -v ON_ERROR_STOP=1 -Atc \
            "SELECT to_regclass('public.device') IS NOT NULL AND to_regclass('public.device_state') IS NOT NULL AND to_regclass('public.emergency_state') IS NOT NULL;")"
        if [[ "$schema_ready" != 't' ]]; then
            "${compose[@]}" exec -T database dropdb -U postgres --if-exists "$restore_database"
            echo 'Restore validation failed; expected Flow Space tables are missing. The current local database was not changed.' >&2
            exit 1
        fi

        "${compose[@]}" exec -T database psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 -c \
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname IN ('$local_database', '$previous_database') AND pid <> pg_backend_pid();" >/dev/null
        "${compose[@]}" exec -T database dropdb -U postgres --if-exists "$previous_database"
        "${compose[@]}" exec -T database psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 -c \
            "ALTER DATABASE $local_database RENAME TO $previous_database;"
        if ! "${compose[@]}" exec -T database psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 -c \
            "ALTER DATABASE $restore_database RENAME TO $local_database;"; then
            "${compose[@]}" exec -T database psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 -c \
                "ALTER DATABASE $previous_database RENAME TO $local_database;"
            echo 'Database swap failed; the previous local database was restored.' >&2
            exit 1
        fi

        "${compose[@]}" exec -T database psql -X -U postgres -d "$local_database" \
            -v ON_ERROR_STOP=1 -Atc 'SELECT count(*) FROM public.device;' >/dev/null
        "${compose[@]}" exec -T database dropdb -U postgres "$previous_database"
        echo 'Restore complete: 127.0.0.1:55432 / eta_flow_space_local'
        ;;
esac
