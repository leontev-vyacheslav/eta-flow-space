-- Create nurlat-boiler-watcher with operator access to Nurlat-5 only, and ensure
-- the existing boiler-watcher account also has access to that boiler room.
-- The generated 10-character password is stored only as a bcrypt hash (cost 12).
-- Plaintext credentials stay outside Git. Reruns preserve passwords/settings.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';

DO $migration$
DECLARE
    shared_watcher_id integer;
    watcher_id integer;
    watcher_role integer;
    account_count integer;
    room_id integer;
BEGIN
    SELECT id INTO room_id FROM public.device WHERE code = 'nurlat-5-boiler-room';
    IF room_id IS NULL THEN
        RAISE EXCEPTION 'Expected the registered nurlat-5-boiler-room device';
    END IF;

    -- Names have no unique constraint. Serialize exact-account checks/creation.
    LOCK TABLE public."user" IN SHARE ROW EXCLUSIVE MODE;

    SELECT count(*), min(id), min("roleId") INTO account_count, shared_watcher_id, watcher_role
    FROM public."user" WHERE name = 'boiler-watcher';
    IF account_count <> 1 THEN
        RAISE EXCEPTION 'Expected exactly one boiler-watcher account, found %', account_count;
    END IF;
    IF watcher_role <> 2 THEN
        RAISE EXCEPTION 'Existing boiler-watcher must have the operator role';
    END IF;

    SELECT count(*), min(id), min("roleId") INTO account_count, watcher_id, watcher_role
    FROM public."user" WHERE name = 'nurlat-boiler-watcher';
    IF account_count > 1 THEN
        RAISE EXCEPTION 'More than one user is named nurlat-boiler-watcher';
    END IF;

    IF watcher_id IS NULL THEN
        -- Account IDs can have been assigned manually; never move the sequence back.
        PERFORM setval(
            'public.user_new_id_seq',
            GREATEST(
                coalesce((SELECT max(id) + 1 FROM public."user"), 1),
                (SELECT last_value + CASE WHEN is_called THEN 1 ELSE 0 END FROM public.user_new_id_seq)
            ),
            false
        );

        INSERT INTO public."user" (name, password, "roleId", settings, "createdAt", "updatedAt")
        VALUES (
            'nurlat-boiler-watcher',
            '$2b$12$ymu.p7eUpGeRfNtREovNN.V0dHiNozLfo7h5EyN.L5f0XuLx4UV.m',
            2,
            '{"notifications":{"web":{"enabled":true,"soundType":"buzzer"}},"isShowedAllDevices":true,"isShowedAllMapObject":false}'::json,
            now(), now()
        ) RETURNING id INTO watcher_id;
    ELSE
        IF watcher_role <> 2 THEN
            RAISE EXCEPTION 'Existing nurlat-boiler-watcher must have the operator role';
        END IF;
        IF EXISTS (
            SELECT 1 FROM public.user_device_link
            WHERE "userId" = watcher_id AND "deviceId" IS DISTINCT FROM room_id
        ) THEN
            RAISE EXCEPTION 'Existing nurlat-boiler-watcher has access to unrelated devices';
        END IF;
    END IF;

    INSERT INTO public.user_device_link ("userId", "deviceId", "createdAt", "updatedAt")
    SELECT accounts.id, room_id, now(), now()
    FROM (VALUES (shared_watcher_id), (watcher_id)) AS accounts(id)
    ON CONFLICT ("userId", "deviceId") DO NOTHING;
END
$migration$;

COMMIT;
