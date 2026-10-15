-- Add the two Mercury230 electricity meters of the Царёво-1 boiler room, polled by the Mercury230 Client subflow on the
-- Node-RED tab 8c7f93e2ebca7614 through the WIZ108SR 78.138.147.158:5010 (the RS-485 line of the KM-5 413498):
-- 26916516 at address 16 and 26916504 at address 4. Same flow, location, order and mnemoschema source as the boiler
-- room (device 23), the Mercury230 device type, settings and state interval of the Весна meters, an emergency row
-- without reasons (only the "no connection" emergency), and links to the users who have the boiler room. Inserted one
-- by one, so 26916516 gets the lower id (27 and 28 on production, as the tab comments say); collect-device-state
-- finds each by its code (DEVICE_CODE).
BEGIN;

WITH tsarevo1 AS (
    SELECT id AS "deviceId", "flowId", "objectLocationId", "order" FROM public.device WHERE code = 'tsarevo1-boiler-room'
), device AS (
    INSERT INTO public.device (code, name, description, "flowId", "objectLocationId", settings, "updateStateInterval",
                               "order", "deviceTypeId", "createdAt", "updatedAt")
    SELECT 'tsarevo1-mercury230-26916516', 'Mercury230 (26916516)', 'Электросчетчик Mercury230 (26916516)', "flowId",
           "objectLocationId", '{"stateTtl":10}', 20, "order",
           (SELECT id FROM public.device_type WHERE code = 'mercury230'), now(), now()
    FROM tsarevo1
    RETURNING id
), mnemoschema AS (
    INSERT INTO public.mnemoschema_selector ("deviceId", "sourceDeviceId", "createdAt", "updatedAt")
    SELECT device.id, tsarevo1."deviceId", now(), now() FROM device, tsarevo1
), emergency AS (
    INSERT INTO public.emergency ("deviceId", reasons, "updateStateInterval", "createdAt", "updatedAt")
    SELECT id, '[]', 3, now(), now() FROM device
)
INSERT INTO public.user_device_link ("userId", "deviceId", "createdAt", "updatedAt")
SELECT link."userId", device.id, now(), now()
FROM device, public.user_device_link link
WHERE link."deviceId" = (SELECT "deviceId" FROM tsarevo1);

WITH tsarevo1 AS (
    SELECT id AS "deviceId", "flowId", "objectLocationId", "order" FROM public.device WHERE code = 'tsarevo1-boiler-room'
), device AS (
    INSERT INTO public.device (code, name, description, "flowId", "objectLocationId", settings, "updateStateInterval",
                               "order", "deviceTypeId", "createdAt", "updatedAt")
    SELECT 'tsarevo1-mercury230-26916504', 'Mercury230 (26916504)', 'Электросчетчик Mercury230 (26916504)', "flowId",
           "objectLocationId", '{"stateTtl":10}', 20, "order",
           (SELECT id FROM public.device_type WHERE code = 'mercury230'), now(), now()
    FROM tsarevo1
    RETURNING id
), mnemoschema AS (
    INSERT INTO public.mnemoschema_selector ("deviceId", "sourceDeviceId", "createdAt", "updatedAt")
    SELECT device.id, tsarevo1."deviceId", now(), now() FROM device, tsarevo1
), emergency AS (
    INSERT INTO public.emergency ("deviceId", reasons, "updateStateInterval", "createdAt", "updatedAt")
    SELECT id, '[]', 3, now(), now() FROM device
)
INSERT INTO public.user_device_link ("userId", "deviceId", "createdAt", "updatedAt")
SELECT link."userId", device.id, now(), now()
FROM device, public.user_device_link link
WHERE link."deviceId" = (SELECT "deviceId" FROM tsarevo1);

COMMIT;
