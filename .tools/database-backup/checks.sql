-- Internal verification queries. Source and restored rows must have identical
-- counts and canonical JSON fingerprints, including IDs, timestamps and NULLs.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
\if :source
SET TRANSACTION SNAPSHOT :'snapshot';
\endif
SET LOCAL TIME ZONE 'UTC';

\if :source
DO $$
DECLARE
    state_table text;
    columns text[];
BEGIN
    FOREACH state_table IN ARRAY ARRAY['device_state', 'emergency_state'] LOOP
        SELECT array_agg(column_name::text ORDER BY ordinal_position)
        INTO columns
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = state_table;
        IF columns IS DISTINCT FROM ARRAY['id', 'deviceId', 'createdAt', 'updatedAt', 'state']::text[] THEN
            RAISE EXCEPTION 'Unexpected columns in public.%; review the backup tool before exporting', state_table;
        END IF;
    END LOOP;
END;
$$;

SELECT 'device_state', count(*), count(DISTINCT "deviceId"),
    md5(string_agg(row_to_json(latest)::text, E'\n' ORDER BY id))
FROM (
    SELECT DISTINCT ON ("deviceId") id, "deviceId", "createdAt", "updatedAt", state
    FROM public.device_state WHERE "deviceId" IS NOT NULL ORDER BY "deviceId", id DESC
) AS latest;
SELECT 'emergency_state', count(*), count(DISTINCT "deviceId"),
    md5(string_agg(row_to_json(latest)::text, E'\n' ORDER BY id))
FROM (
    SELECT DISTINCT ON ("deviceId") id, "deviceId", "createdAt", "updatedAt", state
    FROM public.emergency_state WHERE "deviceId" IS NOT NULL ORDER BY "deviceId", id DESC
) AS latest;
\else
SELECT 'device_state', count(*), count(DISTINCT "deviceId"),
    md5(string_agg(row_to_json(latest)::text, E'\n' ORDER BY id))
FROM (SELECT id, "deviceId", "createdAt", "updatedAt", state FROM public.device_state) AS latest;
SELECT 'emergency_state', count(*), count(DISTINCT "deviceId"),
    md5(string_agg(row_to_json(latest)::text, E'\n' ORDER BY id))
FROM (SELECT id, "deviceId", "createdAt", "updatedAt", state FROM public.emergency_state) AS latest;

DO $$
BEGIN
    IF (SELECT last_value FROM public.device_state_id_seq) < (SELECT max(id) FROM public.device_state)
        OR (SELECT last_value FROM public.emergency_state_id_seq) < (SELECT max(id) FROM public.emergency_state) THEN
        RAISE EXCEPTION 'A restored state sequence is behind its data';
    END IF;
END;
$$;
\endif

SELECT 'devices', count(*) FROM public.device;
COMMIT;
