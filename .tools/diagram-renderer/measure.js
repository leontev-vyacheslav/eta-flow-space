// Prints each info icon's bounding box relative to the frame of the block it sits in (rendered geometry).
const { chromium } = require('playwright'); const fs = require('fs');
const [, , site] = process.argv;
const svg = fs.readFileSync(require("path").resolve(__dirname, `../../flow-space-statics/devices/${site}/mnemo-schema.svg`), 'utf8').replace(/^<\?xml[^>]*>/, '');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', args: ['--no-proxy-server'] });
  const p = await b.newPage(); await p.setContent(`<body>${svg}</body>`);
  const r = await p.evaluate(() => {
    const svg = document.querySelector('svg'); const out = [];
    const toUser = (el) => { const bb = el.getBBox(); const m = svg.getScreenCTM().inverse().multiply(el.getScreenCTM());
      const pt = (x, y) => { const q = svg.createSVGPoint(); q.x = x; q.y = y; return q.matrixTransform(m); };
      const a = pt(bb.x, bb.y), c = pt(bb.x + bb.width, bb.y + bb.height); return { x0: a.x, y0: a.y, x1: c.x, y1: c.y }; };
    const frames = [...svg.querySelectorAll('rect[rx]')].filter(r => r.getAttribute('data-device') || /666666/.test(r.getAttribute('style')||'')).map(r => ({ r, b: toUser(r) }));
    for (const u of svg.querySelectorAll('use[href="#infoIcon"]')) {
      const ib = toUser(u);
      const f = frames.find(f => ib.x0 >= f.b.x0 && ib.x1 <= f.b.x1 && ib.y0 >= f.b.y0 && ib.y1 <= f.b.y1);
      out.push({ device: u.getAttribute('data-device') || '(none)', right: f ? +(f.b.x1 - ib.x1).toFixed(2) : null, top: f ? +(ib.y0 - f.b.y0).toFixed(2) : null, frame: f ? f.r.getAttribute('data-device') : null });
    }
    return out;
  });
  console.table(r); await b.close();
})();
