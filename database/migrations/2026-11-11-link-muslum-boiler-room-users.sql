-- Ensure admin-boiler-watcher can access both Муслюмово boiler rooms and create
-- muslum-boiler-watcher with access to these rooms only.
-- The new account uses the standard operator role and initial watcher settings.
-- Only the bcrypt hash is stored here; plaintext credentials are kept outside Git.
-- Repeat runs preserve passwords, settings and existing links.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';

DO $migration$
DECLARE
    admin_id integer;
    account_count integer;
    watcher_id integer;
    watcher_role integer;
    room_count integer;
BEGIN
    SELECT count(*), min(id) INTO account_count, admin_id
    FROM public."user" WHERE name = 'admin-boiler-watcher';

    IF account_count <> 1 THEN
        RAISE EXCEPTION 'Expected exactly one admin-boiler-watcher account, found %', account_count;
    END IF;

    SELECT count(*) INTO room_count FROM public.device
    WHERE code IN ('muslum-7-boiler-room', 'muslum-9-boiler-room');

    IF room_count <> 2 THEN
        RAISE EXCEPTION 'Expected both Муслюмово boiler rooms, found %', room_count;
    END IF;

    -- Serialize account creation because user names have no unique constraint.
    LOCK TABLE public."user" IN SHARE ROW EXCLUSIVE MODE;

    SELECT count(*), min(id), min("roleId") INTO account_count, watcher_id, watcher_role
    FROM public."user" WHERE name = 'muslum-boiler-watcher';

    IF account_count > 1 THEN
        RAISE EXCEPTION 'More than one user is named muslum-boiler-watcher';
    END IF;

    IF watcher_id IS NULL THEN
        -- Keep the sequence beyond manually assigned IDs without moving it back.
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
            'muslum-boiler-watcher',
            '$2b$12$GfoqdoSynQaB.qhZF04eY.MIe7.6VNIp8ztuH5UKTTWRjDTkvPLU2',
            2,
            '{"notifications":{"web":{"enabled":true,"soundType":"buzzer"}},"isShowedAllDevices":true,"isShowedAllMapObject":false}'::json,
            now(), now()
        )
        RETURNING id INTO watcher_id;
    ELSE
        IF watcher_role <> 2 THEN
            RAISE EXCEPTION 'Existing muslum-boiler-watcher must have the operator role';
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.user_device_link l
            JOIN public.device d ON d.id = l."deviceId"
            WHERE l."userId" = watcher_id
              AND d.code NOT IN ('muslum-7-boiler-room', 'muslum-9-boiler-room')
        ) THEN
            RAISE EXCEPTION 'Existing muslum-boiler-watcher has access to unrelated devices';
        END IF;
    END IF;

    INSERT INTO public.user_device_link ("userId", "deviceId", "createdAt", "updatedAt")
    SELECT accounts.id, d.id, now(), now()
    FROM (VALUES (admin_id), (watcher_id)) AS accounts(id)
    CROSS JOIN public.device d
    WHERE d.code IN ('muslum-7-boiler-room', 'muslum-9-boiler-room')
    ON CONFLICT ("userId", "deviceId") DO NOTHING;
END
$migration$;

COMMIT;
