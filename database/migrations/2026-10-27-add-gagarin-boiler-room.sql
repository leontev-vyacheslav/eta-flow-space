-- Add the Гагарина boiler room (пгт Камское Устье, улица Гагарина) as a skeleton: location, flow, device, its
-- mnemoschema and a link for admin-boiler-watcher only (user 3). The Node-RED tab 75715e53e3de61dd
-- (gagarin-boiler-room, a3ccf08) polls the controller but does not store the state yet (the storeDeviceStateToCacheAsync
-- call in its collect-device-state is commented out), the controller type is unknown (deviceTypeId NULL), there are no
-- diagram files yet, and there is no emergency row (it would raise a permanent "no connection" emergency); add the
-- emergency row, the device type and the other users' links once the state is stored. The flow code is the device code,
-- like the other flows; display order 7, after the existing objects.
BEGIN;

WITH location AS (
    INSERT INTO public.object_location (latitude, longitude, address, "createdAt", "updatedAt")
    VALUES (55.205417629854225, 49.25573918458008, 'улица Гагарина, пгт Камское Устье', now(), now())
    RETURNING id
), flow AS (
    INSERT INTO public.flow (code, name, description, uid, "createdAt", "updatedAt")
    VALUES ('gagarin-boiler-room', 'Котельная Гагарина', 'Система мониторинга котельной ул. Гагарина',
            '75715e53e3de61dd', now(), now())
    RETURNING id
), device AS (
    INSERT INTO public.device (code, name, description, "flowId", "objectLocationId", settings, "updateStateInterval",
                               "order", "createdAt", "updatedAt")
    SELECT 'gagarin-boiler-room', 'Котельная Гагарина', 'Котельная, ул. Гагарина, Камское Устье', flow.id, location.id,
           '{"stateTtl":10}', 10, 7, now(), now()
    FROM flow, location
    RETURNING id
), mnemoschema AS (
    INSERT INTO public.mnemoschema_selector ("deviceId", "sourceDeviceId", "createdAt", "updatedAt")
    SELECT id, id, now(), now() FROM device
)
INSERT INTO public.user_device_link ("userId", "deviceId", "createdAt", "updatedAt")
SELECT 3, id, now(), now() FROM device;

COMMIT;
