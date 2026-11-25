import { test, expect, type CDPSession } from '@playwright/test';
import { collectPageErrors, signIn } from './helpers';

type HeapSnapshot = {
    snapshot: { meta: { node_fields: string[]; node_types: (string | string[])[] } };
    nodes: number[];
    strings: string[];
};

// Keep raw snapshots in memory: they can contain session credentials and live device data.
async function countEventWrappers(session: CDPSession): Promise<number> {
    const chunks: string[] = [];
    const append = ({ chunk }: { chunk: string }) => { chunks.push(chunk); };
    session.on('HeapProfiler.addHeapSnapshotChunk', append);
    try {
        await session.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
    } finally {
        session.off('HeapProfiler.addHeapSnapshotChunk', append);
    }
    const heap = JSON.parse(chunks.join('')) as HeapSnapshot;
    const fields = heap.snapshot.meta.node_fields;
    const typeIndex = fields.indexOf('type');
    const nameIndex = fields.indexOf('name');
    const types = heap.snapshot.meta.node_types[typeIndex] as string[];
    let count = 0;
    for (let offset = 0; offset < heap.nodes.length; offset += fields.length) {
        if (types[heap.nodes[offset + typeIndex]] === 'closure'
            && heap.strings[heap.nodes[offset + nameIndex]] === 'wrappedHandler') {
            count++;
        }
    }
    return count;
}

test('dashboard polling does not accumulate DevExtreme template handlers', async ({ page, browserName }, testInfo) => {
    test.skip(process.env.E2E_MEMORY_AUDIT !== '1', 'Opt in to the heap-snapshot regression check');
    test.skip(browserName !== 'chromium', 'Heap snapshots require Chromium CDP');
    test.setTimeout(90_000);
    const errors = collectPageErrors(page);

    await page.addInitScript(() => {
        const realTimeout = window.setTimeout;
        const realInterval = window.setInterval;
        window.setTimeout = ((handler: TimerHandler, delay?: number, ...args: unknown[]) =>
            realTimeout(handler, delay === 30_000 ? 100 : delay, ...args)) as typeof window.setTimeout;
        window.setInterval = ((handler: TimerHandler, delay?: number, ...args: unknown[]) =>
            realInterval(handler, delay === 30_000 ? 100 : delay, ...args)) as typeof window.setInterval;
        document.addEventListener('DOMContentLoaded', () => {
            let updates = 0;
            new MutationObserver(records => {
                for (const record of records) {
                    for (const node of record.addedNodes) {
                        if (node instanceof SVGSVGElement && node.matches('[id$="mnemoschema"], [class*="mnemoschema"]')) {
                            document.documentElement.dataset.memoryUpdates = String(++updates);
                        }
                    }
                }
            }).observe(document.body, { childList: true, subtree: true });
        }, { once: true });
    });

    // Fetch each fixture once. Accelerated polling and CSS reloads then stay in this browser.
    const fixtures = new Map<string, Promise<{ status: number; contentType: string; body: string }>>();
    let tick = 0;
    await page.route(/\/(?:api\/(?:device-states\/\d+|emergency-states)|static\/devices\/[^/]+\/mnemo-schema\.css)(?:\?|$)/, async route => {
        const pathname = new URL(route.request().url()).pathname;
        let fixture = fixtures.get(pathname);
        if (!fixture) {
            fixture = route.fetch().then(async response => ({
                status: response.status(),
                contentType: response.headers()['content-type'],
                body: await response.text(),
            }));
            fixtures.set(pathname, fixture);
        }
        const cached = await fixture;
        let body = cached.body;
        if (/\/device-states\/\d+$/.test(pathname) && cached.status === 200) {
            const states = JSON.parse(body) as Record<string, { state: Record<string, unknown> }>;
            Object.values(states)[0].state.__memoryTestTick = ++tick;
            body = JSON.stringify(states);
        }
        await route.fulfill({ ...cached, body });
    });

    try {
        await signIn(page);
        await expect.poll(async () => Number(await page.locator('html').getAttribute('data-memory-updates')),
            { timeout: 30_000 }).toBeGreaterThanOrEqual(20);
        const session = await page.context().newCDPSession(page);
        const before = await countEventWrappers(session);
        expect(before, 'The heap probe must find DevExtreme event wrappers').toBeGreaterThan(0);
        const start = Number(await page.locator('html').getAttribute('data-memory-updates'));
        await expect.poll(async () => Number(await page.locator('html').getAttribute('data-memory-updates')),
            { timeout: 30_000 }).toBeGreaterThanOrEqual(start + 100);
        const after = await countEventWrappers(session);
        await testInfo.attach('event-wrapper-counts', {
            body: JSON.stringify({ before, after, growth: after - before, updates: 100 }),
            contentType: 'application/json',
        });
        console.info('Dashboard event wrappers:', { before, after, growth: after - before });
        expect(after - before, 'Template handlers should remain bounded after warm-up').toBeLessThan(20);
        expect(errors).toEqual([]);
    } finally {
        await page.unrouteAll({ behavior: 'wait' });
        await page.goto('/#/logout');
        await expect(page.locator('input[type=password]')).toBeVisible();
    }
});
