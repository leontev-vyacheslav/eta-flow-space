import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ui = resolve(root, 'flow-space-ui');
const require = createRequire(resolve(ui, 'package.json'));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const deviceCode = process.argv[2];
if (!deviceCode || !/^[a-z0-9][a-z0-9_-]*$/.test(deviceCode)) {
    throw new Error('Provide a device code, for example tsarevo2-boiler-room');
}
const deviceDir = resolve(root, 'flow-space-statics/devices', deviceCode);
const apiHost = 'http://localhost:3002';
const assets = new Map([
    ['mnemo-schema.svg', ['image/svg+xml', 'mnemo-schema']],
    ['data-schema.json', ['application/json', 'data-schema']],
    ['mnemo-schema.css', ['text/css', 'css']],
    ['mnemo-schema.js', ['application/javascript', 'js']],
]);
await access(resolve(deviceDir, 'mnemo-schema.svg'));
await access(resolve(deviceDir, 'data-schema.json'));
let remoteManifest;
const plugin = {
    name: 'local-diagram-preview',
    enforce: 'pre',
    transform(code, id) {
        if (id.split('?')[0].endsWith('/src/contexts/app-data/flows/use-flow-data.ts') || id.split('?')[0].endsWith('/src/pages/dashboard-page/components/mnemoschema/mnemoschema.tsx')) {
            return { code: code.replaceAll('${routes.host}/static/', '${window.location.origin}/static/'), map: null };
        }
    },
    configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
            const pathname = new URL(req.url, 'http://localhost:3000').pathname;
            const prefix = '/static/devices/' + deviceCode + '/';
            if (pathname !== '/static/manifest.json' && !pathname.startsWith(prefix)) {
                next();
                return;
            }
            try {
                if (!['GET', 'HEAD'].includes(req.method)) {
                    res.statusCode = 405;
                    res.setHeader('Allow', 'GET, HEAD');
                    res.end();
                    return;
                }
                res.setHeader('Cache-Control', 'no-store');
                if (pathname === '/static/manifest.json') {
                    if (!remoteManifest) {
                        const remote = await fetch(apiHost + '/static/manifest.json', { signal: AbortSignal.timeout(10000) });
                        if (!remote.ok) {
                            throw new Error('Static manifest returned HTTP ' + remote.status);
                        }
                        remoteManifest = await remote.json();
                    }
                    const entry = {};
                    for (const [filename, [, key]] of assets) {
                        try {
                            entry[key] = createHash('md5').update(await readFile(resolve(deviceDir, filename))).digest('hex').slice(0, 6);
                        } catch (error) {
                            if (error.code !== 'ENOENT') {
                                throw error;
                            }
                        }
                    }
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ ...remoteManifest, [deviceCode]: entry }));
                    return;
                }
                const filename = pathname.slice(prefix.length), meta = assets.get(filename);
                if (!meta) {
                    res.statusCode = 404;
                    res.end('Not found');
                    return;
                }
                res.setHeader('Content-Type', meta[0]);
                try {
                    res.end(await readFile(resolve(deviceDir, filename)));
                } catch (error) {
                    if (error.code !== 'ENOENT') {
                        throw error;
                    }
                    res.statusCode = 404;
                    res.end('Not found');
                }
            } catch (error) {
                next(error);
            }
        });
        server.watcher.add(deviceDir);
        server.watcher.on('change', path => {
            if (dirname(path) === deviceDir && assets.has(path.split('/').pop())) {
                server.ws.send({ type: 'full-reload', path: '*' });
            }
        });
    },
};
process.env.VITE_API_HOST = apiHost;
const server = await createServer({
    configFile: resolve(ui, 'vite.config.ts'),
    root: ui,
    plugins: [plugin],
    server: { host: 'localhost', port: 3000, strictPort: true, proxy: { '/static': { target: apiHost, changeOrigin: true } } },
});
await server.listen();
server.printUrls();
console.log(`Local diagram: ${deviceCode}. API and other sites use ${apiHost}.`);
for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, async () => {
        await server.close();
        process.exit(0);
    });
}
