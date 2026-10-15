-- Add the VKT-7 calculator 22222222 of the Царёво-1 boiler room, used as a gas volume counter (both systems in
-- measurement scheme 9, "Учет объема"), polled by the VKT7 Client subflow on the Node-RED tab 8c7f93e2ebca7614 through
-- the WIZ108SR 78.138.147.158:5010 (network number 1, on the line of the KM-5 and the two Mercury230 meters).
-- 22222222 is the subscriber number set in the calculator. Same flow, location, order and mnemoschema source as the
-- boiler room (device 23), the vkt7 device type, settings and state interval of the other Царёво-1 meters, an
-- emergency row without reasons (only the "no connection" emergency), and links to the users who have the boiler
-- room. Gets id 29 on production, as the tab comment says; collect-device-state finds it by its code (DEVICE_CODE).
BEGIN;

WITH tsarevo1 AS (
    SELECT id AS "deviceId", "flowId", "objectLocationId", "order" FROM public.device WHERE code = 'tsarevo1-boiler-room'
), device AS (
    INSERT INTO public.device (code, name, description, "flowId", "objectLocationId", settings, "updateStateInterval",
                               "order", "deviceTypeId", "createdAt", "updatedAt")
    SELECT 'tsarevo1-vkt7-22222222', 'ВКТ-7 (22222222)', 'Вычислитель ВКТ-7 (22222222), учет газа', "flowId",
           "objectLocationId", '{"stateTtl":10}', 10, "order",
           (SELECT id FROM public.device_type WHERE code = 'vkt7'), now(), now()
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
