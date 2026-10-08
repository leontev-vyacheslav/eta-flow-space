-- Add the VKT-7 heat calculator (289452) of the Весна-2 boiler room, polled by the VKT7 Client subflow on the Node-RED
-- tab 2d15e59c76504bcb (94.180.252.2:505, network number 1). Same flow, location, order, mnemoschema source and user
-- links as the Irvis (device 17), and an emergency row without reasons, like the other meters (it raises only the
-- "no connection" emergency). Node-RED finds the device by its position among the flow's devices sorted by id, so the
-- new device must get an id greater than 17 (index 2 in collect-device-state).
BEGIN;

WITH spring2 AS (
    SELECT id AS "deviceId", "flowId", "objectLocationId" FROM public.device WHERE code = 'spring2-boiler-room'
), device AS (
    INSERT INTO public.device (code, name, description, "flowId", "objectLocationId", settings, "updateStateInterval",
                               "order", "createdAt", "updatedAt")
    SELECT 'spring2-vkt-289452', 'ВКТ-7 (289452)', 'Тепловычислитель ВКТ-7 (289452)', "flowId", "objectLocationId",
           '{"stateTtl":10}', 10, 5, now(), now()
    FROM spring2
    RETURNING id
), mnemoschema AS (
    INSERT INTO public.mnemoschema_selector ("deviceId", "sourceDeviceId", "createdAt", "updatedAt")
    SELECT device.id, spring2."deviceId", now(), now() FROM device, spring2
), emergency AS (
    INSERT INTO public.emergency ("deviceId", reasons, "updateStateInterval", "createdAt", "updatedAt")
    SELECT id, '[]', 3, now(), now() FROM device
)
INSERT INTO public.user_device_link ("userId", "deviceId", "createdAt", "updatedAt")
SELECT "userId", device.id, now(), now()
FROM device, public.user_device_link
WHERE user_device_link."deviceId" = (SELECT "deviceId" FROM spring2);

COMMIT;
