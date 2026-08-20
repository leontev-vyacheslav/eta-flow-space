#!/bin/bash
# generate-manifest.sh — run this after changing any static file

# STATICS_DIR="/home/admin-leo/eta-flow-space/flow-space-statics"
STATICS_DIR="/home/leo/projects/eta-flow-space/flow-space-statics"
MANIFEST="{}"

for device_dir in "$STATICS_DIR"/devices/*/; do
    device_code=$(basename "$device_dir")
    svg_hash=$(md5sum "$device_dir"mnemo-schema.svg 2>/dev/null | cut -c1-6)
    json_hash=$(md5sum "$device_dir"data-schema.json 2>/dev/null | cut -c1-6)
    js_hash=$(md5sum "$device_dir"mnemo-schema.js 2>/dev/null | cut -c1-6)
    css_hash=$(md5sum "$device_dir"mnemo-schema.css 2>/dev/null | cut -c1-6)

    MANIFEST=$(echo "$MANIFEST" | jq \
        --arg device "$device_code" \
        --arg svg "$svg_hash" \
        --arg json "$json_hash" \
        --arg js "$js_hash" \
        --arg css "$css_hash" \
        '
        .[$device] = {}
        | if $svg != "" then .[$device]["mnemo-schema"] = $svg else . end
        | if $json != "" then .[$device]["data-schema"] = $json else . end
        | if $js != "" then .[$device]["js"] = $js else . end
        | if $css != "" then .[$device]["css"] = $css else . end
    ')
done

echo $MANIFEST > "$STATICS_DIR"/manifest.json
echo "Manifest updated."