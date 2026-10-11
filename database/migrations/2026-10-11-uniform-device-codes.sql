-- Uniform device codes, <site>-<type>-<serial> like the other devices:
--   mercury230-26077096 -> spring-mercury230-26077096 (device 14)
--   mercury230-26077087 -> spring-mercury230-26077087 (device 19)
--   spring2-irvis       -> spring2-irvis-29804        (device 17)
-- The code names the device's statics folder (flow-space-statics/devices/<code>/), the diagram bindings
-- (states['<code>']) and the DEVICE_CODE of its Node-RED collect-device-state; all of them changed in the same
-- commit. Nothing else in the database refers to these codes (checked 2026-10-11: emergency rules, report settings,
-- user/device settings). Only rows still carrying an old code change, so running it again changes nothing.
-- Run 2026-10-10-fix-mercury230-current-scale.sql once more BEFORE this one: it finds the meters by their old codes.
-- Deploy together: this migration, then restart the web API (it reloads the device cache in Redis) and Node-RED.
BEGIN;

UPDATE public.device SET code = 'spring-mercury230-26077096', "updatedAt" = now() WHERE code = 'mercury230-26077096';
UPDATE public.device SET code = 'spring-mercury230-26077087', "updatedAt" = now() WHERE code = 'mercury230-26077087';
UPDATE public.device SET code = 'spring2-irvis-29804', "updatedAt" = now() WHERE code = 'spring2-irvis';

COMMIT;
