const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { getWeatherFromCacheAsync } = require('./get-weather-from-cache');

const root = path.resolve(__dirname, '../../..');
const code = 'nurlat-5-boiler-room';
const flowUid = '93dc403dd0a3e7b1';
const provider = {
    cod: 200,
    dt: 1795077773,
    main: { temp: 0, pressure: 1008, humidity: 94, feels_like: -4 },
    wind: { speed: 0, deg: 0, gust: 12.47 },
    clouds: { all: 100 },
    snow: { '1h': 0.4 },
};

function setup(deviceCode = code, tabUid = flowUid) {
    const device = { id: 35, code: deviceCode, flow: { uid: tabUid }, objectLocationId: 15 };
    const cached = { provider: 'openweather', objectLocationId: 15, units: 'metric', data: provider };
    const entries = new Map([
        ['device:35', JSON.stringify(device)],
        ['weather:location:15', JSON.stringify(cached)],
    ]);
    const reads = [];
    const stored = [];
    const warnings = [];
    const redis = {
        async sMembers(key) {
            assert.equal(key, 'device:ids');
            return ['35'];
        },
        multi() {
            const keys = [];
            return {
                get(key) { keys.push(key); return this; },
                async exec() { return keys.map((key) => entries.get(key) ?? null); },
            };
        },
        async get(key) {
            reads.push(key);
            return entries.get(key) ?? null;
        },
    };
    const global = {
        get: (name) => name === 'redisClient' ? redis : name === 'helpers' ? {
            getWeatherFromCacheAsync,
            storeDeviceStateToCacheAsync: async (...args) => stored.push(args),
        } : undefined,
    };
    return { device, cached, entries, reads, redis, stored, warnings, global };
}

const flows = JSON.parse(fs.readFileSync(path.join(root, 'flow-space-nodered-b/flows.json'), 'utf8'));
const collector = flows.find((node) => node.z === flowUid && node.name === 'collect-device-state');
const sourceMap = JSON.parse(fs.readFileSync(path.join(root, 'flow-space-statics/devices/nurlat-5-boiler-room/source-map.json'), 'utf8'));
const payload = Object.fromEntries(sourceMap.parameters.map((parameter) => [parameter.name, parameter.type === 'BOOL' ? false : 0]));
payload.ip_TE1_PV_Out = 23.5;
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const collect = new AsyncFunction('msg', 'global', 'node', collector.func);
const run = (fixture) => collect({ payload }, fixture.global, {
    path: `${flowUid}/${collector.id}`,
    warn: (message) => fixture.warnings.push(message),
});
const Ajv2020 = require(path.join(root, 'flow-space-ui/node_modules/ajv/dist/2020')).default;
const schema = JSON.parse(fs.readFileSync(path.join(root, 'flow-space-statics/devices/nurlat-5-boiler-room/data-schema.json'), 'utf8'));
const validate = new Ajv2020({ strict: false, allErrors: true }).compile(schema);
function validateState(state) {
    assert(validate({ isConnected: true, ...state }), JSON.stringify(validate.errors));
}

test('resolves the device location and returns the complete cached provider data', async () => {
    const fixture = setup();
    assert.deepEqual(await getWeatherFromCacheAsync(fixture.global, code, flowUid), provider);
    assert.deepEqual(fixture.reads, ['weather:location:15']);
});

test('unknown devices, wrong tabs and unset locations perform no weather read', async () => {
    const fixture = setup();
    assert.equal(await getWeatherFromCacheAsync(fixture.global, 'unknown', flowUid), undefined);
    assert.equal(await getWeatherFromCacheAsync(fixture.global, code, 'another-tab'), undefined);
    for (const id of [null, undefined, 0, '15']) {
        fixture.entries.set('device:35', JSON.stringify({ ...fixture.device, objectLocationId: id }));
        assert.equal(await getWeatherFromCacheAsync(fixture.global, code, flowUid), undefined);
    }
    assert.deepEqual(fixture.reads, []);
});

test('missing/expired, malformed, wrong-location and non-metric entries are absent', async () => {
    const fixture = setup();
    const invalid = [null, 'not JSON', 'null', JSON.stringify({ ...fixture.cached, units: 'imperial' }),
        JSON.stringify({ ...fixture.cached, provider: 'unknown' }),
        JSON.stringify({ ...fixture.cached, objectLocationId: 16 }),
        JSON.stringify({ ...fixture.cached, data: { cod: 401 } }),
        JSON.stringify({ ...fixture.cached, data: { ...provider, main: { temp: '0' } } })];
    for (const entry of invalid) {
        if (entry === null) {
            fixture.entries.delete('weather:location:15');
        } else {
            fixture.entries.set('weather:location:15', entry);
        }
        assert.equal(await getWeatherFromCacheAsync(fixture.global, code, flowUid), undefined);
    }
});

