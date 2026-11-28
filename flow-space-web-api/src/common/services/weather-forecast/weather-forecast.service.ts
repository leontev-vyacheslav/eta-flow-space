import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/sequelize';
import { Cache } from 'cache-manager';
import { DeviceDataModel, ObjectLocationDataModel, UserDeviceLinkDataModel } from '../../../database/models';
import { SharedStoreService } from '../shared-store/shared-store.service';
import {
    CachedWeatherForecast,
    ForecastCoordinates,
    ForecastLocation,
    OpenWeatherForecast,
    WeatherForecastResponse,
} from '../../../models/weather-forecast.model';

const MINUTE = 60_000;
const REFRESH_AFTER = 60 * MINUTE;
const RETRY_AFTER = 10 * MINUTE;
const SCHEDULE_KEY = 'weather:forecast:schedule';
const SCHEDULE_TTL = 24 * 60 * MINUTE;

interface ForecastSchedule {
    attempts: Record<number, number>;
    blockedUntil: number;
}

class ForecastProviderError extends Error {
    constructor(
        readonly status: number,
        readonly retryAfter: number,
    ) {
        super(`OpenWeather forecast HTTP ${status}`);
    }
}

/** Identifies the forecast for an object_location row. */
export const forecastCacheKey = (objectLocationId: number): string => `weather:forecast:location:${objectLocationId}`;

@Injectable()
export class WeatherForecastService implements OnModuleInit {
    private readonly logger = new Logger(WeatherForecastService.name);
    private readonly apiKey: string;
    private readonly enabled: boolean;

    constructor(
        @InjectModel(ObjectLocationDataModel) private readonly locationModel: typeof ObjectLocationDataModel,
        @Inject(CACHE_MANAGER) private readonly cache: Cache,
        private readonly sharedStore: SharedStoreService,
        config: ConfigService,
    ) {
        this.apiKey = config.get<string>('OPENWEATHER_API_KEY')?.trim() ?? '';
        // Explicit opt-in also keeps development APIs connected to shared Redis from running the job.
        this.enabled = config.get<string>('WEATHER_FORECAST_ENABLED') === 'true';
    }

    /** Reports a missing API key when collection is enabled. */
    onModuleInit(): void {
        if (this.enabled && !this.apiKey) {
            this.logger.warn('Weather forecast polling is enabled but OPENWEATHER_API_KEY is missing; polling is disabled.');
        }
    }

    /** Refreshes one location whose forecast is missing or due for an update. */
    @Cron(CronExpression.EVERY_MINUTE, { name: 'weather-forecast', waitForCompletion: true })
    async collectNextForecast(): Promise<void> {
        if (!this.enabled || !this.apiKey) {
            return;
        }

        try {
            const startedAt = Date.now();
            const minuteSlot = Math.floor(startedAt / MINUTE);
            if (!(await this.sharedStore.claimJobSlot(`weather-forecast:${minuteSlot}`, 120))) {
                return;
            }

            const now = Date.now();
            const schedule = (await this.cache.get<ForecastSchedule>(SCHEDULE_KEY)) ?? { attempts: {}, blockedUntil: 0 };
            if (schedule.blockedUntil > now) {
                return;
            }

            const locations = await this.loadLocations();
            if (locations.length === 0) {
                return;
            }

            let next: ForecastLocation | undefined;
            let oldestAttempt = Infinity;
            for (const location of locations) {
                const forecast = await this.cache.get<CachedWeatherForecast>(forecastCacheKey(location.id));
                const attemptedAt = schedule.attempts[location.id] ?? 0;
                const fresh = forecast?.objectLocationId === location.id && now - Date.parse(forecast.fetchedAt) < REFRESH_AFTER;
                if (fresh || now - attemptedAt < RETRY_AFTER) {
                    continue;
                }
                if (attemptedAt < oldestAttempt) {
                    next = location;
                    oldestAttempt = attemptedAt;
                }
            }
            if (!next) {
                return;
            }

            // Persist attempts separately so failures never replace the last successful forecast.
            schedule.attempts[next.id] = now;
            await this.cache.set(SCHEDULE_KEY, schedule, SCHEDULE_TTL);

            try {
                // A slow database/cache must not let this tick use an expired polling slot.
                if (Date.now() - startedAt >= 50_000 || Math.floor(Date.now() / MINUTE) !== minuteSlot) {
                    return;
                }
                const data = await this.fetchForecast(next.coordinates);
                const entry: CachedWeatherForecast = {
                    objectLocationId: next.id,
                    fetchedAt: new Date(Date.now()).toISOString(),
                    data,
                };
                // Zero overrides the global cache TTL: forecast snapshots have no expiry.
                await this.cache.set(forecastCacheKey(next.id), entry, 0);
                this.logger.log(`Weather forecast cached for location ${next.id}`);
            } catch (error) {
                if (error instanceof ForecastProviderError && [401, 403, 429].includes(error.status)) {
                    schedule.blockedUntil = Date.now() + error.retryAfter;
                    await this.cache.set(SCHEDULE_KEY, schedule, SCHEDULE_TTL);
                }
                // Fetch/transport errors may contain the request URL and API key; never log them.
                this.logger.warn(`Weather forecast failed for location ${next.id}${error instanceof ForecastProviderError ? ` (HTTP ${error.status})` : ''}`);
            }
        } catch {
            this.logger.warn('Weather forecast job could not read locations or coordinate its cache; this tick was skipped.');
        }
    }

