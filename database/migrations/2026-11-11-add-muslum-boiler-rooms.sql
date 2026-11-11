-- Register the two Муслюмово boiler rooms with their supplied locations.
-- Controller types, Node-RED flow uids and diagrams are not known yet. Like the
-- earlier boiler-room skeletons, grant initial access to admin-boiler-watcher
-- and omit emergencies until live state collection is configured.
-- Repeat runs validate existing records and leave them unchanged.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';

DO $migration$
DECLARE
    room record;
    admin_id integer;
    admin_count integer;
    location_id integer;
    flow_id integer;
    device_id integer;
BEGIN
    SELECT count(*), min(id) INTO admin_count, admin_id
    FROM public."user" WHERE name = 'admin-boiler-watcher';

    IF admin_count <> 1 THEN
        RAISE EXCEPTION 'Expected exactly one admin-boiler-watcher account, found %', admin_count;
    END IF;

    FOR room IN
        SELECT * FROM (VALUES
            ('muslum-7-boiler-room', 'Муслюмово-7',
             'Котельная №7, с. Муслюмово',
             'Октябрьская улица, 50А, село Муслюмово, Республика Татарстан',
             55.305200, 53.195563, 8),
            ('muslum-9-boiler-room', 'Муслюмово-9',
             'Котельная №9, с. Муслюмово',
             'Молодёжная улица, 9А, село Муслюмово, Республика Татарстан',
             55.308541, 53.183894, 9)
        ) AS rooms(code, name, description, address, latitude, longitude, list_order)
    LOOP
        IF EXISTS (SELECT 1 FROM public.device WHERE code = room.code) THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.device d
                JOIN public.flow f ON f.id = d."flowId"
                JOIN public.object_location l ON l.id = d."objectLocationId"
                JOIN public.mnemoschema_selector m ON m."deviceId" = d.id AND m."sourceDeviceId" = d.id
                JOIN public.user_device_link u ON u."deviceId" = d.id AND u."userId" = admin_id
                WHERE d.code = room.code AND d.name = room.name AND f.code = room.code
                  AND l.address = room.address AND l.locality = 'с. Муслюмово'
                  AND l.latitude = room.latitude AND l.longitude = room.longitude
            ) THEN
                RAISE EXCEPTION 'Existing boiler room % does not match the expected registration', room.code;
            END IF;
            CONTINUE;
        END IF;

        IF EXISTS (SELECT 1 FROM public.flow WHERE code = room.code) THEN
            RAISE EXCEPTION 'Flow % already exists without its boiler-room device', room.code;
        END IF;

        INSERT INTO public.object_location (latitude, longitude, address, locality, "createdAt", "updatedAt")
        VALUES (room.latitude, room.longitude, room.address, 'с. Муслюмово', now(), now())
        RETURNING id INTO location_id;

        INSERT INTO public.flow (code, name, description, uid, "createdAt", "updatedAt")
        VALUES (room.code, room.name, 'Система мониторинга ' || room.name, NULL, now(), now())
        RETURNING id INTO flow_id;

        INSERT INTO public.device (code, name, description, "flowId", "objectLocationId", settings,
                                   "updateStateInterval", "order", "createdAt", "updatedAt")
        VALUES (room.code, room.name, room.description, flow_id, location_id, '{"stateTtl":10}',
                10, room.list_order, now(), now())
        RETURNING id INTO device_id;

        INSERT INTO public.mnemoschema_selector ("deviceId", "sourceDeviceId", "createdAt", "updatedAt")
        VALUES (device_id, device_id, now(), now());

        INSERT INTO public.user_device_link ("userId", "deviceId", "createdAt", "updatedAt")
        VALUES (admin_id, device_id, now(), now());
    END LOOP;
END
$migration$;

COMMIT;
