BEGIN;

WITH location AS (
    INSERT INTO public.object_location (latitude, longitude, address, "createdAt", "updatedAt")
    VALUES (55.204459, 49.276260, 'улица Кирова, пгт Камское Устье', now(), now())
    RETURNING id
), flow AS (
    INSERT INTO public.flow (code, name, description, uid, "createdAt", "updatedAt")
    VALUES ('kirov-boiler-room', 'Котельная Кирова', 'Система мониторинга котельной ул. Кирова',
            'dee90facac3f975e', now(), now())
    RETURNING id
), device AS (
    INSERT INTO public.device (code, name, description, "flowId", "objectLocationId", settings, "updateStateInterval",
                               "order", "createdAt", "updatedAt")
    SELECT 'kirov-boiler-room', 'Котельная Кирова', 'Котельная, ул. Кирова, Камское Устье', flow.id, location.id,
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
