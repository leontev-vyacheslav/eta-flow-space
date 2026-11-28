import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCache } from 'cache-manager';
import { FindOptions } from 'sequelize';
import { ObjectLocationDataModel } from '../../../database/models';
import { SharedStoreService } from '../shared-store/shared-store.service';
import { CachedWeatherForecast } from '../../../models/weather-forecast.model';
import { forecastCacheKey, WeatherForecastService } from './weather-forecast.service';

const MINUTE = 60_000;
const location = (id: number, latitude: unknown = '55.7887', longitude: unknown = '49.1221') => ({
    id,
    latitude,
    longitude,
    locality: 'г. Казань' as string | null,
});

const forecastFixture = (now: number) => ({
    cod: '200',
    message: 0,
    cnt: 40,
    list: Array.from({ length: 40 }, (_, index) => ({
        dt: Math.floor(now / 1000) + (index + 1) * 10_800,
        dt_txt: new Date(now + (index + 1) * 10_800_000).toISOString().slice(0, 19).replace('T', ' '),
        main: { temp: -3.2, pressure: 1017, humidity: 85 },
        weather: [{ id: 804, description: 'пасмурно', icon: '04n' }],
        wind: { speed: 4.2, deg: 240, gust: 7.1 },
        pop: 0.4,
        snow: { '3h': 0.2 },
    })),
    city: { id: 551487, name: 'Казань', timezone: 10800, coord: { lat: 55.7887, lon: 49.1221 } },
});

