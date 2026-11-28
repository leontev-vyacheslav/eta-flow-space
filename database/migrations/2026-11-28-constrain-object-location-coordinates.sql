-- Keep coordinate ranges valid for every writer, including direct SQL and imports.
BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE public.object_location
    ADD CONSTRAINT object_location_latitude_range_check
        CHECK (latitude BETWEEN -90 AND 90),
    ADD CONSTRAINT object_location_longitude_range_check
        CHECK (longitude BETWEEN -180 AND 180);

COMMIT;
