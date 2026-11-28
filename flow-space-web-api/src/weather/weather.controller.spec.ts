import { INestApplication } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { getModelToken } from '@nestjs/sequelize';
import { Test } from '@nestjs/testing';
import { createCache } from 'cache-manager';
import { I18nService } from 'nestjs-i18n';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { SharedStoreService } from '../common/services/shared-store/shared-store.service';
import { ObjectLocationDataModel } from '../database/models';
import { WeatherForecastResponse } from '../models/weather-forecast.model';
import { WeatherForecastService } from '../common/services/weather-forecast/weather-forecast.service';
import { WeatherController } from './weather.controller';

describe('Weather HTTP endpoints', () => {
    let app: INestApplication<App>;
    let cache: ReturnType<typeof createCache>;
    let token: string;
    let jwt: JwtService;
    let service: WeatherForecastService;
    let fetchMock: jest.SpiedFunction<typeof fetch>;

    const locality = 'г. Казань';
    const payload = {
        cod: '200',
        cnt: 1,
        list: [{ dt: Math.floor(Date.now() / 1000) + 10_800, dt_txt: 'forecast time', main: { temp: -3.2 }, snow: { '3h': 0.2 } }],
        city: { name: 'Казань', timezone: 10800 },
    };

    beforeAll(async () => {
        cache = createCache();
        const rows = [
            { id: 1, locality, latitude: '55.7887', longitude: '49.1221' },
            { id: 2, locality: 'г. Нурлат', latitude: '54.4342', longitude: '50.8206' },
            { id: 3, locality, latitude: '55.80', longitude: '49.13' },
            { id: 4, locality, latitude: '55.81', longitude: '49.14' },
            { id: 5, locality: null, latitude: '55.82', longitude: '49.15' },
        ];
        const config = new ConfigService({
            jwt: { secret: 'isolated-weather-test-secret', algorithm: 'HS256' },
            OPENWEATHER_API_KEY: 'private-test-key',
            WEATHER_FORECAST_ENABLED: 'true',
        });
        const module = await Test.createTestingModule({
            imports: [PassportModule, JwtModule.register({ secret: 'isolated-weather-test-secret' })],
            controllers: [WeatherController],
            providers: [
                WeatherForecastService,
                JwtStrategy,
                { provide: ConfigService, useValue: config },
                { provide: I18nService, useValue: { t: (key: string) => key } },
                { provide: CACHE_MANAGER, useValue: cache },
                { provide: SharedStoreService, useValue: { claimJobSlot: () => Promise.resolve(true) } },
                {
                    provide: getModelToken(ObjectLocationDataModel),
                    useValue: {
                        findAll: () => Promise.resolve(rows),
                        findOne: ({ where }: { where: { id: number } }) =>
                            Promise.resolve(rows.find((row) => row.id === where.id && [1, 4, 5].includes(row.id)) ?? null),
                    },
                },
            ],
        }).compile();
        app = module.createNestApplication({ logger: false });
        await app.init();
        jwt = module.get(JwtService);
        token = jwt.sign({ userId: 7, roleId: 1, type: 'access' });
        service = module.get(WeatherForecastService);
    });

    beforeEach(async () => {
        await cache.clear();
        fetchMock = jest.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve(new Response(JSON.stringify(payload), { status: 200 })));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await app.close();
        await cache.disconnect();
    });

    it('requires an access token for the forecast endpoint', async () => {
        const path = '/api/weather/forecast?objectId=1';
        await request(app.getHttpServer()).get(path).expect(401);
        const refreshToken = jwt.sign({ userId: 7, roleId: 1, type: 'refresh' });
        await request(app.getHttpServer()).get(path).auth(refreshToken, { type: 'bearer' }).expect(401);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('does not expose a locality-list endpoint', async () => {
        await request(app.getHttpServer()).get('/api/weather/localities').auth(token, { type: 'bearer' }).expect(404);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns 503 for a cold cache without fetching weather on demand', async () => {
        await request(app.getHttpServer()).get('/api/weather/forecast').query({ objectId: 1 }).auth(token, { type: 'bearer' }).expect(503);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns the entire cached provider payload and freshness metadata', async () => {
        await service.collectNextForecast();
        const response = await request(app.getHttpServer()).get('/api/weather/forecast').query({ objectId: 1 }).auth(token, { type: 'bearer' }).expect(200);
        const body = response.body as WeatherForecastResponse;
        expect(body).toMatchObject({ objectLocationId: 1, stale: false, data: payload });
        expect(Date.parse(body.fetchedAt)).toBeGreaterThan(0);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not reuse another object location forecast, even when the locality name matches', async () => {
        await service.collectNextForecast();
        await request(app.getHttpServer()).get('/api/weather/forecast').query({ objectId: 4 }).auth(token, { type: 'bearer' }).expect(503);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it.each([2, 3, 999])('returns 404 for an unknown or inaccessible object location (%s), including another site in the same locality', async (objectId) => {
        await service.collectNextForecast();
        await request(app.getHttpServer()).get('/api/weather/forecast').query({ objectId }).auth(token, { type: 'bearer' }).expect(404);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('returns 503 for a location whose forecast has not been collected', async () => {
        await request(app.getHttpServer()).get('/api/weather/forecast').query({ objectId: 5 }).auth(token, { type: 'bearer' }).expect(503);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each([
        '',
        '?locality=г.%20Казань',
        '?objectLocationId=1',
        '?objectId=',
        '?objectId=one',
        '?objectId=1&objectId=4',
        '?objectId=0',
        '?objectId=-1',
        '?objectId=1.5',
        '?objectId=2147483648',
        '?objectId=9007199254740993',
    ])('returns 400 for a missing or invalid object ID (%s)', async (query) => {
        await request(app.getHttpServer()).get(`/api/weather/forecast${query}`).auth(token, { type: 'bearer' }).expect(400);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
