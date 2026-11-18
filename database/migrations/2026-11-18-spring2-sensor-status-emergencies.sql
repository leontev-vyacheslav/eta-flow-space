-- Весна-2: cover every SensorStatus field, including persistent sensor faults.
-- Extend reasons 55-61 to alarm/fault enum values 4, 8, 16 and 32; add reasons 63-77.
-- One reason per sensor; dynamic descriptions name its current SensorStatus.
-- Only exact numeric values 4, 8, 16 and 32 trigger a reason; WARNING (2) is excluded.
-- The existing numeric temperature/pressure limits remain independent.
-- IDs and all unrelated rules, registration metadata and history are preserved.
-- Accept only the exact legacy rule or the desired rule at each managed ID;
-- conflicting rules, malformed lists and missing/duplicate registrations abort.
-- Identical reruns do not update rows or timestamps. Reason 100 stays dispatcher-owned.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';

DO $migration$
DECLARE
    room_id integer;
    registration_id integer;
    existing_rules jsonb;
    updated_rules jsonb;
    desired_rule jsonb;
    existing_rule jsonb;
    legacy_rule jsonb;
    rule_index integer;
    legacy_rules constant jsonb := $legacy$[
    {
        "id": 55,
        "expression": "state.statusTempOutNetSensor >= 4",
        "title": "Температура на подаче сетевого контура (TE5): авария или неисправность датчика",
        "description": "`Температура на подаче сетевого контура (TE5)${state.statusTempOutNetSensor === 4 ? ' ' + dss.formatNumber(state.tempOutNet) + ' °C' : ''}: ${(await dss.getEnumDescription(deviceCode, 'SensorStatus', state.statusTempOutNetSensor))}`"
    },
    {
        "id": 56,
        "expression": "state.statusPressGasSensor >= 4",
        "title": "Давление газа (PE4): авария или неисправность датчика",
        "description": "`Давление газа (PE4)${state.statusPressGasSensor === 4 ? ' ' + dss.formatNumber(state.pressGas) + ' бар' : ''}: ${(await dss.getEnumDescription(deviceCode, 'SensorStatus', state.statusPressGasSensor))}`"
    },
    {
        "id": 57,
        "expression": "state.statusPressOutSrcWSensor >= 4",
        "title": "Давление исходной воды (PE3): авария или неисправность датчика",
        "description": "`Давление исходной воды (PE3)${state.statusPressOutSrcWSensor === 4 ? ' ' + dss.formatNumber(state.pressOutSrcW) + ' бар' : ''}: ${(await dss.getEnumDescription(deviceCode, 'SensorStatus', state.statusPressOutSrcWSensor))}`"
    },
    {
        "id": 58,
        "expression": "state.statusTempRoomAirSensor >= 4",
        "title": "Температура в котельной (TE12): авария или неисправность датчика",
        "description": "`Температура в котельной (TE12)${state.statusTempRoomAirSensor === 4 ? ' ' + dss.formatNumber(state.tempRoomAir) + ' °C' : ''}: ${(await dss.getEnumDescription(deviceCode, 'SensorStatus', state.statusTempRoomAirSensor))}`"
    },
    {
        "id": 59,
        "expression": "state.statusPressOutNetSensor >= 8",
        "title": "Давление на подаче сетевого контура (PE1): неисправность датчика",
        "description": "`Давление на подаче сетевого контура (PE1): ${(await dss.getEnumDescription(deviceCode, 'SensorStatus', state.statusPressOutNetSensor))}`"
    },
    {
        "id": 60,
        "expression": "state.statusPressInNetSensor >= 8",
        "title": "Давление на обратке сетевого контура (PE2): неисправность датчика",
        "description": "`Давление на обратке сетевого контура (PE2): ${(await dss.getEnumDescription(deviceCode, 'SensorStatus', state.statusPressInNetSensor))}`"
    },
    {
        "id": 61,
        "expression": "state.statusTempInNetSensor >= 8",
        "title": "Температура на обратке сетевого контура (TE6): неисправность датчика",
        "description": "`Температура на обратке сетевого контура (TE6): ${(await dss.getEnumDescription(deviceCode, 'SensorStatus', state.statusTempInNetSensor))}`"
    }
]$legacy$;
    desired_rules constant jsonb := $spring2$[
    {
        "id": 55,
        "expression": "state.statusTempOutNetSensor === 4 || state.statusTempOutNetSensor === 8 || state.statusTempOutNetSensor === 16 || state.statusTempOutNetSensor === 32",
        "title": "Температура на подаче сетевого контура (TE5): авария или неисправность датчика",
        "description": "`Температура на подаче сетевого контура (TE5)${state.statusTempOutNetSensor === 4 ? ' ' + dss.formatNumber(state.tempOutNet) + ' °C' : ''}: ${(await dss.getEnumDescription(deviceCode, 'SensorStatus', state.statusTempOutNetSensor))}`"
    },
    {
        "id": 56,
        "expression": "state.statusPressGasSensor === 4 || state.statusPressGasSensor === 8 || state.statusPressGasSensor === 16 || state.statusPressGasSensor === 32",
        "title": "Давление газа (PE4): авария или неисправность датчика",
        "description": "`Давление газа (PE4)${state.statusPressGasSensor === 4 ? ' ' + dss.formatNumber(state.pressGas) + ' бар' : ''}: ${(await dss.getEnumDescription(deviceCode, 'SensorStatus', state.statusPressGasSensor))}`"
    },
    {
        "id": 57,
        "expression": "state.statusPressOutSrcWSensor === 4 || state.statusPressOutSrcWSensor === 8 || state.statusPressOutSrcWSensor === 16 || state.statusPressOutSrcWSensor === 32",
        "title": "Давление исходной воды (PE3): авария или неисправность датчика",
        "description": "`Давление исходной воды (PE3)${state.statusPressOutSrcWSensor === 4 ? ' ' + dss.formatNumber(state.pressOutSrcW) + ' бар' : ''}: ${(await dss.getEnumDescription(deviceCode, 'SensorStatus', state.statusPressOutSrcWSensor))}`"
    },
    {
        "id": 58,
        "expression": "state.statusTempRoomAirSensor === 4 || state.statusTempRoomAirSensor === 8 || state.statusTempRoomAirSensor === 16 || state.statusTempRoomAirSensor === 32",
        "title": "Температура в котельной (TE12): авария или неисправность датчика",
        "description": "`Температура в котельной (TE12)${state.statusTempRoomAirSensor === 4 ? ' ' + dss.formatNumber(state.tempRoomAir) + ' °C' : ''}: ${(await dss.getEnumDescription(deviceCode, 'SensorStatus', state.statusTempRoomAirSensor))}`"
    },
    {
        "id": 59,
        "expression": "state.statusPressOutNetSensor === 4 || state.statusPressOutNetSensor === 8 || state.statusPressOutNetSensor === 16 || state.statusPressOutNetSensor === 32",
        "title": "Давление на подаче сетевого контура (PE1): авария или неисправность датчика",
        "description": "`Давление на подаче сетевого контура (PE1): ${(await dss.getEnumDescription(deviceCode, 'SensorStatus', state.statusPressOutNetSensor))}`"
    },
    {
        "id": 60,
        "expression": "state.statusPressInNetSensor === 4 || state.statusPressInNetSensor === 8 || state.statusPressInNetSensor === 16 || state.statusPressInNetSensor === 32",
        "title": "Давление на обратке сетевого контура (PE2): авария или неисправность датчика",
        "description": "`Давление на обратке сетевого контура (PE2): ${(await dss.getEnumDescription(deviceCode, 'SensorStatus', state.statusPressInNetSensor))}`"
    },
    {
        "id": 61,
        "expression": "state.statusTempInNetSensor === 4 || state.statusTempInNetSensor === 8 || state.statusTempInNetSensor === 16 || state.statusTempInNetSensor === 32",
        "title": "Температура на обратке сетевого контура (TE6): авария или неисправность датчика",
        "description": "`Температура на обратке сетевого контура (TE6): ${(await dss.getEnumDescription(deviceCode, 'SensorStatus', state.statusTempInNetSensor))}`"
    },
    {
        "id": 63,
        "expression": "state.boilers && state.boilers[0] && (state.boilers[0].statusTempOutSensor === 4 || state.boilers[0].statusTempOutSensor === 8 || state.boilers[0].statusTempOutSensor === 16 || state.boilers[0].statusTempOutSensor === 32)",
        "title": "Температура воды на подаче котла 1 (TE1): авария или неисправность датчика",
        "description": "`Температура воды на подаче котла 1 (TE1): ${await dss.getEnumDescription(deviceCode, 'SensorStatus', state.boilers[0].statusTempOutSensor)}`"
    },
    {
        "id": 64,
        "expression": "state.boilers && state.boilers[0] && (state.boilers[0].statusTempFlueGasesSensor === 4 || state.boilers[0].statusTempFlueGasesSensor === 8 || state.boilers[0].statusTempFlueGasesSensor === 16 || state.boilers[0].statusTempFlueGasesSensor === 32)",
        "title": "Температура дымовых газов котла 1 (TE7): авария или неисправность датчика",
        "description": "`Температура дымовых газов котла 1 (TE7): ${await dss.getEnumDescription(deviceCode, 'SensorStatus', state.boilers[0].statusTempFlueGasesSensor)}`"
    },
    {
        "id": 65,
        "expression": "state.boilers && state.boilers[1] && (state.boilers[1].statusTempOutSensor === 4 || state.boilers[1].statusTempOutSensor === 8 || state.boilers[1].statusTempOutSensor === 16 || state.boilers[1].statusTempOutSensor === 32)",
        "title": "Температура воды на подаче котла 2 (TE2): авария или неисправность датчика",
        "description": "`Температура воды на подаче котла 2 (TE2): ${await dss.getEnumDescription(deviceCode, 'SensorStatus', state.boilers[1].statusTempOutSensor)}`"
    },
    {
        "id": 66,
        "expression": "state.boilers && state.boilers[1] && (state.boilers[1].statusTempFlueGasesSensor === 4 || state.boilers[1].statusTempFlueGasesSensor === 8 || state.boilers[1].statusTempFlueGasesSensor === 16 || state.boilers[1].statusTempFlueGasesSensor === 32)",
        "title": "Температура дымовых газов котла 2 (TE8): авария или неисправность датчика",
        "description": "`Температура дымовых газов котла 2 (TE8): ${await dss.getEnumDescription(deviceCode, 'SensorStatus', state.boilers[1].statusTempFlueGasesSensor)}`"
    },
    {
        "id": 67,
        "expression": "state.boilers && state.boilers[2] && (state.boilers[2].statusTempOutSensor === 4 || state.boilers[2].statusTempOutSensor === 8 || state.boilers[2].statusTempOutSensor === 16 || state.boilers[2].statusTempOutSensor === 32)",
        "title": "Температура воды на подаче котла 3 (TE3): авария или неисправность датчика",
        "description": "`Температура воды на подаче котла 3 (TE3): ${await dss.getEnumDescription(deviceCode, 'SensorStatus', state.boilers[2].statusTempOutSensor)}`"
    },
    {
        "id": 68,
        "expression": "state.boilers && state.boilers[2] && (state.boilers[2].statusTempFlueGasesSensor === 4 || state.boilers[2].statusTempFlueGasesSensor === 8 || state.boilers[2].statusTempFlueGasesSensor === 16 || state.boilers[2].statusTempFlueGasesSensor === 32)",
        "title": "Температура дымовых газов котла 3 (TE9): авария или неисправность датчика",
        "description": "`Температура дымовых газов котла 3 (TE9): ${await dss.getEnumDescription(deviceCode, 'SensorStatus', state.boilers[2].statusTempFlueGasesSensor)}`"
    },
    {
        "id": 69,
        "expression": "state.boilers && state.boilers[3] && (state.boilers[3].statusTempOutSensor === 4 || state.boilers[3].statusTempOutSensor === 8 || state.boilers[3].statusTempOutSensor === 16 || state.boilers[3].statusTempOutSensor === 32)",
        "title": "Температура воды на подаче котла 4 (TE4): авария или неисправность датчика",
        "description": "`Температура воды на подаче котла 4 (TE4): ${await dss.getEnumDescription(deviceCode, 'SensorStatus', state.boilers[3].statusTempOutSensor)}`"
    },
    {
        "id": 70,
        "expression": "state.boilers && state.boilers[3] && (state.boilers[3].statusTempFlueGasesSensor === 4 || state.boilers[3].statusTempFlueGasesSensor === 8 || state.boilers[3].statusTempFlueGasesSensor === 16 || state.boilers[3].statusTempFlueGasesSensor === 32)",
        "title": "Температура дымовых газов котла 4 (TE10): авария или неисправность датчика",
        "description": "`Температура дымовых газов котла 4 (TE10): ${await dss.getEnumDescription(deviceCode, 'SensorStatus', state.boilers[3].statusTempFlueGasesSensor)}`"
    },
    {
        "id": 71,
        "expression": "state.statusLevelDt1Sensor === 4 || state.statusLevelDt1Sensor === 8 || state.statusLevelDt1Sensor === 16 || state.statusLevelDt1Sensor === 32",
        "title": "Уровень ДТ 1 (LE1): авария или неисправность датчика",
        "description": "`Уровень ДТ 1 (LE1): ${await dss.getEnumDescription(deviceCode, 'SensorStatus', state.statusLevelDt1Sensor)}`"
    },
    {
        "id": 72,
        "expression": "state.statusLevelDt2Sensor === 4 || state.statusLevelDt2Sensor === 8 || state.statusLevelDt2Sensor === 16 || state.statusLevelDt2Sensor === 32",
        "title": "Уровень ДТ 2 (LE2): авария или неисправность датчика",
        "description": "`Уровень ДТ 2 (LE2): ${await dss.getEnumDescription(deviceCode, 'SensorStatus', state.statusLevelDt2Sensor)}`"
    },
    {
        "id": 73,
        "expression": "state.statusTempOutSensor === 4 || state.statusTempOutSensor === 8 || state.statusTempOutSensor === 16 || state.statusTempOutSensor === 32",
        "title": "Температура наружного воздуха: авария или неисправность датчика",
        "description": "`Температура наружного воздуха: ${await dss.getEnumDescription(deviceCode, 'SensorStatus', state.statusTempOutSensor)}`"
    },
    {
        "id": 74,
        "expression": "state.boilerPumps && state.boilerPumps[0] && (state.boilerPumps[0].statusCurrentSensor === 4 || state.boilerPumps[0].statusCurrentSensor === 8 || state.boilerPumps[0].statusCurrentSensor === 16 || state.boilerPumps[0].statusCurrentSensor === 32)",
        "title": "Датчик тока насоса котла 1: авария или неисправность датчика",
        "description": "`Датчик тока насоса котла 1: ${await dss.getEnumDescription(deviceCode, 'SensorStatus', state.boilerPumps[0].statusCurrentSensor)}`"
    },
    {
        "id": 75,
        "expression": "state.boilerPumps && state.boilerPumps[1] && (state.boilerPumps[1].statusCurrentSensor === 4 || state.boilerPumps[1].statusCurrentSensor === 8 || state.boilerPumps[1].statusCurrentSensor === 16 || state.boilerPumps[1].statusCurrentSensor === 32)",
        "title": "Датчик тока насоса котла 2: авария или неисправность датчика",
        "description": "`Датчик тока насоса котла 2: ${await dss.getEnumDescription(deviceCode, 'SensorStatus', state.boilerPumps[1].statusCurrentSensor)}`"
    },
    {
        "id": 76,
        "expression": "state.boilerPumps && state.boilerPumps[2] && (state.boilerPumps[2].statusCurrentSensor === 4 || state.boilerPumps[2].statusCurrentSensor === 8 || state.boilerPumps[2].statusCurrentSensor === 16 || state.boilerPumps[2].statusCurrentSensor === 32)",
        "title": "Датчик тока насоса котла 3: авария или неисправность датчика",
        "description": "`Датчик тока насоса котла 3: ${await dss.getEnumDescription(deviceCode, 'SensorStatus', state.boilerPumps[2].statusCurrentSensor)}`"
    },
    {
        "id": 77,
        "expression": "state.boilerPumps && state.boilerPumps[3] && (state.boilerPumps[3].statusCurrentSensor === 4 || state.boilerPumps[3].statusCurrentSensor === 8 || state.boilerPumps[3].statusCurrentSensor === 16 || state.boilerPumps[3].statusCurrentSensor === 32)",
        "title": "Датчик тока насоса котла 4: авария или неисправность датчика",
        "description": "`Датчик тока насоса котла 4: ${await dss.getEnumDescription(deviceCode, 'SensorStatus', state.boilerPumps[3].statusCurrentSensor)}`"
    }
]$spring2$;
BEGIN
    SELECT id INTO STRICT room_id
    FROM public.device
    WHERE code = 'spring2-boiler-room'
    FOR UPDATE;

    PERFORM id FROM public.emergency WHERE "deviceId" = room_id FOR UPDATE;
    IF (SELECT count(*) FROM public.emergency WHERE "deviceId" = room_id) <> 1 THEN
        RAISE EXCEPTION 'Expected exactly one Spring-2 emergency registration';
    END IF;

    SELECT id, reasons::jsonb INTO registration_id, existing_rules
    FROM public.emergency WHERE "deviceId" = room_id;

    IF existing_rules IS NULL OR jsonb_typeof(existing_rules) <> 'array' THEN
        RAISE EXCEPTION 'Expected an array of Spring-2 emergency reasons';
    END IF;
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(existing_rules) AS r(reason)
        WHERE jsonb_typeof(reason) <> 'object'
           OR jsonb_typeof(reason->'id') IS DISTINCT FROM 'number'
           OR reason->>'id' !~ '^[0-9]+$'
    ) THEN
        RAISE EXCEPTION 'Malformed Spring-2 emergency reason or ID';
    END IF;
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(existing_rules) AS r(reason)
        GROUP BY reason->>'id' HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate Spring-2 emergency reason IDs';
    END IF;

    updated_rules := existing_rules;
    FOR desired_rule IN SELECT value FROM jsonb_array_elements(desired_rules)
    LOOP
        SELECT reason, (n - 1)::integer INTO existing_rule, rule_index
        FROM jsonb_array_elements(updated_rules) WITH ORDINALITY AS r(reason, n)
        WHERE reason->'id' = desired_rule->'id';

        IF NOT FOUND THEN
            updated_rules := updated_rules || jsonb_build_array(desired_rule);
        ELSIF existing_rule IS DISTINCT FROM desired_rule THEN
            SELECT value INTO legacy_rule FROM jsonb_array_elements(legacy_rules)
            WHERE value->'id' = desired_rule->'id';
            IF legacy_rule IS NULL OR existing_rule IS DISTINCT FROM legacy_rule THEN
                RAISE EXCEPTION 'Conflicting Spring-2 emergency reason ID %; review before applying', desired_rule->>'id';
            END IF;
            updated_rules := jsonb_set(updated_rules, ARRAY[rule_index::text], desired_rule);
        END IF;
    END LOOP;

    IF updated_rules IS DISTINCT FROM existing_rules THEN
        UPDATE public.emergency
        SET reasons = updated_rules::json, "updatedAt" = now()
        WHERE id = registration_id;
        RAISE NOTICE 'Updated Spring-2 SensorStatus reasons: % -> % total reasons',
            jsonb_array_length(existing_rules), jsonb_array_length(updated_rules);
    END IF;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE EXCEPTION 'Expected the registered spring2-boiler-room device';
    WHEN TOO_MANY_ROWS THEN
        RAISE EXCEPTION 'Multiple spring2-boiler-room devices; review before applying';
END
$migration$;

COMMIT;
