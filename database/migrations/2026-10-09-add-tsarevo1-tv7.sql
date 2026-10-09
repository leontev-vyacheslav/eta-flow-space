-- Add the TV7 heat calculator (19072584) of the Царёво-1 boiler room, polled by the TV7 Client subflow on the Node-RED
-- tab 8c7f93e2ebca7614 (178.207.154.38:5011 behind a Wiznet modem, Modbus address 1). Adds the "tv7" device type.
-- Same flow, location, order and mnemoschema source as the boiler room (device 23), an emergency row without reasons,
-- like the other meters (it raises only the "no connection" emergency), and a link to admin-boiler-watcher only.
-- Node-RED finds the device by its position among the flow's devices sorted by id, so the new device must get an id
-- greater than 25, the KM-5 (index 2 in collect-device-state). Needs 2026-10-09-add-device-type.sql.
BEGIN;

INSERT INTO public.device_type (code, name, description, "createdAt", "updatedAt")
VALUES ('tv7', 'ТВ7', 'Тепловычислитель ТВ7', now(), now());

WITH tsarevo1 AS (
    SELECT id AS "deviceId", "flowId", "objectLocationId", "order" FROM public.device WHERE code = 'tsarevo1-boiler-room'
), device AS (
    INSERT INTO public.device (code, name, description, "flowId", "objectLocationId", settings, "updateStateInterval",
                               "order", "deviceTypeId", "createdAt", "updatedAt")
    SELECT 'tsarevo1-tv7-19072584', 'ТВ7 (19072584)', 'Тепловычислитель ТВ7 (19072584)', "flowId", "objectLocationId",
           '{"stateTtl":10}', 10, "order", (SELECT id FROM public.device_type WHERE code = 'tv7'), now(), now()
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
SELECT "user".id, device.id, now(), now()
FROM device, public."user"
WHERE "user".name = 'admin-boiler-watcher';

COMMIT;
