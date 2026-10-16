-- Remove the example TV7 heat calculator tsarevo1-tv7-19072584 (device 26, the IHN on Tabeev Street, 1) from Царёво-1:
-- it was only polled to try the TV7 reader, which stays (flow-space/src/device-readers/tv7-client.js, the TV7 Client
-- subflow and the tv7 device type) for a real TV7 later. Its Node-RED nodes were removed in the same commit.
-- mnemoschema_selector has no ON DELETE CASCADE, so its row goes first; device_state, emergency_state, emergency and
-- user_device_link rows go with the device (ON DELETE CASCADE). Running it again changes nothing.
BEGIN;

DELETE FROM public.mnemoschema_selector
WHERE "deviceId" IN (SELECT id FROM public.device WHERE code = 'tsarevo1-tv7-19072584')
   OR "sourceDeviceId" IN (SELECT id FROM public.device WHERE code = 'tsarevo1-tv7-19072584');

DELETE FROM public.device WHERE code = 'tsarevo1-tv7-19072584';

COMMIT;
