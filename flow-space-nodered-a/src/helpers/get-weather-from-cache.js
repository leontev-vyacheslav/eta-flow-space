const { getDeviceFromCacheAsync } = require('./get-device-from-cache');

/**
 * Read the current, unexpired metric weather response for a device's location.
 * Missing/malformed entries return undefined. Redis errors propagate so a collector
 * can warn and continue storing its PLC measurements without optional weather.
 */
async function getWeatherFromCacheAsync(global, deviceCode, flowUid) {
    const device = await getDeviceFromCacheAsync(global, deviceCode);
    if (!device || (flowUid !== undefined && device.flow?.uid !== flowUid) ||
        !Number.isInteger(device.objectLocationId) || device.objectLocationId <= 0) {
        return undefined;
    }

    const raw = await global.get('redisClient').get(`weather:location:${device.objectLocationId}`);
    if (!raw) {
        return undefined;
    }

    let cached;
    try {
        cached = JSON.parse(raw);
    } catch (error) {
        return undefined;
    }
    if (cached?.provider !== 'openweather' || cached.units !== 'metric' ||
        cached.objectLocationId !== device.objectLocationId || cached.data?.cod !== 200 ||
        typeof cached.data?.main?.temp !== 'number' || !Number.isFinite(cached.data.main.temp)) {
        return undefined;
    }

    return cached.data;
}

module.exports = { getWeatherFromCacheAsync };