test('collector copies only selected fields before awaited persistence, preserving valid zeros', async () => {
    const fixture = setup();
    const out = await run(fixture);
    assert.deepEqual(out.deviceState.weather, {
        temp: 0, pressure: 1008, humidity: 94, wind: { speed: 0, deg: 0, gust: 12.47 },
    });
    assert.equal(out.deviceState.tempOutAir, 23.5);
    assert.equal(fixture.stored.length, 1);
    assert.equal(fixture.stored[0][1], code);
    assert.equal(fixture.stored[0][3], flowUid);
    assert.strictEqual(fixture.stored[0][2], out.deviceState);
    assert.deepEqual(fixture.warnings, []);
    validateState(out.deviceState);
});

test('Nurlat-5 copies description and icon from the first weather condition', async () => {
    const fixture = setup();
    const data = { ...provider, weather: [
        { id: 804, main: 'Clouds', description: 'пасмурно', icon: '04d' },
        { id: 500, description: 'небольшой дождь', icon: '10n' },
    ] };
    fixture.entries.set('weather:location:15', JSON.stringify({ ...fixture.cached, data }));
    const state = (await run(fixture)).deviceState;
    assert.equal(state.weather.description, 'пасмурно');
    assert.equal(state.weather.icon, '04d');
    assert.equal(state.weather.temp, 0);
    assert.equal(state.tempOutAir, 23.5);
    assert(!Object.hasOwn(state.weather, 'main'));
    assert(!Object.hasOwn(state.weather, 'id'));
    assert.deepEqual(fixture.stored[0][2].weather, state.weather);
    validateState(state);
});

test('Nurlat-5 keeps malformed or missing condition metadata optional', async () => {
    const fixture = setup();
    for (const weather of [undefined, null, {}, [], [null], ['Clouds'], [{ description: 42, icon: false }], [{ description: ' ', icon: '' }]]) {
        fixture.entries.set('weather:location:15', JSON.stringify({ ...fixture.cached, data: { ...provider, weather } }));
        const state = (await run(fixture)).deviceState;
        assert(!Object.hasOwn(state.weather, 'description'));
        assert(!Object.hasOwn(state.weather, 'icon'));
        assert.equal(state.weather.temp, 0);
        validateState(state);
    }
    fixture.entries.set('weather:location:15', JSON.stringify({ ...fixture.cached, data: { ...provider, weather: [{ description: 'пасмурно' }] } }));
    const state = (await run(fixture)).deviceState;
    assert.equal(state.weather.description, 'пасмурно');
    assert(!Object.hasOwn(state.weather, 'icon'));
    validateState(state);
});

test('each poll rereads weather and omits it after cache expiry without changing PLC fields', async () => {
    const fixture = setup();
    const first = (await run(fixture)).deviceState;
    const updated = { ...provider, main: { ...provider.main, temp: -5 } };
    fixture.entries.set('weather:location:15', JSON.stringify({ ...fixture.cached, data: updated }));
    const second = (await run(fixture)).deviceState;
    assert.equal(second.weather.temp, -5);
    fixture.entries.delete('weather:location:15');
    const third = (await run(fixture)).deviceState;
    assert(!Object.hasOwn(third, 'weather'));
    assert.equal(fixture.reads.length, 3);
    assert.equal(fixture.stored.length, 3);
    for (const state of [first, second, third]) {
        validateState(state);
    }
    const plcOnly = (state) => Object.fromEntries(Object.entries(state).filter(([key]) => !['weather', 'timestamp'].includes(key)));
    assert.deepEqual(plcOnly(first), plcOnly(third));
    assert.deepEqual(plcOnly(second), plcOnly(third));
});

test('missing optional fields stay absent or null rather than becoming zero', async () => {
    const fixture = setup();
    fixture.entries.set('weather:location:15', JSON.stringify({ ...fixture.cached, data: { cod: 200, main: { temp: 0 } } }));
    const sparse = (await run(fixture)).deviceState;
    assert.deepEqual(sparse.weather, { temp: 0, pressure: null, humidity: null });
    validateState(sparse);
    fixture.entries.set('weather:location:15', JSON.stringify({ ...fixture.cached, data: { ...provider, wind: { speed: null, deg: 0 } } }));
    const wind = (await run(fixture)).deviceState;
    assert.deepEqual(wind.weather.wind, { speed: null, deg: 0 });
    validateState(wind);
});

