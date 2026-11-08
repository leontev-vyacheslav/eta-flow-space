-- Remove the obsolete boilers[*].isWorking flag from the stored history of the Gagarin, Komarova and Kirov
-- boiler rooms. The controller always reported this flag as false; diagrams now use isNormal for the flame.
-- Network pump isWorking flags are unrelated and remain unchanged. Run after deploying the Node-RED mappings that
-- no longer store the boiler flag, otherwise new rows can reintroduce it.
BEGIN;

WITH rewritten_states AS (
    SELECT
        ds.id,
        jsonb_agg(
            CASE
                WHEN jsonb_typeof(boiler.value) = 'object' THEN boiler.value - 'isWorking'
                ELSE boiler.value
            END
            ORDER BY boiler.ordinality
        ) AS boilers
    FROM public.device_state ds
    JOIN public.device d ON d.id = ds."deviceId"
    CROSS JOIN LATERAL jsonb_array_elements(
        CASE
            WHEN jsonb_typeof(ds.state -> 'boilers') = 'array' THEN ds.state -> 'boilers'
            ELSE '[]'::jsonb
        END
    ) WITH ORDINALITY AS boiler(value, ordinality)
    WHERE d.code IN ('gagarin-boiler-room', 'komarova-boiler-room', 'kirov-boiler-room')
    GROUP BY ds.id
    HAVING bool_or(
        CASE
            WHEN jsonb_typeof(boiler.value) = 'object' THEN boiler.value ? 'isWorking'
            ELSE false
        END
    )
)
UPDATE public.device_state ds
SET state = jsonb_set(ds.state, '{boilers}', rewritten_states.boilers, false)
FROM rewritten_states
WHERE ds.id = rewritten_states.id;

COMMIT;
