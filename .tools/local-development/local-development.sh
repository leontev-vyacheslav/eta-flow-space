#!/usr/bin/env bash
set -euo pipefail

tool_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

usage() {
    echo 'Usage: bash .tools/local-development/local-development.sh {up|down|status|logs|psql|help}'
    echo 'Local PostgreSQL on 127.0.0.1:55432 and Redis on 127.0.0.1:56379; down preserves data.'
}

action="${1:-help}"
case "$action" in
    help|--help|-h)
        usage
        exit 0
        ;;
    up|down|status|logs|psql) ;;
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
esac