test('weather Redis read errors do not block PLC state storage', async () => {
    const fixture = setup();
    fixture.redis.get = async () => { throw new Error('private connection details'); };
    const state = (await run(fixture)).deviceState;
    assert(!Object.hasOwn(state, 'weather'));
    assert.equal(fixture.stored.length, 1);
    assert.deepEqual(fixture.warnings, ['Weather cache unavailable; storing PLC state without weather']);
    validateState(state);
});

test('location changes use the new cache key on the next poll', async () => {
    const fixture = setup();
    await run(fixture);
    fixture.entries.set('device:35', JSON.stringify({ ...fixture.device, objectLocationId: 16 }));
    fixture.entries.set('weather:location:16', JSON.stringify({ ...fixture.cached, objectLocationId: 16, data: { ...provider, main: { ...provider.main, temp: -8 } } }));
    assert.equal((await run(fixture)).deviceState.weather.temp, -8);
    assert.deepEqual(fixture.reads, ['weather:location:15', 'weather:location:16']);
});

test('schema allows historical states without weather and rejects extra weather fields', async () => {
    const fixture = setup();
    const state = (await run(fixture)).deviceState;
    delete state.weather;
    validateState(state);
    assert.equal(validate({ isConnected: true, ...state, weather: { temp: 0, pressure: 1000, humidity: 80, feels_like: -5 } }), false);
});

for (const tab of flows.filter((node) => node.type === 'tab' && node.label.endsWith('-boiler-room'))) {
    test(`${tab.label}: independent weather timer and optional per-poll state enrichment`, async () => {
        const instances = flows.filter((node) => node.z === tab.id && node.type === 'subflow:00a0617d2752349c');
        assert.equal(instances.length, 1);
        assert.deepEqual(instances[0].env, [
            { name: 'INTERVAL', value: '1800', type: 'num' },
            { name: 'DEVICE_CODE', value: tab.label, type: 'str' },
        ]);
        const mapping = flows.find((node) => node.z === tab.id && node.name === 'collect-device-state');
        const collect = new AsyncFunction('msg', 'global', 'node', mapping.func);
        // Complete synthetic decoded poll: zeros plus a distinct controller outdoor reading.
        const values = tab.label === code ? { ...payload } : Object.fromEntries(
            [...mapping.func.matchAll(/payload\.(\w+)/g)].map((match) => [match[1], 0]),
        );
        if (tab.label !== code) {
            values.t_air = 23.5;
        }
        const fixture = setup(tab.label, tab.id);
        fixture.entries.set('weather:location:15', JSON.stringify({ ...fixture.cached, data: {
            ...provider, weather: [
                { description: 'пасмурно', icon: '04d', main: 'Clouds', id: 804 },
                { description: 'небольшой дождь', icon: '10n' },
            ],
        } }));
        const run = () => collect({ payload: values }, fixture.global, {
            path: `${tab.id}/${mapping.id}`, warn: (message) => fixture.warnings.push(message),
        });
        const siteSchema = JSON.parse(fs.readFileSync(path.join(root, 'flow-space-statics/devices', tab.label, 'data-schema.json'), 'utf8'));
        const valid = new Ajv2020({ strict: false, allErrors: true }).compile(siteSchema);
        const check = (state) => assert(valid({ isConnected: true, ...state }), JSON.stringify(valid.errors));
        const first = (await run()).deviceState;
        assert.deepEqual(first.weather, { description: 'пасмурно', icon: '04d', temp: 0, pressure: 1008, humidity: 94, wind: { speed: 0, deg: 0, gust: 12.47 } });
        assert.equal(first.tempOutAir, 23.5);
        check(first);
        fixture.entries.set('weather:location:15', JSON.stringify({ ...fixture.cached, data: { ...provider, weather: [{ description: 42, icon: false }], main: { temp: -5 }, wind: { speed: null, deg: 0 } } }));
        const partial = (await run()).deviceState;
        assert.deepEqual(partial.weather, { temp: -5, pressure: null, humidity: null, wind: { speed: null, deg: 0 } });
        check(partial);
        fixture.entries.delete('weather:location:15');
        const expired = (await run()).deviceState;
        assert(!Object.hasOwn(expired, 'weather'));
        check(expired);
        fixture.redis.get = async () => { throw new Error('private connection details'); };
        const failed = (await run()).deviceState;
        assert(!Object.hasOwn(failed, 'weather'));
        check(failed);
        const plcOnly = ({ weather, timestamp, ...state }) => state;
        for (const state of [partial, expired, failed]) {
            assert.deepEqual(plcOnly(first), plcOnly(state));
        }
        assert.equal(fixture.stored.length, 4);
        for (const call of fixture.stored) {
            assert.equal(call[1], tab.label);
            assert.equal(call[3], tab.id);
        }
        assert.equal(fixture.reads.length, 3);
        assert.deepEqual(fixture.warnings, ['Weather cache unavailable; storing PLC state without weather']);
    });
}

