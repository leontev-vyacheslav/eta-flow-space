#!/usr/bin/env bash
# Start an interactive local diagram preview outside the invoking terminal's lifetime.
set -euo pipefail

preview_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
preview_root="$(cd -- "$preview_dir/../.." && pwd)"
preview_unit='eta-flow-space-diagram-preview.service'
preview_api='http://localhost:3002'

usage() {
    cat <<'USAGE'
Usage:
  bash .tools/diagram-renderer/local-app.sh start <device-code>
  bash .tools/diagram-renderer/local-app.sh stop
  bash .tools/diagram-renderer/local-app.sh status
  bash .tools/diagram-renderer/local-app.sh logs

Serves the selected workspace diagram at http://localhost:3000.
API data and other devices use the existing tunnel on localhost:3002.
Requires Node.js 24+, installed flow-space-ui dependencies and user systemd.
USAGE
}

case "${1:-help}" in
    start)
        if [[ $# -ne 2 || ! "$2" =~ ^[a-z0-9][a-z0-9_-]*$ ]]; then
            usage >&2
            exit 1
        fi
        preview_code="$2"
        preview_device="$preview_root/flow-space-statics/devices/$preview_code"
        if [[ ! -f "$preview_device/mnemo-schema.svg" || ! -f "$preview_device/data-schema.json" ]]; then
            printf 'Missing diagram or schema: %s\n' "$preview_device" >&2
            exit 1
        fi
        if systemctl --user is-active --quiet "$preview_unit"; then
            printf 'A diagram preview is already running. Use status or stop first.\n' >&2
            exit 1
        fi
        if [[ -n "$(ss -H -ltn 'sport = :3000')" ]]; then
            printf 'Port 3000 is occupied; the existing app was left running.\n' >&2
            exit 1
        fi
        preview_node="$(command -v node)"
        "$preview_node" -e 'if (Number(process.versions.node.split(".")[0]) < 24) { throw new Error("Node.js 24+ is required"); }'
        (cd -- "$preview_root/flow-space-ui" && "$preview_node" --input-type=module -e 'import.meta.resolve("vite")')
        curl --fail --silent --show-error --max-time 5 "$preview_api/static/manifest.json" >/dev/null
        systemd-run --user --unit="$preview_unit" --collect \
            --description="Flow Space diagram preview: $preview_code" \
            --property="WorkingDirectory=$preview_root/flow-space-ui" \
            --property=Restart=on-failure --property=RestartSec=2 \
            "$preview_node" "$preview_dir/local-app.mjs" "$preview_code"
        for preview_attempt in {1..20}; do
            if curl --fail --silent --max-time 1 --head \
                "http://localhost:3000/static/devices/$preview_code/mnemo-schema.svg" >/dev/null; then
                printf 'Running: http://localhost:3000\nLocal diagram: %s\nService: %s\n' "$preview_code" "$preview_unit"
                exit 0
            fi
            sleep 0.25
        done
        printf 'Preview did not become ready; stopping its service.\n' >&2
        systemctl --user stop "$preview_unit"
        journalctl --user -u "$preview_unit" -n 30 --no-pager >&2
        exit 1
        ;;
    stop)
        if [[ $# -ne 1 ]]; then
            usage >&2
            exit 1
        fi
        if [[ "$(systemctl --user show "$preview_unit" --property=LoadState --value)" == 'not-found' ]]; then
            printf 'Diagram preview is already stopped.\n'
        else
            systemctl --user stop "$preview_unit"
            printf 'Diagram preview stopped.\n'
        fi
        ;;
    status)
        systemctl --user show "$preview_unit" --property=LoadState --property=ActiveState \
            --property=SubState --property=MainPID --property=Description
        ;;
    logs)
        journalctl --user -u "$preview_unit" -n 50 --no-pager
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        usage >&2
        exit 1
        ;;
esac
