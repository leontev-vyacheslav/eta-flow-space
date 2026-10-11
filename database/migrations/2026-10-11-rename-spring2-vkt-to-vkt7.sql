-- Device code of the Весна-2 VKT-7 heat calculator follows the device type code (vkt7), like the other devices'
-- <site>-<type>-<serial> codes: spring2-vkt-289452 -> spring2-vkt7-289452 (device 24). Its statics folder, the
-- Весна-2 diagram bindings and the DEVICE_CODE of its collect-device-state changed in the same commit; nothing else in
-- the database refers to the code. Only a row still carrying the old code changes, so running it again changes
-- nothing. Deploy together: this migration, then restart the web API (device cache in Redis) and Node-RED.
BEGIN;

UPDATE public.device SET code = 'spring2-vkt7-289452', "updatedAt" = now() WHERE code = 'spring2-vkt-289452';

COMMIT;