const instanceA = JSON.parse(fs.readFileSync(path.join(root, 'flow-space-nodered-a/flows.json'), 'utf8'));
for (const siteCode of ['spring1-boiler-room', 'spring2-boiler-room']) {
    test(`${siteCode}: cached weather enriches only the controller and survives weather failures`, async () => {
        const tab = instanceA.find((node) => node.type === 'tab' && node.label === siteCode);
        const mapping = instanceA.find((node) => node.z === tab.id && node.name === 'collect-device-state'
            && node.func.includes(`const DEVICE_CODE = '${siteCode}';`));
        const instances = instanceA.filter((node) => node.z === tab.id && node.type === 'subflow:00a0617d2752349c');
        assert.equal(instances.length, 1);
        assert.deepEqual(instances[0].env, [
            { name: 'INTERVAL', value: '1800', type: 'num' },
            { name: 'DEVICE_CODE', value: siteCode, type: 'str' },
        ]);
        for (const node of flows.filter((node) => node.id === '00a0617d2752349c' || node.z === '00a0617d2752349c')) {
            assert.deepEqual(instanceA.find((candidate) => candidate.id === node.id), node);
        }
        const collect = new AsyncFunction('msg', 'global', 'node', mapping.func);
        const fixture = setup(siteCode, tab.id);
        fixture.entries.set('weather:location:15', JSON.stringify({ ...fixture.cached, data: {
            ...provider, weather: [{ description: 'пасмурно', icon: '04d' }, { description: 'ясно', icon: '01n' }],
        } }));
        const siteSchema = JSON.parse(fs.readFileSync(path.join(root, 'flow-space-statics/devices', siteCode, 'data-schema.json'), 'utf8'));
        const validWeather = new Ajv2020({ strict: false }).compile({ $ref: '#/$defs/WeatherModel', $defs: siteSchema.$defs });
        const run = async () => {
            const msg = { payload: { tempOutAir: 23.5, TE11: 23.5 } };
            await collect(msg, fixture.global, { path: `${tab.id}/${mapping.id}`, warn: (message) => fixture.warnings.push(message) });
            return fixture.stored.at(-1)[2];
        };
        const full = await run();
        assert.deepEqual(full.weather, { description: 'пасмурно', icon: '04d', temp: 0, pressure: 1008, humidity: 94, wind: { speed: 0, deg: 0, gust: 12.47 } });
        assert.equal(full.tempOutAir, 23.5);
        assert(validWeather(full.weather), JSON.stringify(validWeather.errors));
        fixture.entries.set('weather:location:15', JSON.stringify({ ...fixture.cached, data: { cod: 200, main: { temp: -5 } } }));
        const partial = await run();
        assert.deepEqual(partial.weather, { temp: -5, pressure: null, humidity: null });
        assert(validWeather(partial.weather), JSON.stringify(validWeather.errors));
        fixture.entries.delete('weather:location:15');
        const expired = await run();
        assert(!Object.hasOwn(expired, 'weather'));
        fixture.redis.get = async () => { throw new Error('private connection details'); };
        const failed = await run();
        assert(!Object.hasOwn(failed, 'weather'));
        const plcOnly = ({ weather, timestamp, ...state }) => state;
        for (const state of [partial, expired, failed]) {
            assert.deepEqual(plcOnly(full), plcOnly(state));
        }
        assert.equal(fixture.stored.length, 4);
        assert.equal(fixture.reads.length, 3);
        for (const call of fixture.stored) {
            assert.equal(call[1], siteCode);
            assert.equal(call[3], tab.id);
        }
        assert.deepEqual(fixture.warnings, ['Weather cache unavailable; storing PLC state without weather']);
        for (const meter of instanceA.filter((node) => node.z === tab.id && node.name === 'collect-device-state' && node.id !== mapping.id)) {
            assert(!meter.func.includes('getWeatherFromCacheAsync'));
        }
    });
}
