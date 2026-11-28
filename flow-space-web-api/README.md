# Flow Space Web API

A NestJS-based REST API for the Eta Flow Space

`DevicePoolSyncService` refreshes the shared Redis device cache at API startup and every five minutes.
Each `device:<id>` JSON item includes `objectLocationId` and a nested `objectLocation` with `id`,
`address`, `locality`, `latitude` and `longitude`. Devices without a linked location have
`objectLocation: null`. Coordinates retain PostgreSQL DECIMAL serialization as strings;
consumers convert them to numbers before making weather requests.

## Weather forecasts

`WeatherModule` collects OpenWeather's complete five-day / three-hour forecast independently of
the Node-RED current-weather flows. Every minute it considers registered object locations and fetches
**at most one location** whose successful forecast is missing or at least **one hour old**.
When all forecasts are fresh, the job makes no provider request. There is no bulk fetch at startup;
the first scheduled minute starts warming the cache.

The controller and route module are in `src/weather/`. The reusable collector service and its
module are in `src/common/services/weather-forecast/`; response/cache types are in
`src/models/weather-forecast.model.ts`.

Each `object_location.id` has its own forecast, fetched using that row's latitude and longitude.
Locations in the same city have separate entries. Locality names are not used for collection or
cache lookup, so missing or renamed locality labels do not affect forecasts. The PostgreSQL driver
returns DECIMAL values as strings; the service converts them directly with `Number(...)`.
The database enforces non-NULL coordinates, latitude in `[-90, 90]` and longitude in `[-180, 180]`,
so the service does not repeat coordinate validation. Zero is a valid coordinate. Apply
`database/migrations/2026-11-28-constrain-object-location-coordinates.sql` before deploying this simplification.
Newly registered locations are discovered on the next minute tick. Coordinate changes are used
on the next scheduled update; the previous forecast stays available by object-location ID.

Successful snapshots use the shared Redis-backed API cache under
`weather:forecast:location:<object_location.id>`, for example `weather:forecast:location:123`.
Each write explicitly uses **TTL 0 (no expiry)**,
overriding the API cache's 30-second default. This namespace is separate from Node-RED's
`weather:location:<objectLocationId>` current-weather keys. Each snapshot contains only
`objectLocationId`, `fetchedAt` and the complete provider response in `data`. Requests always use
metric units and Russian descriptions.
Normal Redis persistence applies; no forecast history is written to PostgreSQL.

The job chooses the least recently attempted due location, so failures do not starve other
locations. Attempts and provider cooldowns are shared in Redis and survive API restarts. A
calendar-minute atomic Redis `SET NX EX` slot coordinates API instances; slot keys expire after
two minutes and are deliberately not released when work finishes. Separate minute keys prevent
scheduler jitter from skipping the next tick. Work that crosses into another minute before starting
its provider request is skipped. Nest's `waitForCompletion` also prevents overlapping runs within
one process.
Provider requests have a 10-second timeout and do not follow redirects. Failed requests leave the
last successful snapshot untouched and retry that location after ten minutes. HTTP 429 pauses the
provider for at least ten minutes and respects a longer `Retry-After`; HTTP 401/403 pauses it for
one hour. Logs never include the provider request URL, API key or raw transport exception.

At most one request per minute means at most 1,440 requests/day or 43,200 in a 30-day month for this
collector. With 50 locations, normal hourly updates use about 1,200 requests/day (36,000 per 30 days),
and an empty cache takes about 50 minutes to populate. With more than 60 due locations, a full pass
takes more than an hour. Existing snapshots stay readable during delays and provider failures,
with `stale: true` after an hour. Availability is determined only by `objectLocationId`; the hourly
refresh and freshness status are calculated from `fetchedAt`. The complete provider response is
validated when collected, rather than revalidated on cache reads.

### Configuration

Collection is disabled by default. Before an authorized deployment, set the following in the API's
private environment (Compose loads `flow-space-web-api/.env`):

```dotenv
WEATHER_FORECAST_ENABLED=true
OPENWEATHER_API_KEY=your-existing-openweather-key
```

Use the same OpenWeather account/key as the current-weather integration; its requests share that
account's allowance. Do not put the real key in tracked files. A missing key skips collection and
logs one startup warning when the job is enabled. Leave collection disabled in development APIs
connected to production Redis. Disabled collectors can still serve previously cached forecasts.
The forecast API code remains local and disabled. The database coordinate constraints were applied
on 28 November 2026; no API deployment, environment activation or service restart was performed.

### Dashboard forecast

`GET /api/weather/forecast?objectLocationId=123` returns the cached forecast for the selected boiler room.
Pass its existing `objectLocationId` (`object_location.id`). The route requires the
existing Bearer access token and checks access to that exact location through the user's devices.
The service looks up the requested location directly and reads `weather:forecast:location:<objectLocationId>`.
The request needs no locality name or locality list and never loads all locations.

For example, against an API with this change deployed:

```bash
curl --get 'http://localhost:3002/api/weather/forecast' \
  --header "Authorization: Bearer $ACCESS_TOKEN" \
  --data-urlencode 'objectLocationId=123'
```

The forecast response contains `objectLocationId`, `fetchedAt`, `stale` and `data`.
`data` is the complete original OpenWeather JSON,
including all forecast periods and city metadata. Provider timestamps remain UTC; `data.city.timezone`
is the locality's UTC offset in seconds. GET requests read cache and registration/permission data;
they never trigger an OpenWeather request or cache write.

Missing or invalid `objectLocationId` parameters return 400; IDs must be positive PostgreSQL
32-bit integers. Unknown or inaccessible object locations return 404. An accessible location
without a matching cached forecast returns 503. An older snapshot returns 200 with
`stale: true` until refreshed.

Verification commands (isolated mocked provider/database, in-memory cache and real JWT/HTTP routes;
no application startup against production services):

```bash
npm test -- --runInBand weather shared-store.service.spec.ts
npm run build
npx eslint src/weather src/common/services/weather-forecast src/models/weather-forecast.model.ts src/common/services/shared-store/shared-store.service.ts src/common/services/shared-store/shared-store.service.spec.ts src/app.module.ts
```

Provider references: [forecast response and request format](https://openweathermap.org/api/forecast5),
[account limits and polling guidance](https://openweathermap.org/appid).

