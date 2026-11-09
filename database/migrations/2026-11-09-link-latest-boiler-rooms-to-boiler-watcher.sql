-- Grant the existing boiler-watcher account access to the three newest boiler
-- rooms as verified on 2026-11-09. Explicit codes keep repeat runs scoped to the
-- same devices even after newer rooms are added. Existing access is preserved.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';

DO $migration$
DECLARE
    watcher_id integer;
    watcher_count integer;
    boiler_room_count integer;
BEGIN
    SELECT count(*), min(id) INTO watcher_count, watcher_id
    FROM public."user" WHERE name = 'boiler-watcher';

    IF watcher_count <> 1 THEN
        RAISE EXCEPTION 'Expected exactly one boiler-watcher account, found %', watcher_count;
    END IF;

    SELECT count(*) INTO boiler_room_count FROM public.device
    WHERE code IN ('gagarin-boiler-room', 'komarova-boiler-room', 'kirov-boiler-room');

    IF boiler_room_count <> 3 THEN
        RAISE EXCEPTION 'Expected three target boiler rooms, found %', boiler_room_count;
    END IF;

    INSERT INTO public.user_device_link ("userId", "deviceId", "createdAt", "updatedAt")
    SELECT watcher_id, id, now(), now() FROM public.device
    WHERE code IN ('gagarin-boiler-room', 'komarova-boiler-room', 'kirov-boiler-room')
    ON CONFLICT ("userId", "deviceId") DO NOTHING;
END
$migration$;

COMMIT;