    /** Returns the cached forecast for an accessible object location. */
    async getForecast(userId: number, objectLocationId: number): Promise<WeatherForecastResponse | null | undefined> {
        if (!Number.isSafeInteger(userId) || userId <= 0 || !Number.isSafeInteger(objectLocationId) || objectLocationId <= 0) {
            return undefined;
        }
        const location = await this.locationModel.findOne({
            attributes: ['id'],
            where: { id: objectLocationId },
            include: [
                {
                    model: DeviceDataModel,
                    as: 'devices',
                    attributes: [],
                    required: true,
                    include: [{ model: UserDeviceLinkDataModel, as: 'userDeviceLinks', attributes: [], where: { userId }, required: true }],
                },
            ],
        });
        if (!location) {
            return undefined;
        }
        const entry = await this.cache.get<CachedWeatherForecast>(forecastCacheKey(objectLocationId));
        const now = Date.now();
        return entry?.objectLocationId === objectLocationId ? { ...entry, stale: now - Date.parse(entry.fetchedAt) >= REFRESH_AFTER } : null;
    }

    /** Loads registered object locations for forecast collection. */
    private async loadLocations(): Promise<ForecastLocation[]> {
        const rows = await this.locationModel.findAll({
            attributes: ['id', 'latitude', 'longitude'],
            order: [['id', 'ASC']],
        });
        return rows.map((row) => ({
            id: row.id,
            coordinates: { latitude: Number(row.latitude), longitude: Number(row.longitude) },
        }));
    }

    /** Checks that a provider response contains usable forecast periods. */
    private validForecast(value: unknown, now: number): value is OpenWeatherForecast {
        if (!value || typeof value !== 'object') {
            return false;
        }
        const data = value as OpenWeatherForecast;
        return (
            String(data.cod) === '200' &&
            Array.isArray(data.list) &&
            data.list.length > 0 &&
            data.cnt === data.list.length &&
            data.list.every((period) => Number.isFinite(period?.dt) && typeof period.dt_txt === 'string' && Number.isFinite(period.main?.temp)) &&
            data.list.some((period) => period.dt * 1000 > now) &&
            Number.isFinite(data.city?.timezone)
        );
    }

    /** Requests the complete forecast for the supplied coordinates. */
    private async fetchForecast(coordinates: ForecastCoordinates): Promise<OpenWeatherForecast> {
        const url = new URL('https://api.openweathermap.org/data/2.5/forecast');
        url.search = new URLSearchParams({
            lat: String(coordinates.latitude),
            lon: String(coordinates.longitude),
            appid: this.apiKey,
            units: 'metric',
            lang: 'ru',
        }).toString();
        const response = await fetch(url, { signal: AbortSignal.timeout(10_000), redirect: 'error' });
        if (!response.ok) {
            const retryHeader = response.headers.get('retry-after');
            const seconds = retryHeader?.trim() ? Number(retryHeader) : NaN;
            const retryAfter = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryHeader ?? '') - Date.now();
            await response.body?.cancel().catch(() => undefined);
            throw new ForecastProviderError(response.status, Math.max(response.status === 429 ? RETRY_AFTER : REFRESH_AFTER, retryAfter || 0));
        }
        const data: unknown = await response.json();
        if (!this.validForecast(data, Date.now())) {
            throw new Error('Invalid forecast response');
        }
        return data;
    }
}
