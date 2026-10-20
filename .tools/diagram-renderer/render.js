// Standalone mnemoschema renderer: applies device states like use-mnemoschema-state-setup.tsx
// (ru-RU numbers with 1-2 decimals + unit from the device's data schema, enum descriptions,
// colorizers, data-state-eval, datetimes) and screenshots the SVG.
// Usage: node render.js <site code> <states.json> <out.png> [scale] [crop x0,y0,x1,y1 as fractions]
const { chromium } = require('playwright');
const fs = require('fs');
const STATICS = process.env.STATICS || require("path").resolve(__dirname, "../../flow-space-statics/devices");
const [, , site, statesFile, out, scale = '2', crop] = process.argv;
const states = JSON.parse(fs.readFileSync(statesFile, 'utf8'));
const schemas = {};
for (const code of Object.keys(states)) {
    const p = `${STATICS}/${code}/data-schema.json`;
    if (fs.existsSync(p)) schemas[code] = JSON.parse(fs.readFileSync(p, 'utf8'));
}
const svg = fs.readFileSync(`${STATICS}/${site}/mnemo-schema.svg`, 'utf8').replace(/^<\?xml[^>]*>/, '');
const cssPath = `${STATICS}/${site}/mnemo-schema.css`;
const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet">
<style>body{margin:0;background:#fff} svg{width:1400px;height:auto;display:block} ${css}</style></head>
<body>${svg}</body></html>`;
(async () => {
    const browser = await chromium.launch({
        executablePath: process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell',
        args: ['--no-proxy-server'],
    });
    const page = await browser.newPage({ deviceScaleFactor: Number(scale), viewport: { width: 1400, height: 900 } });
    await page.setContent(html, { waitUntil: 'load' }).catch(() => {});
    const report = await page.evaluate(({ states, schemas }) => {
        const nf = new Intl.NumberFormat('ru-RU', { style: 'decimal', maximumFractionDigits: 2, minimumFractionDigits: 1 });
        const resolve = (schema, prop) => {
            const p = schema?.properties?.[prop];
            if (p && p.$ref) { const name = p.$ref.split('/').pop(); return { ...schema.$defs[name], ui: p.ui ?? schema.$defs[name].ui, _enum: schema.$defs[name].enumDescriptions }; }
            return p;
        };
        const evalIn = (code, element, value) => new Function('element', 'value', 'states', code)(element, value, states);
        const missing = [];
        for (const el of document.querySelectorAll('[data-state]')) {
            const attr = el.getAttribute('data-state'); const ev = el.getAttribute('data-state-eval');
            if (attr.includes(';')) { if (ev) try { evalIn(ev, el, undefined); } catch (e) { missing.push('eval ' + e.message); } continue; }
            const m = attr.match(/^states\['([^']+)'\]\.(.+)$/); if (!m) continue;
            const [, code, path] = m;
            const value = path.split('.').reduce((o, k) => o?.[k.replace(/\[(\d+)\]/, '')]?.[k.match(/\[(\d+)\]/)?.[1]] ?? o?.[k], states[code]);
            const info = resolve(schemas[code], path.split('.')[0]);
            if (value === undefined) { missing.push(attr); continue; }
            if (el.tagName === 'text' && info) {
                if (info._enum) { const d = info._enum[value]; el.innerHTML = d ? d.split(' - ').pop().split('(')[0].trim() : `Ошибка (${value})`; }
                else { let v = value; if (info.type === 'number') v = nf.format(value);
                    if (info.unit) el.innerHTML = `${v} ${info.unit}`;
                    else if (info.ui?.editor?.editorOptions?.type === 'datetime') el.innerHTML = new Date(value).toLocaleString('ru-RU');
                    else el.innerHTML = v; }
            } else if (info?.ui?.colorizer?.styleProps) {
                for (const sp of info.ui.colorizer.styleProps) for (const [prop, map] of Object.entries(sp)) for (const [k, cond] of Object.entries(map))
                    if (cond === value || (Array.isArray(cond) && cond.includes(value))) el.style[prop] = k;
            }
            if (ev) try { evalIn(ev, el, value); } catch (e) { missing.push('eval ' + e.message); }
        }
        return missing;
    }, { states, schemas });
    await page.waitForTimeout(700);
    const svgEl = page.locator('svg').first();
    if (crop) {
        const box = await svgEl.boundingBox(); const [x0, y0, x1, y1] = crop.split(',').map(Number);
        await page.screenshot({ path: out, clip: { x: box.x + box.width * x0, y: box.y + box.height * y0, width: box.width * (x1 - x0), height: box.height * (y1 - y0) } });
    } else await svgEl.screenshot({ path: out });
    console.log('rendered', out, report.length ? 'unresolved: ' + JSON.stringify([...new Set(report)].slice(0, 15)) : 'all bindings resolved');
    await browser.close();
})();
