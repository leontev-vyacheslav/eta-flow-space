#!/bin/bash
# generate-manifest.sh — run this after changing any static file

STATICS_DIR="/home/admin-leo/eta-flow-space/flow-space-statics/flows"
MANIFEST="{}"

for flow_dir in "$STATICS_DIR"/*/; do
    flow=$(basename "$flow_dir")
    svg_hash=$(md5sum "$flow_dir"*mnemo-schema.svg 2>/dev/null | cut -c1-6)
    json_hash=$(md5sum "$flow_dir"*data-schema.json 2>/dev/null | cut -c1-6)
    js_hash=$(md5sum "$flow_dir"*mnemo-schema.js 2>/dev/null | cut -c1-6)
    css_hash=$(md5sum "$flow_dir"*mnemo-schema.css 2>/dev/null | cut -c1-6)
    MANIFEST=$(echo $MANIFEST | jq \
        --arg flow "$flow" \
        --arg svg "$svg_hash" \
        --arg json "$json_hash" \
        --arg js "$js_hash" \
        --arg css "$css_hash" \
        '.[$flow] = {"mnemo-schema": $svg, "data-schema": $json, "js": $js, "css": $css}')
done

echo $MANIFEST > /home/admin-leo/eta-flow-space/flow-space-statics/manifest.json
echo "Manifest updated."