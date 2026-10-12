-- Link the ТВ7 heat meter of Царёво-1 (tsarevo1-tv7-19072584) to boiler-watcher, energoresurs and ukteplo, who already
-- have the boiler room and its KM-5 meter; until now only admin-boiler-watcher had it. Safe to run again (unique
-- user/device).
BEGIN;

INSERT INTO public.user_device_link ("userId", "deviceId", "createdAt", "updatedAt")
SELECT "user".id, device.id, now(), now()
FROM public."user", public.device
WHERE "user".name IN ('boiler-watcher', 'energoresurs', 'ukteplo')
  AND device.code = 'tsarevo1-tv7-19072584'
ON CONFLICT ("userId", "deviceId") DO NOTHING;

COMMIT;
