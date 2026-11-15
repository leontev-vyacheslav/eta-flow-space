// Static SVG geometry audit. Measurements include every ancestor transform.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(path.join(root, 'flow-space-ui/package.json'));
const { chromium } = require('@playwright/test');
const [site, selector = '[id]:is(rect,circle,text,use)'] = process.argv.slice(2);
if (!site || !/^[a-z0-9-]+$/.test(site)) {
    throw new Error('Usage: node .tools/diagram-renderer/measure-components.mjs <device-code> [CSS selector]');
}
const directory = path.join(root, 'flow-space-statics/devices', site);
const svg = (await fs.readFile(path.join(directory, 'mnemo-schema.svg'), 'utf8')).replace(/^<\?xml[^>]*>\s*/, '');
const css = await fs.readFile(path.join(directory, 'mnemo-schema.css'), 'utf8').catch(() => '');
const browser = await chromium.launch({ headless: true });
try {
    const page = await browser.newPage({ deviceScaleFactor: 1 });
    await page.setContent(`<style>body{margin:0}svg{display:block}${css}</style>${svg}`);
    const report = await page.evaluate(selector => {
        const svg = document.querySelector('svg');
        const viewBox = svg.viewBox.baseVal;
        svg.setAttribute('width', String(viewBox.width));
        svg.setAttribute('height', String(viewBox.height));
        const round = value => Number(value.toFixed(4));
        const elements = [...svg.querySelectorAll(selector)].map(element => {
            const box = element.getBBox();
            const matrix = svg.getScreenCTM().inverse().multiply(element.getScreenCTM());
            const points = [[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]]
                .map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
            const scaleX = Math.hypot(matrix.a, matrix.b);
            const scaleY = Math.hypot(matrix.c, matrix.d);
            const style = getComputedStyle(element);
            const transforms = [];
            for (let parent = element; parent && parent !== svg; parent = parent.parentElement) {
                if (parent.hasAttribute('transform')) {
                    transforms.push({ id: parent.id || null, transform: parent.getAttribute('transform') });
                }
            }
            return {
                id: element.id || null,
                tag: element.tagName,
                localWidth: round(box.width),
                localHeight: round(box.height),
                effectiveWidth: round(Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x))),
                effectiveHeight: round(Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y))),
                scaleX: round(scaleX),
                scaleY: round(scaleY),
                fontFamily: element.tagName === 'text' ? style.fontFamily : undefined,
                effectiveFontSize: element.tagName === 'text' ? round(Number.parseFloat(style.fontSize) * scaleY) : undefined,
                stroke: style.stroke,
                effectiveStrokeWidth: Math.abs(scaleX - scaleY) < 0.00001 ? round(Number.parseFloat(style.strokeWidth) * scaleX) : null,
                transforms,
            };
        });
        return { viewBox: svg.getAttribute('viewBox'), measurement: 'SVG user units after all element and ancestor transforms; no device state applied', elements };
    }, selector);
    process.stdout.write(JSON.stringify({ site, ...report }, null, 2) + '\n');
} finally {
    await browser.close();
}
