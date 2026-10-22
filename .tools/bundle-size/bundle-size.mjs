// Where the UI's JavaScript comes from: builds flow-space-ui with source maps into a temporary folder (or reads an
// existing build), then sums the minified bytes of each chunk by the package and folder they came from.
//   node bundle-size.mjs                       build the working tree, report the chunks index.html loads at start
//   node bundle-size.mjs --all                 every chunk, not only the start ones
//   node bundle-size.mjs --dist <dir>          an existing build made with --sourcemap (no build)
//   node bundle-size.mjs --depth 4             group devextreme by more path levels (default 3: devextreme/esm/<area>)
// Needs Node 24 (the UI's version) in PATH for the build.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const uiDir = path.join(repo, 'flow-space-ui');
const args = process.argv.slice(2);
const option = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const allChunks = args.includes('--all');
const depth = Number(option('--depth') ?? 3);

let dist = option('--dist');
let tempDir;
if (!dist) {
    tempDir = mkdtempSync(path.join(tmpdir(), 'ui-bundle-'));
    dist = tempDir;
    execFileSync('npx', ['vite', 'build', '--sourcemap', '--outDir', dist, '--emptyOutDir', '--logLevel', 'warn'], { cwd: uiDir, stdio: 'inherit' });
}

const base64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const decodeSegment = (segment) => {
    const values = [];
    let value = 0, shift = 0;
    for (const char of segment) {
        const digit = base64.indexOf(char);
        value += (digit & 31) << shift;
        if (digit & 32) { shift += 5; continue; }
        values.push(value & 1 ? -(value >>> 1) : value >>> 1);
        value = 0; shift = 0;
    }
    return values;
};

// the package a source belongs to: node_modules/<name> (scoped names kept), devextreme split by folder; app code as src/<folder>
const group = (source) => {
    const normalized = source.replace(/\\/g, '/');
    const nm = normalized.lastIndexOf('node_modules/');
    if (nm < 0) {
        const src = normalized.indexOf('src/');
        return src >= 0 ? normalized.slice(src).split('/').slice(0, 2).join('/') : normalized;
    }
    const parts = normalized.slice(nm + 'node_modules/'.length).split('/');
    const name = parts[0].startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
    if (name === 'devextreme') {
        // devextreme/esm/__internal/<area> or devextreme/esm/<area>
        const rest = parts.slice(1).filter(p => p !== '__internal');
        return ['devextreme', ...rest.slice(0, depth - 1)].join('/');
    }
    return name;
};

const chunkBytesBySource = (file) => {
    const code = readFileSync(file, 'utf8');
    const mapFile = `${file}.map`;
    const totals = new Map();
    if (!existsSync(mapFile)) {
        totals.set('(no source map)', code.length);
        return totals;
    }
    const map = JSON.parse(readFileSync(mapFile, 'utf8'));
    const lines = code.split('\n');
    let source = 0;
    map.mappings.split(';').forEach((line, lineIndex) => {
        const lineLength = (lines[lineIndex] ?? '').length;
        let column = 0;
        const segments = line ? line.split(',').map(decodeSegment) : [];
        const starts = segments.map(s => { column += s[0]; if (s.length > 1) source += s[1]; return { column, source: s.length > 1 ? source : -1 }; });
        // a segment covers the bytes up to the next one (columns restart on each line, the source index does not)
        starts.forEach((start, i) => {
            const end = i + 1 < starts.length ? starts[i + 1].column : lineLength;
            const key = start.source >= 0 ? group(map.sources[start.source] ?? '?') : '(generated)';
            totals.set(key, (totals.get(key) ?? 0) + Math.max(0, end - start.column));
        });
        if (!starts.length || starts[0].column > 0) {
            const gap = starts.length ? starts[0].column : lineLength;
            totals.set('(generated)', (totals.get('(generated)') ?? 0) + gap);
        }
    });
    return totals;
};

const html = readFileSync(path.join(dist, 'index.html'), 'utf8');
const startFiles = [...html.matchAll(/(?:src|href)="\/?(assets\/[^"]+\.js)"/g)].map(m => m[1]);
const files = allChunks
    ? readdirSync(path.join(dist, 'assets')).filter(f => f.endsWith('.js')).map(f => `assets/${f}`)
    : startFiles;

const kb = (bytes) => `${(bytes / 1024).toFixed(1).padStart(8)} kB`;
const overall = new Map();
let rawTotal = 0, gzipTotal = 0;
console.log(allChunks ? 'All chunks' : 'Chunks loaded at start (index.html)');
for (const file of files) {
    const full = path.join(dist, file);
    const raw = readFileSync(full);
    const gz = gzipSync(raw, { level: 9 }).length;
    rawTotal += raw.length; gzipTotal += gz;
    console.log(`  ${kb(raw.length)} ${kb(gz)} gz  ${file}${startFiles.includes(file) ? '' : '  (lazy)'}`);
    for (const [key, bytes] of chunkBytesBySource(full)) overall.set(key, (overall.get(key) ?? 0) + bytes);
}
console.log(`  ${kb(rawTotal)} ${kb(gzipTotal)} gz  total\n\nBy source (minified bytes):`);
[...overall].sort((a, b) => b[1] - a[1]).filter(([, b]) => b >= 4096)
    .forEach(([key, bytes]) => console.log(`  ${kb(bytes)}  ${(100 * bytes / rawTotal).toFixed(1).padStart(5)} %  ${key}`));

if (tempDir) rmSync(tempDir, { recursive: true, force: true });
