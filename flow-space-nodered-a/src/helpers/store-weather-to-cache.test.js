const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { storeWeatherToCacheAsync } = require('./store-weather-to-cache');

const weather = {
    coord: { lat: 54.4342, lon: 50.8206 },
    weather: [{ id: 600, description: 'небольшой снег', icon: '13d' }],
    main: { temp: 0, feels_like: -4, pressure: 1008, humidity: 94 },
    visibility: 6500,
    wind: { speed: 5.2, deg: 160, gust: 9 },
    snow: { '1h': 0.4 },
    clouds: { all: 100 },
    dt: 1795077773,
    sys: { country: 'RU', sunrise: 1795062400, sunset: 1795091486 },
    timezone: 10800,
    cod: 200,
    additionalProviderField: { retained: true },
};

function setup() {
    const entries = new Map([
        ['device:35', 'device metadata'],
        ['deviceState:35', 'PLC state'],
    ]);
    const calls = [];
    const redis = {
        async set(key, value, options) {
            calls.push({ key, value, options });
            entries.set(key, { value, options });
            return 'OK';
        },
    };
    return { entries, calls, redis, global: { get: (name) => name === 'redisClient' ? redis : undefined } };
}

test('stores the complete response by location, with timestamps and an atomic TTL', async () => {
    const fixture = setup();
    const started = Date.now();
    const key = await storeWeatherToCacheAsync(fixture.global, 15, weather, 1800);
    assert.equal(key, 'weather:location:15');
    assert.equal(fixture.calls.length, 1);
    assert.deepEqual(fixture.calls[0].options, { EX: 5400 });
    const cached = JSON.parse(fixture.entries.get(key).value);
    assert.equal(cached.provider, 'openweather');
    assert.equal(cached.objectLocationId, 15);
    assert.equal(cached.units, 'metric');
    assert.equal(cached.observedAt, weather.dt * 1000);
    assert(cached.fetchedAt >= started && cached.fetchedAt <= Date.now());
    assert.deepEqual(cached.data, weather);
    assert.equal(fixture.entries.get('device:35'), 'device metadata');
    assert.equal(fixture.entries.get('deviceState:35'), 'PLC state');
});

test('keeps valid zero values and absent optional fields unchanged', async () => {
    const fixture = setup();
    const sparse = { cod: 200, dt: weather.dt, main: { temp: 0 } };
    await storeWeatherToCacheAsync(fixture.global, 15, sparse, 0.5);
    const cached = JSON.parse(fixture.calls[0].value);
    assert.deepEqual(cached.data, sparse);
    assert.equal(cached.data.wind, undefined);
    assert.deepEqual(fixture.calls[0].options, { EX: 2 });
});

test('rejects invalid location IDs and intervals before any Redis operation', async () => {
    const fixture = setup();
    for (const id of [undefined, null, 0, -1, 1.5, '15']) {
        await assert.rejects(storeWeatherToCacheAsync(fixture.global, id, weather, 1800));
    }
    for (const interval of [undefined, null, 0, -1, NaN, Infinity, '1800', 2147484]) {
        await assert.rejects(storeWeatherToCacheAsync(fixture.global, 15, weather, interval));
    }
    assert.equal(fixture.calls.length, 0);
});

test('invalid responses cannot replace a previous cache entry or refresh its TTL', async () => {
    const fixture = setup();
    await storeWeatherToCacheAsync(fixture.global, 15, weather, 1800);
    const previous = fixture.entries.get('weather:location:15');
    for (const invalid of [null, 'not JSON', { cod: 401 }, { ...weather, dt: 0 },
        { ...weather, main: { temp: null } }, { ...weather, main: { temp: Infinity } }]) {
        await assert.rejects(storeWeatherToCacheAsync(fixture.global, 15, invalid, 1800));
    }
    assert.equal(fixture.calls.length, 1);
    assert.strictEqual(fixture.entries.get('weather:location:15'), previous);
});

const nodes = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../flow-space-nodered-b/flows.json'), 'utf8'));
const weatherInstance = nodes.find((node) => node.name === 'nurlat-5-weather');
const subflow = nodes.find((node) => `subflow:${node.id}` === weatherInstance.type);
const inside = nodes.filter((node) => node.z === subflow.id);
const cacheNode = inside.find((node) => node.name === 'store-weather-to-cache');
const responseNode = inside.find((node) => node.name === 'weather-response');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const runCache = new AsyncFunction('msg', 'global', 'node', 'env', cacheNode.func);
const runResponse = new AsyncFunction('msg', 'global', 'node', 'env', responseNode.func);
const env = { get: (name) => name === 'INTERVAL' ? 1800 : undefined };

function subflowContext(fixture) {
    const warnings = [];
    const statuses = [];
    return {
        global: {
            get: (name) => name === 'helpers' ? { storeWeatherToCacheAsync } : fixture.global.get(name),
        },
        node: { status: (value) => statuses.push(value), warn: (value) => warnings.push(value) },
        warnings,
        statuses,
    };
}

test('subflow output and debug are reached only after the Redis write completes', async () => {
    const fixture = setup();
    const context = subflowContext(fixture);
    let completeWrite;
    fixture.redis.set = () => new Promise((resolve) => { completeWrite = resolve; });
    const incoming = { deviceCode: 'nurlat-5-boiler-room', objectLocationId: 15, payload: weather, statusCode: 200, url: 'private-request-url' };
    const clean = await runResponse(incoming, context.global, context.node, env);
    assert.equal(clean.url, undefined);
    let emitted = false;
    const pending = runCache(clean, context.global, context.node, env).then((result) => {
        emitted = true;
        return result;
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(emitted, false);
    completeWrite('OK');
    const result = await pending;
    assert.equal(result.weatherCacheKey, 'weather:location:15');
    assert.deepEqual(result.payload, weather);
    assert.deepEqual(context.warnings, []);
    assert.deepEqual(subflow.out[0].wires, [{ id: cacheNode.id, port: 0 }]);
    assert.deepEqual(responseNode.wires, [[cacheNode.id]]);
    const debug = inside.find((node) => node.name === 'current-weather');
    assert.deepEqual(cacheNode.wires, [[debug.id]]);
    assert(inside.find((node) => node.type === 'status').scope.includes(cacheNode.id));
});

test('failed Redis writes keep the previous result and produce no subflow output', async () => {
    const fixture = setup();
    await storeWeatherToCacheAsync(fixture.global, 15, weather, 1800);
    const previous = fixture.entries.get('weather:location:15');
    fixture.redis.set = async () => { throw new Error('private connection details'); };
    const context = subflowContext(fixture);
    const result = await runCache({ objectLocationId: 15, payload: weather }, context.global, context.node, env);
    assert.equal(result, null);
    assert.strictEqual(fixture.entries.get('weather:location:15'), previous);
    assert.deepEqual(context.warnings, ['Could not store OpenWeather data in Redis']);
    assert.equal(context.statuses.at(-1).text, 'weather cache failed');
});

test('HTTP failures and malformed weather stop before the cache writer', async () => {
    const fixture = setup();
    const context = subflowContext(fixture);
    for (const msg of [{ statusCode: 401, payload: weather }, { statusCode: 429, payload: weather },
        { statusCode: 200, payload: 'invalid JSON' }]) {
        assert.equal(await runResponse(msg, context.global, context.node, env), null);
    }
    assert.equal(fixture.calls.length, 0);
});
