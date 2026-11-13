-- Populate only the two existing Muslum emergency registrations.
-- Follows the independent boolean alarm/warning rules used by Gagarin,
-- Komarova and Kirov, with Muslum-specific channels and two boilers.
-- Existing intervals, registration IDs and other devices are preserved.
-- Empty rule lists are populated; an identical rerun is a no-op. Any other
-- non-empty list is rejected to avoid overwriting independently edited rules.
-- Connection loss uses the dispatcher's built-in reason 100.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';

DO $migration$
DECLARE
    target record;
    device_count integer;
    target_device_id integer;
    emergency_count integer;
    emergency_id integer;
    existing_rules jsonb;
BEGIN
    -- Lock only the two target registrations; unrelated rows stay untouched.
    PERFORM e.id
    FROM public.emergency e JOIN public.device d ON d.id = e."deviceId"
    WHERE d.code IN ('muslum-7-boiler-room', 'muslum-9-boiler-room')
    ORDER BY e.id
    FOR UPDATE OF e;

    FOR target IN
        SELECT * FROM (VALUES
            ('muslum-7-boiler-room', $muslum7$[
    {
        "id": 1,
        "expression": "state.isGasAlarm === true",
        "description": "Газовая тревога"
    },
    {
        "id": 2,
        "expression": "state.isFireAlarm === true",
        "description": "Пожарная тревога"
    },
    {
        "id": 3,
        "expression": "state.isSecurityAlarm === true",
        "description": "Охранная сигнализация"
    },
    {
        "id": 4,
        "expression": "state.isBatteryLow === true || state.isBatteryAlarm === true",
        "description": "Низкий уровень батареи питания"
    },
    {
        "id": 5,
        "expression": "state.isBatteryFault === true",
        "description": "Неисправность батареи питания"
    },
    {
        "id": 6,
        "expression": "state.sensors && state.sensors.isTempOutAirSensorError === true",
        "description": "Неисправность датчика температуры наружного воздуха"
    },
    {
        "id": 7,
        "expression": "state.sensors && state.sensors.isTempOutNetSensorError === true",
        "description": "Неисправность датчика температуры подачи сетевого контура (TE1)"
    },
    {
        "id": 8,
        "expression": "state.sensors && state.sensors.isTempOutNetHighLevel === true",
        "description": "Температура подачи сетевого контура (TE1): высокий уровень"
    },
    {
        "id": 9,
        "expression": "state.sensors && state.sensors.isTempOutNetPreHighLevel === true",
        "description": "Температура подачи сетевого контура (TE1): предупредительно высокий уровень"
    },
    {
        "id": 10,
        "expression": "state.sensors && state.sensors.isTempOutNetPreLowLevel === true",
        "description": "Температура подачи сетевого контура (TE1): предупредительно низкий уровень"
    },
    {
        "id": 11,
        "expression": "state.sensors && state.sensors.isTempOutNetLowLevel === true",
        "description": "Температура подачи сетевого контура (TE1): низкий уровень"
    },
    {
        "id": 12,
        "expression": "state.sensors && state.sensors.isTempInNetSensorError === true",
        "description": "Неисправность датчика температуры обратки сетевого контура (TE2)"
    },
    {
        "id": 13,
        "expression": "state.sensors && state.sensors.isTempInNetPreLowLevel === true",
        "description": "Температура обратки сетевого контура (TE2): предупредительно низкий уровень"
    },
    {
        "id": 14,
        "expression": "state.sensors && state.sensors.isTempInNetLowLevel === true",
        "description": "Температура обратки сетевого контура (TE2): низкий уровень"
    },
    {
        "id": 15,
        "expression": "state.sensors && state.sensors.isTempOutBoilerSensorError === true",
        "description": "Неисправность датчика температуры подачи котлового контура (TE11)"
    },
    {
        "id": 16,
        "expression": "state.sensors && state.sensors.isTempOutBoilerHighLevel === true",
        "description": "Температура подачи котлового контура (TE11): высокий уровень"
    },
    {
        "id": 17,
        "expression": "state.sensors && state.sensors.isTempOutBoilerPreHighLevel === true",
        "description": "Температура подачи котлового контура (TE11): предупредительно высокий уровень"
    },
    {
        "id": 18,
        "expression": "state.sensors && state.sensors.isTempOutBoilerLowLevel === true",
        "description": "Температура подачи котлового контура (TE11): низкий уровень"
    },
    {
        "id": 19,
        "expression": "state.sensors && state.sensors.isTempInBoilerSensorError === true",
        "description": "Неисправность датчика температуры обратки котлового контура (TE12)"
    },
    {
        "id": 20,
        "expression": "state.sensors && state.sensors.isTempInBoilerPreLowLevel === true",
        "description": "Температура обратки котлового контура (TE12): предупредительно низкий уровень"
    },
    {
        "id": 21,
        "expression": "state.sensors && state.sensors.isTempInBoilerLowLevel === true",
        "description": "Температура обратки котлового контура (TE12): низкий уровень"
    },
    {
        "id": 22,
        "expression": "state.sensors && state.sensors.isPressOutNetSensorError === true",
        "description": "Неисправность датчика давления подачи сетевого контура (PE1)"
    },
    {
        "id": 23,
        "expression": "state.sensors && state.sensors.isPressOutNetHighLevel === true",
        "description": "Давление подачи сетевого контура (PE1): высокий уровень"
    },
    {
        "id": 24,
        "expression": "state.sensors && state.sensors.isPressOutNetPreHighLevel === true",
        "description": "Давление подачи сетевого контура (PE1): предупредительно высокий уровень"
    },
    {
        "id": 25,
        "expression": "state.sensors && state.sensors.isPressOutNetPreLowLevel === true",
        "description": "Давление подачи сетевого контура (PE1): предупредительно низкий уровень"
    },
    {
        "id": 26,
        "expression": "state.sensors && state.sensors.isPressOutNetLowLevel === true",
        "description": "Давление подачи сетевого контура (PE1): низкий уровень"
    },
    {
        "id": 27,
        "expression": "state.sensors && state.sensors.isPressInNetSensorError === true",
        "description": "Неисправность датчика давления обратки сетевого контура (PE2)"
    },
    {
        "id": 28,
        "expression": "state.sensors && state.sensors.isPressInNetPreLowLevel === true",
        "description": "Давление обратки сетевого контура (PE2): предупредительно низкий уровень"
    },
    {
        "id": 29,
        "expression": "state.sensors && state.sensors.isPressInNetLowLevel === true",
        "description": "Давление обратки сетевого контура (PE2): низкий уровень"
    },
    {
        "id": 30,
        "expression": "state.sensors && state.sensors.isPressOutBoilerSensorError === true",
        "description": "Неисправность датчика давления подачи котлового контура (PE11)"
    },
    {
        "id": 31,
        "expression": "state.sensors && state.sensors.isPressOutBoilerHighLevel === true",
        "description": "Давление подачи котлового контура (PE11): высокий уровень"
    },
    {
        "id": 32,
        "expression": "state.sensors && state.sensors.isPressOutBoilerPreHighLevel === true",
        "description": "Давление подачи котлового контура (PE11): предупредительно высокий уровень"
    },
    {
        "id": 33,
        "expression": "state.sensors && state.sensors.isPressOutBoilerPreLowLevel === true",
        "description": "Давление подачи котлового контура (PE11): предупредительно низкий уровень"
    },
    {
        "id": 34,
        "expression": "state.sensors && state.sensors.isPressOutBoilerLowLevel === true",
        "description": "Давление подачи котлового контура (PE11): низкий уровень"
    },
    {
        "id": 35,
        "expression": "state.sensors && state.sensors.isPressInBoilerSensorError === true",
        "description": "Неисправность датчика давления обратки котлового контура (PE21)"
    },
    {
        "id": 36,
        "expression": "state.sensors && state.sensors.isPressInBoilerPreLowLevel === true",
        "description": "Давление обратки котлового контура (PE21): предупредительно низкий уровень"
    },
    {
        "id": 37,
        "expression": "state.sensors && state.sensors.isPressInBoilerLowLevel === true",
        "description": "Давление обратки котлового контура (PE21): низкий уровень"
    },
    {
        "id": 38,
        "expression": "state.boilers && state.boilers[0] && state.boilers[0].isAlarm === true",
        "description": "Котёл №1: авария"
    },
    {
        "id": 39,
        "expression": "state.boilers && state.boilers[0] && state.boilers[0].isStartError === true",
        "description": "Котёл №1: ошибка запуска"
    },
    {
        "id": 40,
        "expression": "state.boilers && state.boilers[0] && state.boilers[0].isLocked === true",
        "description": "Котёл №1: заблокирован"
    },
    {
        "id": 41,
        "expression": "state.boilers && state.boilers[1] && state.boilers[1].isAlarm === true",
        "description": "Котёл №2: авария"
    },
    {
        "id": 42,
        "expression": "state.boilers && state.boilers[1] && state.boilers[1].isStartError === true",
        "description": "Котёл №2: ошибка запуска"
    },
    {
        "id": 43,
        "expression": "state.boilers && state.boilers[1] && state.boilers[1].isLocked === true",
        "description": "Котёл №2: заблокирован"
    }
]$muslum7$::jsonb),
            ('muslum-9-boiler-room', $muslum9$[
    {
        "id": 1,
        "expression": "state.isGasAlarm === true",
        "description": "Газовая тревога"
    },
    {
        "id": 2,
        "expression": "state.isFireAlarm === true",
        "description": "Пожарная тревога"
    },
    {
        "id": 3,
        "expression": "state.isSecurityAlarm === true",
        "description": "Охранная сигнализация"
    },
    {
        "id": 4,
        "expression": "state.isBatteryLow === true || state.isBatteryAlarm === true",
        "description": "Низкий уровень батареи питания"
    },
    {
        "id": 5,
        "expression": "state.isBatteryFault === true",
        "description": "Неисправность батареи питания"
    },
    {
        "id": 6,
        "expression": "state.sensors && state.sensors.isTempOutAirSensorError === true",
        "description": "Неисправность датчика температуры наружного воздуха"
    },
    {
        "id": 7,
        "expression": "state.sensors && state.sensors.isTemperature1SensorError === true",
        "description": "Неисправность датчика температуры котла №1 (TE11)"
    },
    {
        "id": 8,
        "expression": "state.sensors && state.sensors.isTemperature1HighLevel === true",
        "description": "Температура котла №1 (TE11): высокий уровень"
    },
    {
        "id": 9,
        "expression": "state.sensors && state.sensors.isTemperature1PreHighLevel === true",
        "description": "Температура котла №1 (TE11): предупредительно высокий уровень"
    },
    {
        "id": 10,
        "expression": "state.sensors && state.sensors.isTemperature2SensorError === true",
        "description": "Неисправность датчика температуры котла №2 (TE12)"
    },
    {
        "id": 11,
        "expression": "state.sensors && state.sensors.isTemperature2HighLevel === true",
        "description": "Температура котла №2 (TE12): высокий уровень"
    },
    {
        "id": 12,
        "expression": "state.sensors && state.sensors.isTemperature2PreHighLevel === true",
        "description": "Температура котла №2 (TE12): предупредительно высокий уровень"
    },
    {
        "id": 13,
        "expression": "state.sensors && state.sensors.isTemperature3SensorError === true",
        "description": "Неисправность датчика температуры подачи в сеть (TE1)"
    },
    {
        "id": 14,
        "expression": "state.sensors && state.sensors.isTemperature3HighLevel === true",
        "description": "Температура подачи в сеть (TE1): высокий уровень"
    },
    {
        "id": 15,
        "expression": "state.sensors && state.sensors.isTemperature3PreHighLevel === true",
        "description": "Температура подачи в сеть (TE1): предупредительно высокий уровень"
    },
    {
        "id": 16,
        "expression": "state.sensors && state.sensors.isTemperature3PreLowLevel === true",
        "description": "Температура подачи в сеть (TE1): предупредительно низкий уровень"
    },
    {
        "id": 17,
        "expression": "state.sensors && state.sensors.isTemperature3LowLevel === true",
        "description": "Температура подачи в сеть (TE1): низкий уровень"
    },
    {
        "id": 18,
        "expression": "state.sensors && state.sensors.isTemperature4SensorError === true",
        "description": "Неисправность датчика температуры обратки контура 1 (TE21)"
    },
    {
        "id": 19,
        "expression": "state.sensors && state.sensors.isTemperature4PreLowLevel === true",
        "description": "Температура обратки контура 1 (TE21): предупредительно низкий уровень"
    },
    {
        "id": 20,
        "expression": "state.sensors && state.sensors.isTemperature4LowLevel === true",
        "description": "Температура обратки контура 1 (TE21): низкий уровень"
    },
    {
        "id": 21,
        "expression": "state.sensors && state.sensors.isTemperature5SensorError === true",
        "description": "Неисправность датчика температуры обратки контура 2 (TE22)"
    },
    {
        "id": 22,
        "expression": "state.sensors && state.sensors.isTemperature5PreLowLevel === true",
        "description": "Температура обратки контура 2 (TE22): предупредительно низкий уровень"
    },
    {
        "id": 23,
        "expression": "state.sensors && state.sensors.isTemperature5LowLevel === true",
        "description": "Температура обратки контура 2 (TE22): низкий уровень"
    },
    {
        "id": 24,
        "expression": "state.sensors && state.sensors.isTemperature6SensorError === true",
        "description": "Неисправность датчика температуры T6"
    },
    {
        "id": 25,
        "expression": "state.sensors && state.sensors.isPressure1SensorError === true",
        "description": "Неисправность датчика давления подачи в сеть (PE1)"
    },
    {
        "id": 26,
        "expression": "state.sensors && state.sensors.isPressure1HighLevel === true",
        "description": "Давление подачи в сеть (PE1): высокий уровень"
    },
    {
        "id": 27,
        "expression": "state.sensors && state.sensors.isPressure1PreHighLevel === true",
        "description": "Давление подачи в сеть (PE1): предупредительно высокий уровень"
    },
    {
        "id": 28,
        "expression": "state.sensors && state.sensors.isPressure1PreLowLevel === true",
        "description": "Давление подачи в сеть (PE1): предупредительно низкий уровень"
    },
    {
        "id": 29,
        "expression": "state.sensors && state.sensors.isPressure1LowLevel === true",
        "description": "Давление подачи в сеть (PE1): низкий уровень"
    },
    {
        "id": 30,
        "expression": "state.sensors && state.sensors.isPressure2SensorError === true",
        "description": "Неисправность датчика давления обратки после сетевых насосов (PE22)"
    },
    {
        "id": 31,
        "expression": "state.sensors && state.sensors.isPressure2PreLowLevel === true",
        "description": "Давление обратки после сетевых насосов (PE22): предупредительно низкий уровень"
    },
    {
        "id": 32,
        "expression": "state.sensors && state.sensors.isPressure2LowLevel === true",
        "description": "Давление обратки после сетевых насосов (PE22): низкий уровень"
    },
    {
        "id": 33,
        "expression": "state.sensors && state.sensors.isPressure3SensorError === true",
        "description": "Неисправность датчика давления обратки перед сетевыми насосами (PE21)"
    },
    {
        "id": 34,
        "expression": "state.sensors && state.sensors.isPressure3PreLowLevel === true",
        "description": "Давление обратки перед сетевыми насосами (PE21): предупредительно низкий уровень"
    },
    {
        "id": 35,
        "expression": "state.sensors && state.sensors.isPressure3LowLevel === true",
        "description": "Давление обратки перед сетевыми насосами (PE21): низкий уровень"
    },
    {
        "id": 36,
        "expression": "state.boilers && state.boilers[0] && state.boilers[0].isAlarm === true",
        "description": "Котёл №1: авария"
    },
    {
        "id": 37,
        "expression": "state.boilers && state.boilers[0] && state.boilers[0].isStartError === true",
        "description": "Котёл №1: ошибка запуска"
    },
    {
        "id": 38,
        "expression": "state.boilers && state.boilers[0] && state.boilers[0].isLocked === true",
        "description": "Котёл №1: заблокирован"
    },
    {
        "id": 39,
        "expression": "state.boilers && state.boilers[1] && state.boilers[1].isAlarm === true",
        "description": "Котёл №2: авария"
    },
    {
        "id": 40,
        "expression": "state.boilers && state.boilers[1] && state.boilers[1].isStartError === true",
        "description": "Котёл №2: ошибка запуска"
    },
    {
        "id": 41,
        "expression": "state.boilers && state.boilers[1] && state.boilers[1].isLocked === true",
        "description": "Котёл №2: заблокирован"
    }
]$muslum9$::jsonb)
        ) AS configuration(device_code, rules)
    LOOP
        SELECT count(*), min(id) INTO device_count, target_device_id
        FROM public.device WHERE code = target.device_code;

        IF device_count <> 1 THEN
            RAISE EXCEPTION 'Expected exactly one device %, found %', target.device_code, device_count;
        END IF;

        SELECT count(*), min(id) INTO emergency_count, emergency_id
        FROM public.emergency WHERE "deviceId" = target_device_id;

        IF emergency_count <> 1 THEN
            RAISE EXCEPTION 'Expected exactly one emergency registration for %, found %', target.device_code, emergency_count;
        END IF;

        SELECT reasons::jsonb INTO existing_rules
        FROM public.emergency WHERE id = emergency_id;

        IF existing_rules IS NULL OR jsonb_typeof(existing_rules) <> 'array' THEN
            RAISE EXCEPTION 'Emergency reasons for % must be a JSON array', target.device_code;
        END IF;

        IF existing_rules = target.rules THEN
            CONTINUE;
        END IF;

        IF existing_rules <> '[]'::jsonb THEN
            RAISE EXCEPTION 'Refusing to overwrite non-empty emergency reasons for %', target.device_code;
        END IF;

        UPDATE public.emergency
        SET reasons = target.rules::json, "updatedAt" = now()
        WHERE id = emergency_id;
    END LOOP;
END
$migration$;

COMMIT;