describe('WeatherForecastService', () => {
    let now: number;
    let slots: Set<string>;
    let rows: ReturnType<typeof location>[];
    let visibleRows: ReturnType<typeof location>[];
    let cache: ReturnType<typeof createCache>;
    let findAll: jest.MockedFunction<() => Promise<ReturnType<typeof location>[]>>;
    let findOne: jest.MockedFunction<(options: FindOptions) => Promise<ReturnType<typeof location> | null>>;
    let claimJobSlot: jest.Mock;
    let fetchMock: jest.SpiedFunction<typeof fetch>;
    let warn: jest.SpyInstance;
    let service: WeatherForecastService;
    let payload: ReturnType<typeof forecastFixture>;

    const makeService = (settings: Record<string, string | undefined> = {}) =>
        new WeatherForecastService(
            { findAll, findOne } as unknown as typeof ObjectLocationDataModel,
            cache,
            { claimJobSlot } as unknown as SharedStoreService,
            new ConfigService({ OPENWEATHER_API_KEY: 'private-test-key', WEATHER_FORECAST_ENABLED: 'true', ...settings }),
        );

    beforeEach(() => {
        now = Date.parse('2026-11-27T10:00:00Z');
        slots = new Set();
        jest.spyOn(Date, 'now').mockImplementation(() => now);
        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
        warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        rows = [location(1), location(2, '54.4342', '50.8206')];
        visibleRows = rows;
        findAll = jest.fn().mockImplementation(() => Promise.resolve(rows));
        findOne = jest.fn().mockImplementation((options: FindOptions) => {
            const objectId = (options.where as { id: number }).id;
            return Promise.resolve(visibleRows.find((item) => item.id === objectId) ?? null);
        });
        cache = createCache();
        claimJobSlot = jest.fn().mockImplementation((jobName: string) => {
            if (slots.has(jobName)) {
                return Promise.resolve(false);
            }
            slots.add(jobName);
            return Promise.resolve(true);
        });
        payload = forecastFixture(now);
        fetchMock = jest.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve(new Response(JSON.stringify(payload), { status: 200 })));
        service = makeService();
    });

    afterEach(async () => {
        await cache.disconnect();
        jest.restoreAllMocks();
    });

    it('fetches only one location per tick and permanently stores the complete response with an hourly refresh time', async () => {
        const set = jest.spyOn(cache, 'set');
        await service.collectNextForecast();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const url = fetchMock.mock.calls[0][0] as URL;
        expect(url.origin + url.pathname).toBe('https://api.openweathermap.org/data/2.5/forecast');
        expect(Object.fromEntries(url.searchParams)).toEqual({ lat: '55.7887', lon: '49.1221', appid: 'private-test-key', units: 'metric', lang: 'ru' });
        expect(fetchMock.mock.calls[0][1]).toMatchObject({ signal: expect.any(AbortSignal) as AbortSignal, redirect: 'error' });
        expect(await cache.get(forecastCacheKey(2))).toBeUndefined();
        const cached = await cache.get<CachedWeatherForecast>(forecastCacheKey(1));
        expect(forecastCacheKey(1)).toBe('weather:forecast:location:1');
        expect(cached).toEqual({ objectLocationId: 1, fetchedAt: '2026-11-27T10:00:00.000Z', data: payload });
        expect(set).toHaveBeenCalledWith(forecastCacheKey(1), cached, 0);
        expect(await cache.ttl(forecastCacheKey(1))).toBeUndefined();
    });

    it('shares the minute slot across replicas and a restarted API', async () => {
        await Promise.all([service.collectNextForecast(), makeService().collectNextForecast()]);
        await makeService().collectNextForecast();
        expect(fetchMock).toHaveBeenCalledTimes(1);
        now += MINUTE;
        await makeService().collectNextForecast();
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(await cache.get(forecastCacheKey(2))).toBeDefined();
    });

    it('uses one calendar-minute claim despite scheduler jitter and restarts', async () => {
        now += 300;
        await service.collectNextForecast();
        now += MINUTE - 100;
        await service.collectNextForecast();
        await makeService().collectNextForecast();
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(claimJobSlot.mock.calls[0]).toEqual([`weather-forecast:${Math.floor(Date.parse('2026-11-27T10:00:00Z') / MINUTE)}`, 120]);
    });

    it('idles while forecasts are fresh and refreshes the oldest due location after one hour', async () => {
        await service.collectNextForecast();
        now += MINUTE;
        await service.collectNextForecast();
        now += MINUTE;
        await service.collectNextForecast();
        expect(fetchMock).toHaveBeenCalledTimes(2);
        now += 58 * MINUTE;
        await service.collectNextForecast();
        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect((await cache.get<CachedWeatherForecast>(forecastCacheKey(1)))?.fetchedAt).toBe(new Date(now).toISOString());
    });

    it('stores separate forecasts for locations with the same locality name, using the coordinates of each location', async () => {
        rows = [location(1), location(2, '55.8', '49.2')];
        await service.collectNextForecast();
        now += MINUTE;
        await service.collectNextForecast();
        expect(fetchMock).toHaveBeenCalledTimes(2);
        const secondUrl = fetchMock.mock.calls[1][0] as URL;
        expect(secondUrl.searchParams.get('lat')).toBe('55.8');
        expect(secondUrl.searchParams.get('lon')).toBe('49.2');
        expect(await cache.get(forecastCacheKey(1))).toMatchObject({ objectLocationId: 1, data: payload });
        expect(await cache.get(forecastCacheKey(2))).toMatchObject({ objectLocationId: 2, data: payload });
    });

    it('accepts zero coordinates instead of treating them as unset', async () => {
        rows = [location(1, '0', 0)];
        await service.collectNextForecast();
        const url = fetchMock.mock.calls[0][0] as URL;
        expect(url.searchParams.get('lat')).toBe('0');
        expect(url.searchParams.get('lon')).toBe('0');
    });

    it('does not let one failed location starve the others or leak the API key in logs', async () => {
        fetchMock.mockRejectedValueOnce(new Error('https://example.test/?appid=private-test-key'));
        await service.collectNextForecast();
        now += MINUTE;
        await service.collectNextForecast();
        expect(await cache.get(forecastCacheKey(1))).toBeUndefined();
        expect(await cache.get(forecastCacheKey(2))).toBeDefined();
        now += MINUTE;
        await service.collectNextForecast();
        expect(fetchMock).toHaveBeenCalledTimes(2);
        now += 8 * MINUTE;
        await service.collectNextForecast();
        expect(await cache.get(forecastCacheKey(1))).toBeDefined();
        expect(JSON.stringify(warn.mock.calls)).not.toContain('private-test-key');
    });

    it('keeps the previous result permanently on failure and marks it stale until a successful refresh', async () => {
        rows = [location(1)];
        visibleRows = rows;
        await service.collectNextForecast();
        const previous = await cache.get(forecastCacheKey(1));
        now += 60 * MINUTE;
        fetchMock.mockRejectedValueOnce(new Error('Timed out'));
        await service.collectNextForecast();
        expect(await cache.get(forecastCacheKey(1))).toEqual(previous);
        expect(await cache.ttl(forecastCacheKey(1))).toBeUndefined();
        expect(await service.getForecast(7, 1)).toMatchObject({ objectLocationId: 1, stale: true, fetchedAt: '2026-11-27T10:00:00.000Z' });
        now += 10 * MINUTE;
        await service.collectNextForecast();
        expect(await service.getForecast(7, 1)).toMatchObject({ objectLocationId: 1, stale: false, fetchedAt: new Date(now).toISOString() });
    });

    it('retains and serves the last snapshot as stale during a prolonged outage', async () => {
        await service.collectNextForecast();
        now += 6 * 24 * 60 * MINUTE;
        expect(await cache.get(forecastCacheKey(1))).toBeDefined();
        expect(await service.getForecast(7, 1)).toMatchObject({ objectLocationId: 1, stale: true, data: payload });
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('warms 50 object locations sequentially with an independent cache entry for each ID', async () => {
        rows = Array.from({ length: 50 }, (_, index) => location(index + 1));
        for (let index = 0; index < rows.length; index++) {
            await service.collectNextForecast();
            now += MINUTE;
        }
        expect(fetchMock).toHaveBeenCalledTimes(50);
        const entries = await cache.mget(rows.map((item) => forecastCacheKey(item.id)));
        expect(entries.every((entry) => entry !== undefined)).toBe(true);
    });

    it.each([
        ['empty forecast', { cod: '200', cnt: 0, list: [], city: { timezone: 10800 } }],
        ['current weather instead of forecast', { cod: 200, main: { temp: -3 } }],
        ['provider error', { cod: '401', message: 'Invalid key' }],
        ['malformed periods', { cod: '200', cnt: 1, list: [null], city: { timezone: 10800 } }],
        ['past-only forecast', forecastFixture(Date.parse('2026-11-01T00:00:00Z'))],
    ])('does not cache a 200 response containing %s', async (_label, invalidPayload) => {
        fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(invalidPayload), { status: 200 }));
        await service.collectNextForecast();
        expect(await cache.get(forecastCacheKey(1))).toBeUndefined();
    });

    it.each([
        ['1800', 30],
        ['Fri, 27 Nov 2026 10:30:00 GMT', 30],
        ['invalid', 10],
    ])('backs off the entire provider after 429 with Retry-After=%s', async (retryAfter, minutes) => {
        fetchMock.mockResolvedValueOnce(new Response('{}', { status: 429, headers: { 'Retry-After': retryAfter } }));
        await service.collectNextForecast();
        now += (minutes - 1) * MINUTE;
        await makeService().collectNextForecast();
        expect(fetchMock).toHaveBeenCalledTimes(1);
        now += MINUTE;
        await makeService().collectNextForecast();
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it.each([401, 403])('backs off all locations for one hour after HTTP %s', async (status) => {
        fetchMock.mockResolvedValueOnce(new Response('{}', { status }));
        await service.collectNextForecast();
        now += 59 * MINUTE;
        await service.collectNextForecast();
        expect(fetchMock).toHaveBeenCalledTimes(1);
        now += MINUTE;
        await service.collectNextForecast();
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('fails closed when Redis coordination is unavailable', async () => {
        claimJobSlot.mockRejectedValueOnce(new Error('Redis is unavailable'));
        await expect(service.collectNextForecast()).resolves.toBeUndefined();
        expect(fetchMock).not.toHaveBeenCalled();
        expect(findAll).not.toHaveBeenCalled();
    });

    it('skips a tick whose database work outlasted its polling slot', async () => {
        findAll.mockImplementationOnce(() => {
            now += 61_000;
            return Promise.resolve(rows);
        });
        await service.collectNextForecast();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('skips an old tick that crosses a minute boundary during slow database work', async () => {
        now += 59_000;
        findAll.mockImplementationOnce(() => {
            now += 2_000;
            return Promise.resolve(rows);
        });
        await service.collectNextForecast();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('keeps the forecast available by ID after coordinates change, then uses the new coordinates on its hourly update', async () => {
        await service.collectNextForecast();
        const previous = await service.getForecast(7, 1);
        rows[0] = location(1, '56', '49');
        visibleRows = rows;
        expect(await service.getForecast(7, 1)).toEqual(previous);
        now += 60 * MINUTE;
        await service.collectNextForecast();
        // An unattempted location gets its turn first, then the changed location is refreshed.
        now += MINUTE;
        await service.collectNextForecast();
        const updatedUrl = fetchMock.mock.calls[2][0] as URL;
        expect(updatedUrl.searchParams.get('lat')).toBe('56');
        expect(updatedUrl.searchParams.get('lon')).toBe('49');
        expect((await service.getForecast(7, 1))?.fetchedAt).toBe(new Date(now).toISOString());
    });

    it('reads only the requested location and its cache entry after checking access', async () => {
        await service.collectNextForecast();
        visibleRows = [rows[0]];
        expect(await service.getForecast(7, 1)).toMatchObject({ objectLocationId: 1, data: payload });
        expect(await service.getForecast(7, 2)).toBeUndefined();
        expect(await service.getForecast(7, 999)).toBeUndefined();
        expect(findOne.mock.calls[0][0]).toMatchObject({
            attributes: ['id'],
            where: { id: 1 },
            include: [{ required: true, include: [{ where: { userId: 7 }, required: true }] }],
        });
        expect(findAll).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not serve a cached forecast belonging to another object-location ID', async () => {
        await service.collectNextForecast();
        const entry = await cache.get<CachedWeatherForecast>(forecastCacheKey(1));
        await cache.set(forecastCacheKey(1), { ...entry, objectLocationId: 2 }, 0);
        expect(await service.getForecast(7, 1)).toBeNull();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('collects and serves a location with no locality name', async () => {
        rows = [location(1)];
        rows[0].locality = null;
        visibleRows = rows;
        await service.collectNextForecast();
        expect(await service.getForecast(7, 1)).toMatchObject({ objectLocationId: 1, data: payload });
        rows[0].locality = 'Переименовано';
        expect(await service.getForecast(7, 1)).toMatchObject({ objectLocationId: 1, data: payload });
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it.each([undefined, null, 0, -1, 1.5, NaN])('rejects invalid object IDs (%s) before reading registrations', async (objectId) => {
        expect(await service.getForecast(7, objectId as number)).toBeUndefined();
        expect(findAll).not.toHaveBeenCalled();
        expect(findOne).not.toHaveBeenCalled();
    });

    it.each([undefined, null, 0, -1, NaN])('does not interpret an invalid user ID (%s) as unrestricted access', async (userId) => {
        expect(await service.getForecast(userId as number, 1)).toBeUndefined();
        expect(findAll).not.toHaveBeenCalled();
        expect(findOne).not.toHaveBeenCalled();
    });

    it.each([{ WEATHER_FORECAST_ENABLED: 'false' }, { WEATHER_FORECAST_ENABLED: '' }, { OPENWEATHER_API_KEY: '' }])(
        'does not poll without explicit enablement and a key (%j)',
        async (settings) => {
            await makeService(settings).collectNextForecast();
            expect(claimJobSlot).not.toHaveBeenCalled();
            expect(fetchMock).not.toHaveBeenCalled();
        },
    );
});
