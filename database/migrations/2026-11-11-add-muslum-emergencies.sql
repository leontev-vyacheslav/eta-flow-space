-- Add emergency registrations for the two existing Муслюмово boiler rooms.
-- Empty reasons match the other registrations without custom alarm rules.
-- Existing emergency records are preserved; repeat runs insert nothing.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';

DO $migration$
DECLARE
    room_count integer;
BEGIN
    SELECT count(*) INTO room_count FROM public.device
    WHERE code IN ('muslum-7-boiler-room', 'muslum-9-boiler-room');

    IF room_count <> 2 THEN
        RAISE EXCEPTION 'Expected both Муслюмово boiler rooms, found %', room_count;
    END IF;

    INSERT INTO public.emergency ("deviceId", reasons, "updateStateInterval", "createdAt", "updatedAt")
    SELECT d.id, '[]'::json, 3, now(), now() FROM public.device d
    WHERE d.code IN ('muslum-7-boiler-room', 'muslum-9-boiler-room')
      AND NOT EXISTS (SELECT 1 FROM public.emergency e WHERE e."deviceId" = d.id);
END
$migration$;

COMMIT;
