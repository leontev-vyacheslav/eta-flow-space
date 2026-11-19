/**
 * Cache the complete metric OpenWeather response separately from PLC deviceState.
 * observedAt/fetchedAt are epoch milliseconds; provider fields in data stay unchanged.
 * Keep the last successful result for three polling intervals. Failed requests must
 * not call this helper, so they neither replace the result nor extend its TTL.
 */
async function storeWeatherToCacheAsync(global, objectLocationId, weather, interval) {
    if (!Number.isInteger(objectLocationId) || objectLocationId <= 0) {
        throw new Error('Weather cache requires a positive objectLocationId');
    }
    if (!Number.isFinite(interval) || interval <= 0 || interval > 2147483) {
        throw new Error('Weather cache requires a valid polling interval in seconds');
    }
    if (weather?.cod !== 200 || typeof weather?.main?.temp !== 'number' ||
        !Number.isFinite(weather.main.temp) || !Number.isFinite(weather?.dt) || weather.dt <= 0) {
        throw new Error('Weather cache requires a successful OpenWeather response');
    }

    const cacheKey = `weather:location:${objectLocationId}`;
    const cachedWeather = {
        provider: 'openweather',
        objectLocationId,
        units: 'metric',
        observedAt: weather.dt * 1000,
        fetchedAt: Date.now(),
        data: weather,
    };

    await global.get('redisClient').set(
        cacheKey,
        JSON.stringify(cachedWeather),
        { EX: Math.ceil(interval * 3) }
    );
    return cacheKey;
}

module.exports = { storeWeatherToCacheAsync };
