import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getKeyValuePairs, getSchemaTypeInfo } from '../src/helpers/data-helper.ts';

test('nested weather and array values retain their full property paths', () => {
    const pairs = getKeyValuePairs({
        weather: { temp: 0, wind: { speed: 0, deg: null, gust: 10.77 } },
        boilers: [{ isWorking: false, sensors: { temperature: 40 }, inputs: [{ value: 2 }] }],
    });
    assert.deepEqual(pairs, [
        { propertiesChain: 'weather.temp', value: 0, arrayIndex: undefined },
        { propertiesChain: 'weather.wind.speed', value: 0, arrayIndex: undefined },
        { propertiesChain: 'weather.wind.deg', value: null, arrayIndex: undefined },
        { propertiesChain: 'weather.wind.gust', value: 10.77, arrayIndex: undefined },
        { propertiesChain: 'boilers[0].isWorking', value: false, arrayIndex: 0 },
        { propertiesChain: 'boilers[0].sensors.temperature', value: 40, arrayIndex: 0 },
        { propertiesChain: 'boilers[0].inputs[0].value', value: 2, arrayIndex: 0 },
    ]);
});

test('weather paths resolve schema labels and units without adding visible form editors', () => {
    const schema = JSON.parse(readFileSync(new URL('../../flow-space-statics/devices/nurlat-5-boiler-room/data-schema.json', import.meta.url), 'utf8'));
    for (const [field, unit] of Object.entries({ temp: '°C', pressure: 'гПа', humidity: '%', 'wind.speed': 'м/с', 'wind.deg': '°', 'wind.gust': 'м/с' })) {
        const info = getSchemaTypeInfo(`weather.${field}`, schema);
        assert.equal(info?.typeName, 'number');
        assert.equal(info?.unit, unit);
        assert(info?.ui.editor.label.text);
        assert.equal(info?.ui.editor.visible, false);
    }
    assert(!schema.required.includes('weather'));
    assert.deepEqual(getKeyValuePairs({ isConnected: true }), [{ propertiesChain: 'isConnected', value: true, arrayIndex: undefined }]);
});
