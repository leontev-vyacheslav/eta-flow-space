-- Царёво-2: one combined ЩУК connection-loss emergency, matching the diagram tile.
-- Any exact false among the four collected links triggers reason 33.
-- Missing/null historical fields do not imply a failed link. Reason 100 remains
-- dispatcher-owned. Preserve existing rules, intervals, metadata and history.
-- Identical reruns leave timestamps unchanged; conflicting rules abort.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';

DO $migration$
DECLARE
    room_id integer;
    registration_id integer;
    existing_rules jsonb;
    managed_rule jsonb;
    desired_rule constant jsonb := $rule${
        "id": 33,
        "expression": "state.boilerControlLinkStatuses && ((state.boilerControlLinkStatuses[0] && state.boilerControlLinkStatuses[0].isActive === false) || (state.boilerControlLinkStatuses[1] && state.boilerControlLinkStatuses[1].isActive === false) || (state.boilerControlLinkStatuses[2] && state.boilerControlLinkStatuses[2].isActive === false) || (state.boilerControlLinkStatuses[3] && state.boilerControlLinkStatuses[3].isActive === false))",
        "title": "Нет связи с ЩУК",
        "description": "Нет связи с одним или несколькими ЩУК котлов 1–4"
    }$rule$;
BEGIN
    SELECT id INTO STRICT room_id
    FROM public.device
    WHERE code = 'tsarevo2-boiler-room'
    FOR UPDATE;

    PERFORM id FROM public.emergency WHERE "deviceId" = room_id FOR UPDATE;
    IF (SELECT count(*) FROM public.emergency WHERE "deviceId" = room_id) <> 1 THEN
        RAISE EXCEPTION 'Expected exactly one Tsarevo-2 emergency registration';
    END IF;

    SELECT id, reasons::jsonb INTO registration_id, existing_rules
    FROM public.emergency WHERE "deviceId" = room_id;

    IF existing_rules IS NULL OR jsonb_typeof(existing_rules) <> 'array' THEN
        RAISE EXCEPTION 'Expected an array of Tsarevo-2 emergency reasons';
    END IF;
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(existing_rules) AS r(reason)
        WHERE jsonb_typeof(reason) <> 'object'
           OR jsonb_typeof(reason->'id') IS DISTINCT FROM 'number'
           OR reason->>'id' !~ '^[0-9]+$'
    ) THEN
        RAISE EXCEPTION 'Malformed Tsarevo-2 emergency reason or ID';
    END IF;
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(existing_rules) AS r(reason)
        GROUP BY reason->>'id' HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate Tsarevo-2 emergency reason IDs';
    END IF;
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(existing_rules) AS r(reason)
        WHERE reason->>'id' <> '33'
          AND position('boilerControlLinkStatuses' IN reason->>'expression') > 0
    ) THEN
        RAISE EXCEPTION 'A Tsarevo-2 boiler-control link rule already exists at another ID; review before applying';
    END IF;

    SELECT reason INTO managed_rule
    FROM jsonb_array_elements(existing_rules) AS r(reason)
    WHERE reason->>'id' = '33';

    IF managed_rule IS NOT NULL THEN
        IF managed_rule IS DISTINCT FROM desired_rule THEN
            RAISE EXCEPTION 'Conflicting Tsarevo-2 emergency reason 33; review before applying';
        END IF;
    ELSE
        UPDATE public.emergency
        SET reasons = (existing_rules || jsonb_build_array(desired_rule))::json,
            "updatedAt" = now()
        WHERE id = registration_id;
        RAISE NOTICE 'Added Tsarevo-2 ЩУК reason 33: % -> % total reasons',
            jsonb_array_length(existing_rules), jsonb_array_length(existing_rules) + 1;
    END IF;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE EXCEPTION 'Expected the registered tsarevo2-boiler-room device';
    WHEN TOO_MANY_ROWS THEN
        RAISE EXCEPTION 'Multiple tsarevo2-boiler-room devices; review before applying';
END
$migration$;

COMMIT;
