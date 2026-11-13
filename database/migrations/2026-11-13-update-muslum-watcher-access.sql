-- Reset the existing muslum-boiler-watcher password and grant both watcher
-- accounts access to Муслюмово-7 and Муслюмово-9. Plaintext credentials stay
-- outside Git; this file stores only the bcrypt hash (cost 12).
-- Repeat runs keep the same password and preserve settings and existing access.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';

DO $migration$
DECLARE
    target_login text;
    account_count integer;
    watcher_role integer;
    room_count integer;
    password_hash constant text := '$2b$12$hHjJEqItGCtPYh7QttsQfOCf.oOVdJ6AG2uZbjs6sE4CivIwIYqEW';
BEGIN
    -- User names have no unique constraint. Prevent duplicate-name insertion
    -- while checking and updating these existing accounts.
    LOCK TABLE public."user" IN SHARE ROW EXCLUSIVE MODE;

    FOREACH target_login IN ARRAY ARRAY['boiler-watcher', 'muslum-boiler-watcher']
    LOOP
        SELECT count(*), min("roleId") INTO account_count, watcher_role
        FROM public."user" WHERE name = target_login;

        IF account_count <> 1 THEN
            RAISE EXCEPTION 'Expected exactly one % account, found %', target_login, account_count;
        END IF;

        IF target_login = 'muslum-boiler-watcher' AND watcher_role <> 2 THEN
            RAISE EXCEPTION 'Existing muslum-boiler-watcher must have the operator role';
        END IF;
    END LOOP;

    SELECT count(*) INTO room_count FROM public.device
    WHERE code IN ('muslum-7-boiler-room', 'muslum-9-boiler-room');

    IF room_count <> 2 THEN
        RAISE EXCEPTION 'Expected both Муслюмово boiler rooms, found %', room_count;
    END IF;

    UPDATE public."user"
    SET password = password_hash, "updatedAt" = now()
    WHERE name = 'muslum-boiler-watcher'
      AND password IS DISTINCT FROM password_hash;

    INSERT INTO public.user_device_link ("userId", "deviceId", "createdAt", "updatedAt")
    SELECT u.id, d.id, now(), now()
    FROM public."user" u
    CROSS JOIN public.device d
    WHERE u.name IN ('boiler-watcher', 'muslum-boiler-watcher')
      AND d.code IN ('muslum-7-boiler-room', 'muslum-9-boiler-room')
    ON CONFLICT ("userId", "deviceId") DO NOTHING;
END
$migration$;

COMMIT;
