-- Link the Царёво-1 boiler room (tsarevo1-boiler-room) and its KM-5 heat meter (tsarevo1-km5-418200) to
-- boiler-watcher, energoresurs and ukteplo; until now only admin-boiler-watcher had them. Safe to run again (unique
-- user/device).
BEGIN;

INSERT INTO public.user_device_link ("userId", "deviceId", "createdAt", "updatedAt")
SELECT "user".id, device.id, now(), now()
FROM public."user", public.device
WHERE "user".name IN ('boiler-watcher', 'energoresurs', 'ukteplo')
  AND device.code IN ('tsarevo1-boiler-room', 'tsarevo1-km5-418200')
ON CONFLICT ("userId", "deviceId") DO NOTHING;

COMMIT;
