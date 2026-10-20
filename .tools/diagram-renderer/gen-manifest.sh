#!/bin/bash
# Runs the repository's flow-space-statics/generate-manifest.sh (always its current version) against this checkout
# instead of the server path it has hard-coded.
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
sed "s#^STATICS_DIR=.*#STATICS_DIR=\"$ROOT/flow-space-statics\"#" "$ROOT/flow-space-statics/generate-manifest.sh" | bash
