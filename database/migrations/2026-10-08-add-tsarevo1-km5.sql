-- Add the KM-5 heat meter (418200) of the Царёво-1 boiler room, polled by the KM5 Client subflow on the Node-RED tab
-- 8c7f93e2ebca7614 (178.205.241.58:5011 behind a Maestro modem, network number 418200). Same flow, location, order,
-- mnemoschema source and user links as the boiler room (device 23), and an emergency row without reasons, like the
-- other meters (it raises only the "no connection" emergency). Node-RED finds the device by its position among the
-- flow's devices sorted by id, so the new device must get an id greater than 23 (index 1 in collect-device-state).
BEGIN;

WITH tsarevo1 AS (
    SELECT id AS "deviceId", "flowId", "objectLocationId", "order" FROM public.device WHERE code = 'tsarevo1-boiler-room'
), device AS (
    INSERT INTO public.device (code, name, description, "flowId", "objectLocationId", settings, "updateStateInterval",
                               "order", "createdAt", "updatedAt")
    SELECT 'tsarevo1-km5-418200', 'КМ-5 (418200)', 'Теплосчетчик КМ-5 (418200)', "flowId", "objectLocationId",
           '{"stateTtl":10}', 10, "order", now(), now()
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
SELECT "userId", device.id, now(), now()
FROM device, public.user_device_link
WHERE user_device_link."deviceId" = (SELECT "deviceId" FROM tsarevo1);

COMMIT;
