-- Add the address and map coordinates supplied after Нурлат-5 was registered.
-- Source coordinates: 54.43420092511286, 50.82059551095814.
-- object_location stores eight decimal places; identical reruns change nothing.
-- Abort rather than replacing a different existing location.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';

DO $migration$
DECLARE
    target_device_id integer;
    location_id integer;
    target_latitude constant numeric(10,8) := 54.43420092511286;
    target_longitude constant numeric(11,8) := 50.82059551095814;
    target_address constant text := 'Ленинградская улица, 15А, город Нурлат, Республика Татарстан';
    target_locality constant text := 'г. Нурлат';
BEGIN
    SELECT id, "objectLocationId" INTO target_device_id, location_id
    FROM public.device WHERE code = 'nurlat-5-boiler-room'
    FOR UPDATE;

    IF target_device_id IS NULL THEN
        RAISE EXCEPTION 'Expected the registered nurlat-5-boiler-room device';
    END IF;

    IF location_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.object_location
            WHERE id = location_id AND latitude = target_latitude AND longitude = target_longitude
              AND address = target_address AND locality = target_locality
        ) THEN
            RAISE EXCEPTION 'Nurlat-5 already has a different location';
        END IF;
        RETURN;
    END IF;

    INSERT INTO public.object_location (latitude, longitude, address, locality, "createdAt", "updatedAt")
    VALUES (target_latitude, target_longitude, target_address, target_locality, now(), now())
    RETURNING id INTO location_id;

    UPDATE public.device SET "objectLocationId" = location_id, "updatedAt" = now()
    WHERE id = target_device_id;
END
$migration$;

COMMIT;
