-- Delete the stored states of device 25 (tsarevo1-km5-413498) that the example meter 418200 measured before device
-- 25 was switched to the real Царёво-1 meter 413498 (2026-10-15-replace-tsarevo1-km5-418200-with-413498.sql).
-- The last 418200 row is 202313 (2026-10-15 11:25 UTC, volumeInputPipe ~53297 m³); 413498's rows start at 202330
-- (11:35 UTC, ~2979889 m³). Running it again deletes nothing.
BEGIN;

DELETE FROM public.device_state
WHERE "deviceId" = (SELECT id FROM public.device WHERE code = 'tsarevo1-km5-413498')
  AND id <= 202313;

COMMIT;
