-- Create the Камское Устье boiler-room watcher account and grant it access only to the boiler rooms on
-- улица Гагарина, улица Комарова and улица Кирова. The password is stored as a bcrypt hash (cost 12), never as
-- plaintext. The account uses the operator role and the same initial settings as boiler-watcher.
-- Safe to run again: an existing account is reused and existing user/device links are left unchanged.
BEGIN;

DO $migration$
DECLARE
    watcher_id integer;
    watcher_count integer;
    boiler_room_count integer;
BEGIN
    SELECT count(*), min(id)
    INTO watcher_count, watcher_id
    FROM public."user"
    WHERE name = 'kama-river-mouth-watcher';

    IF watcher_count > 1 THEN
        RAISE EXCEPTION 'More than one user is named kama-river-mouth-watcher';
    END IF;

    IF watcher_id IS NULL THEN
        -- Production has user IDs inserted independently of user_new_id_seq. Keep the sequence at least one ID beyond
        -- both the largest stored ID and its own next value; the table lock prevents a concurrent insert in between.
        LOCK TABLE public."user" IN SHARE ROW EXCLUSIVE MODE;

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
            'kama-river-mouth-watcher',
            '$2b$12$WjAenGucWV1JzzUe9xBP3eq7/ASW2LupkJlLDegbh.d3FTeItUmvu',
            2,
            '{"notifications":{"web":{"enabled":true,"soundType":"buzzer"}},"isShowedAllDevices":true,"isShowedAllMapObject":false}'::json,
            now(),
            now()
        )
        RETURNING id INTO watcher_id;
    END IF;

    SELECT count(*)
    INTO boiler_room_count
    FROM public.device
    WHERE code IN ('gagarin-boiler-room', 'komarova-boiler-room', 'kirov-boiler-room');

    IF boiler_room_count <> 3 THEN
        RAISE EXCEPTION 'Expected all three Камское Устье boiler-room devices, found %', boiler_room_count;
    END IF;

    INSERT INTO public.user_device_link ("userId", "deviceId", "createdAt", "updatedAt")
    SELECT watcher_id, device.id, now(), now()
    FROM public.device
    WHERE device.code IN ('gagarin-boiler-room', 'komarova-boiler-room', 'kirov-boiler-room')
    ON CONFLICT ("userId", "deviceId") DO NOTHING;
END
$migration$;

COMMIT;
