SET TIME ZONE 'Europe/Moscow';

WITH daily_last AS (
  SELECT DISTINCT ON (DATE("createdAt"))
         DATE("createdAt") AS day,
         "createdAt" AS created_at,
         (state::json -> 'gasMeter' ->> 'accumulatedVolume')::int AS volume
  FROM device_state
  WHERE "deviceId" = 9
    AND "createdAt" >= '2026-05-01'
    AND "createdAt" <  '2026-05-07'
    AND state::json -> 'gasMeter' -> 'accumulatedVolume' IS NOT NULL
  ORDER BY DATE("createdAt"), "createdAt" DESC
)
SELECT day, created_at, volume,
       volume - LAG(volume) OVER (ORDER BY day) AS consumption
FROM daily_last
ORDER BY day;