BEGIN;

WITH location AS (
    INSERT INTO public.object_location (latitude, longitude, address, "createdAt", "updatedAt")
    VALUES (55.194470, 49.258418, 'улица Комарова, пгт Камское Устье', now(), now())
    RETURNING id
), flow AS (
    INSERT INTO public.flow (code, name, description, uid, "createdAt", "updatedAt")
    VALUES ('komarova-boiler-room', 'Котельная Комарова', 'Система мониторинга котельной ул. Комарова',
            '75715e53e3de61dd', now(), now())
    RETURNING id
), device AS (
    INSERT INTO public.device (code, name, description, "flowId", "objectLocationId", settings, "updateStateInterval",
                               "order", "createdAt", "updatedAt")
    SELECT 'komarova-boiler-room', 'Котельная Комарова', 'Котельная, ул. Комарова, Камское Устье', flow.id, location.id,
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
