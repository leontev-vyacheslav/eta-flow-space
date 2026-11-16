-- Register Нурлат-5 and its prepared Node-RED B tab and mnemoschema.
-- Both shared watcher accounts follow the access policy of the other boiler rooms.
-- The map location is left unset until its actual coordinates are supplied.
-- Supplied address: РТ, Нурлат, ул. Ленинградская, 15А; retained in the description.
-- Keep deviceTypeId unset while the controller revision is unconfirmed.
-- Do not add an emergency registration while the collector has DEVICE_CODE = null:
-- the dispatcher would report permanent connection loss without stored telemetry.
-- Reruns preserve existing metadata and restore only missing diagram/access links.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';

DO $migration$
DECLARE
    room_code constant text := 'nurlat-5-boiler-room';
    tab_uid constant text := '93dc403dd0a3e7b1';
    watcher_name text;
    watcher_count integer;
    flow_count integer;
    flow_id integer;
    device_id integer;
    selector_count integer;
BEGIN
    FOREACH watcher_name IN ARRAY ARRAY['admin-boiler-watcher', 'boiler-watcher']
    LOOP
        SELECT count(*) INTO watcher_count FROM public."user"
        WHERE name = watcher_name;

        IF watcher_count <> 1 THEN
            RAISE EXCEPTION 'Expected exactly one % account, found %', watcher_name, watcher_count;
        END IF;
    END LOOP;

    IF EXISTS (
        SELECT 1 FROM public.flow
        WHERE uid = tab_uid AND code IS DISTINCT FROM room_code
    ) THEN
        RAISE EXCEPTION 'Node-RED tab % already belongs to another flow', tab_uid;
    END IF;

    SELECT id, "flowId" INTO device_id, flow_id FROM public.device WHERE code = room_code;

    IF device_id IS NOT NULL THEN
        SELECT count(*) INTO flow_count FROM public.flow WHERE code = room_code;

        IF flow_count <> 1 OR NOT EXISTS (
            SELECT 1 FROM public.flow WHERE id = flow_id AND code = room_code AND uid = tab_uid
        ) OR EXISTS (
            SELECT 1 FROM public.device WHERE "flowId" = flow_id AND id <> device_id
        ) THEN
            RAISE EXCEPTION 'Existing boiler room % has an unexpected flow registration', room_code;
        END IF;
    ELSE
        IF EXISTS (SELECT 1 FROM public.flow WHERE code = room_code) THEN
            RAISE EXCEPTION 'Flow % already exists without its boiler-room device', room_code;
        END IF;

        INSERT INTO public.flow (code, name, description, uid, "createdAt", "updatedAt")
        VALUES (room_code, 'Котельная Нурлат-5', 'Система мониторинга котельной №5, Нурлат',
                tab_uid, now(), now())
        RETURNING id INTO flow_id;

        INSERT INTO public.device (code, name, description, "flowId", settings,
                                   "updateStateInterval", "order", "createdAt", "updatedAt")
        VALUES (room_code, 'Котельная Нурлат-5', 'Котельная №5, Нурлат, ул. Ленинградская, 15А', flow_id,
                '{"stateTtl":10}', 10, 10, now(), now())
        RETURNING id INTO device_id;
    END IF;

    SELECT count(*) INTO selector_count FROM public.mnemoschema_selector WHERE "deviceId" = device_id;

    IF selector_count > 1 OR EXISTS (
        SELECT 1 FROM public.mnemoschema_selector
        WHERE "deviceId" = device_id AND "sourceDeviceId" <> device_id
    ) THEN
        RAISE EXCEPTION 'Existing boiler room % has an unexpected mnemoschema selector', room_code;
    END IF;

    IF selector_count = 0 THEN
        INSERT INTO public.mnemoschema_selector ("deviceId", "sourceDeviceId", "createdAt", "updatedAt")
        VALUES (device_id, device_id, now(), now());
    END IF;

    INSERT INTO public.user_device_link ("userId", "deviceId", "createdAt", "updatedAt")
    SELECT u.id, device_id, now(), now() FROM public."user" u
    WHERE u.name IN ('admin-boiler-watcher', 'boiler-watcher')
    ON CONFLICT ("userId", "deviceId") DO NOTHING;
END
$migration$;

COMMIT;
