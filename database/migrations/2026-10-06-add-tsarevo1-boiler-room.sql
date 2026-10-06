-- Add the Царёво-1 boiler room as a skeleton: location, flow, device, its mnemoschema and a link for admin-boiler-watcher
-- only (user 3). Polling is not built yet (the controller address and register map are unknown), so the Node-RED tab
-- 8c7f93e2ebca7614 is disabled, the diagram binds only isConnected, and there is no emergency row (it would raise a
-- permanent "no connection" emergency); add the emergency row and the other users' links once polling works.
BEGIN;

WITH location AS (
    INSERT INTO public.object_location (latitude, longitude, address, "createdAt", "updatedAt")
    VALUES (55.8045495, 49.4365419, 'Жилой комплекс Царёво Сити, село Новое Шигалеево', now(), now())
    RETURNING id
), flow AS (
    INSERT INTO public.flow (code, name, description, uid, "createdAt", "updatedAt")
    VALUES ('tsarevo1-boiler-automation-t1', 'Котельная Царёво-1', 'Система мониторинга котельной ЖК Царёво-1',
            '8c7f93e2ebca7614', now(), now())
    RETURNING id
), device AS (
    INSERT INTO public.device (code, name, description, "flowId", "objectLocationId", settings, "updateStateInterval",
                               "createdAt", "updatedAt")
    SELECT 'tsarevo1-boiler-room', 'Котельная ЖК Царёво-1', 'Котельная ЖК Царёво-1', flow.id, location.id,
           '{"stateTtl":10}', 10, now(), now()
    FROM flow, location
    RETURNING id
), mnemoschema AS (
    INSERT INTO public.mnemoschema_selector ("deviceId", "sourceDeviceId", "createdAt", "updatedAt")
    SELECT id, id, now(), now() FROM device
)
INSERT INTO public.user_device_link ("userId", "deviceId", "createdAt", "updatedAt")
SELECT 3, id, now(), now() FROM device;

COMMIT;
