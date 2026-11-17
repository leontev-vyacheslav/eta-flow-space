-- Register Нурлат-5 monitoring and populate its PLC boolean alarm reasons.
-- IDs 1-80 cover 93 source flags; paired alarm/input and boiler fault/alarm
-- flags activate one reason per event. H/L warnings and HH/LL alarms stay separate.
-- Connection loss remains the dispatcher's built-in reason 100.
-- New registrations use the existing boiler-room three-minute history interval.
-- An empty existing list is populated; identical reruns preserve all timestamps.
-- Independently edited rules, malformed lists and duplicate registrations abort.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';

DO $migration$
DECLARE
    room_id integer;
    registration_count integer;
    registration_id integer;
    existing_rules jsonb;
    history_interval integer;
    desired_rules constant jsonb := $nurlat5$[
    {
        "id": 1,
        "expression": "state.isCO === true || state.isCOInputAlarm === true",
        "description": "Загазованность CO"
    },
    {
        "id": 2,
        "expression": "state.isCH === true || state.isCHInputAlarm === true",
        "description": "Загазованность CH₄"
    },
    {
        "id": 3,
        "expression": "state.isFireAlarm === true || state.isFireInputAlarm === true",
        "description": "Пожарная тревога"
    },
    {
        "id": 4,
        "expression": "state.isSecurityAlarm === true || state.isSecurityInputAlarm === true",
        "description": "Охранная сигнализация"
    },
    {
        "id": 5,
        "expression": "state.isBoilerMakeupPressureAlarm === true || state.isBoilerMakeupPressureInputAlarm === true",
        "description": "Авария давления подпитки котлового контура (PC1)"
    },
    {
        "id": 6,
        "expression": "state.isNetworkMakeupPressureAlarm === true || state.isNetworkMakeupPressureInputAlarm === true",
        "description": "Авария давления подпитки сетевого контура (PC2)"
    },
    {
        "id": 7,
        "expression": "(state.boilers && state.boilers[0] && state.boilers[0].isPumpDryRunAlarm === true) || (state.boilers && state.boilers[0] && state.boilers[0].isPumpDryRunInputAlarm === true)",
        "description": "Защита от сухого хода насосов котла К1.1 (PC3)"
    },
    {
        "id": 8,
        "expression": "(state.boilers && state.boilers[1] && state.boilers[1].isPumpDryRunAlarm === true) || (state.boilers && state.boilers[1] && state.boilers[1].isPumpDryRunInputAlarm === true)",
        "description": "Защита от сухого хода насосов котла К1.2 (PC4)"
    },
    {
        "id": 9,
        "expression": "state.isBoilerMakeupPumpDryRunAlarm === true || state.isBoilerMakeupPumpDryRunInputAlarm === true",
        "description": "Защита от сухого хода насосов подпитки котлового контура (PC5)"
    },
    {
        "id": 10,
        "expression": "state.isNetworkMakeupPumpDryRunAlarm === true || state.isNetworkMakeupPumpDryRunInputAlarm === true",
        "description": "Защита от сухого хода насосов подпитки сетевого контура (PC6)"
    },
    {
        "id": 11,
        "expression": "state.isNetworkPumpDryRunAlarm === true || state.isNetworkPumpDryRunInputAlarm === true",
        "description": "Защита от сухого хода сетевых насосов (PC7)"
    },
    {
        "id": 12,
        "expression": "(state.boilers && state.boilers[0] && state.boilers[0].isFault === true) || (state.boilers && state.boilers[0] && state.boilers[0].isAlarm === true)",
        "description": "Авария котла К1.1"
    },
    {
        "id": 13,
        "expression": "(state.boilers && state.boilers[0] && state.boilers[0].isLocked === true)",
        "description": "Блокировка котла К1.1"
    },
    {
        "id": 14,
        "expression": "(state.boilers && state.boilers[1] && state.boilers[1].isFault === true) || (state.boilers && state.boilers[1] && state.boilers[1].isAlarm === true)",
        "description": "Авария котла К1.2"
    },
    {
        "id": 15,
        "expression": "(state.boilers && state.boilers[1] && state.boilers[1].isLocked === true)",
        "description": "Блокировка котла К1.2"
    },
    {
        "id": 16,
        "expression": "(state.boilerPumps && state.boilerPumps[0] && state.boilerPumps[0].isStartError === true)",
        "description": "Насос H1.1: ошибка запуска или самопроизвольный останов"
    },
    {
        "id": 17,
        "expression": "(state.boilerPumps && state.boilerPumps[1] && state.boilerPumps[1].isStartError === true)",
        "description": "Насос H1.2: ошибка запуска или самопроизвольный останов"
    },
    {
        "id": 18,
        "expression": "(state.boilerPumps && state.boilerPumps[2] && state.boilerPumps[2].isStartError === true)",
        "description": "Насос H2.1: ошибка запуска или самопроизвольный останов"
    },
    {
        "id": 19,
        "expression": "(state.boilerPumps && state.boilerPumps[3] && state.boilerPumps[3].isStartError === true)",
        "description": "Насос H2.2: ошибка запуска или самопроизвольный останов"
    },
    {
        "id": 20,
        "expression": "(state.boilerMakeupPumps && state.boilerMakeupPumps[0] && state.boilerMakeupPumps[0].isStartError === true)",
        "description": "Насос H3.1: ошибка запуска или самопроизвольный останов"
    },
    {
        "id": 21,
        "expression": "(state.boilerMakeupPumps && state.boilerMakeupPumps[1] && state.boilerMakeupPumps[1].isStartError === true)",
        "description": "Насос H3.2: ошибка запуска или самопроизвольный останов"
    },
    {
        "id": 22,
        "expression": "(state.networkMakeupPumps && state.networkMakeupPumps[0] && state.networkMakeupPumps[0].isStartError === true)",
        "description": "Насос H4.1: ошибка запуска или самопроизвольный останов"
    },
    {
        "id": 23,
        "expression": "(state.networkMakeupPumps && state.networkMakeupPumps[1] && state.networkMakeupPumps[1].isStartError === true)",
        "description": "Насос H4.2: ошибка запуска или самопроизвольный останов"
    },
    {
        "id": 24,
        "expression": "(state.networkPumps && state.networkPumps[0] && state.networkPumps[0].isStartError === true)",
        "description": "Насос H5.1: ошибка запуска или самопроизвольный останов"
    },
    {
        "id": 25,
        "expression": "(state.networkPumps && state.networkPumps[1] && state.networkPumps[1].isStartError === true)",
        "description": "Насос H5.2: ошибка запуска или самопроизвольный останов"
    },
    {
        "id": 26,
        "expression": "(state.sensors && state.sensors.isTempOutAirSensorError === true)",
        "description": "Неисправность датчика температуры наружного воздуха (TE1)"
    },
    {
        "id": 27,
        "expression": "(state.sensors && state.sensors.isTempRoomAirSensorError === true)",
        "description": "Неисправность датчика температуры воздуха в помещении (TE2)"
    },
    {
        "id": 28,
        "expression": "(state.sensors && state.sensors.isTempOutBoiler1SensorError === true)",
        "description": "Неисправность датчика температуры после котла К1.1 (TE3)"
    },
    {
        "id": 29,
        "expression": "(state.sensors && state.sensors.isTempOutBoiler1PreHighLevel === true)",
        "description": "Контроль температуры после котла К1.1 (TE3): предупредительно высокий уровень (H)"
    },
    {
        "id": 30,
        "expression": "(state.sensors && state.sensors.isTempOutBoiler1HighLevel === true)",
        "description": "Контроль температуры после котла К1.1 (TE3): высокий уровень (HH)"
    },
    {
        "id": 31,
        "expression": "(state.sensors && state.sensors.isTempInBoiler1SensorError === true)",
        "description": "Неисправность датчика температуры до котла К1.1 (TE4)"
    },
    {
        "id": 32,
        "expression": "(state.sensors && state.sensors.isTempOutBoiler2SensorError === true)",
        "description": "Неисправность датчика температуры после котла К1.2 (TE5)"
    },
    {
        "id": 33,
        "expression": "(state.sensors && state.sensors.isTempOutBoiler2PreHighLevel === true)",
        "description": "Контроль температуры после котла К1.2 (TE5): предупредительно высокий уровень (H)"
    },
    {
        "id": 34,
        "expression": "(state.sensors && state.sensors.isTempOutBoiler2HighLevel === true)",
        "description": "Контроль температуры после котла К1.2 (TE5): высокий уровень (HH)"
    },
    {
        "id": 35,
        "expression": "(state.sensors && state.sensors.isTempInBoiler2SensorError === true)",
        "description": "Неисправность датчика температуры до котла К1.2 (TE6)"
    },
    {
        "id": 36,
        "expression": "(state.sensors && state.sensors.isTempOutHeatExchangerSensorError === true)",
        "description": "Неисправность датчика температуры после теплообменника (TE7)"
    },
    {
        "id": 37,
        "expression": "(state.sensors && state.sensors.isTempInHeatExchangerSensorError === true)",
        "description": "Неисправность датчика температуры до теплообменника (TE8)"
    },
    {
        "id": 38,
        "expression": "(state.sensors && state.sensors.isTempOutNetSensorError === true)",
        "description": "Неисправность датчика температуры подачи теплосети (TE9)"
    },
    {
        "id": 39,
        "expression": "(state.sensors && state.sensors.isTempInNetSensorError === true)",
        "description": "Неисправность датчика температуры обратки теплосети (TE10)"
    },
    {
        "id": 40,
        "expression": "(state.sensors && state.sensors.isPressOutBoiler1SensorError === true)",
        "description": "Неисправность датчика давления после котла К1.1 (PE1)"
    },
    {
        "id": 41,
        "expression": "(state.sensors && state.sensors.isPressOutBoiler1PreHighLevel === true)",
        "description": "Контроль давления после котла К1.1 (PE1): предупредительно высокий уровень (H)"
    },
    {
        "id": 42,
        "expression": "(state.sensors && state.sensors.isPressOutBoiler1PreLowLevel === true)",
        "description": "Контроль давления после котла К1.1 (PE1): предупредительно низкий уровень (L)"
    },
    {
        "id": 43,
        "expression": "(state.sensors && state.sensors.isPressOutBoiler1HighLevel === true)",
        "description": "Контроль давления после котла К1.1 (PE1): высокий уровень (HH)"
    },
    {
        "id": 44,
        "expression": "(state.sensors && state.sensors.isPressOutBoiler1LowLevel === true)",
        "description": "Контроль давления после котла К1.1 (PE1): низкий уровень (LL)"
    },
    {
        "id": 45,
        "expression": "(state.sensors && state.sensors.isPressInBoiler1SensorError === true)",
        "description": "Неисправность датчика давления до котла К1.1 (PE2)"
    },
    {
        "id": 46,
        "expression": "(state.sensors && state.sensors.isPressInBoiler1PreLowLevel === true)",
        "description": "Контроль давления до котла К1.1 (PE2): предупредительно низкий уровень (L)"
    },
    {
        "id": 47,
        "expression": "(state.sensors && state.sensors.isPressInBoiler1LowLevel === true)",
        "description": "Контроль давления до котла К1.1 (PE2): низкий уровень (LL)"
    },
    {
        "id": 48,
        "expression": "(state.sensors && state.sensors.isPressOutBoiler2SensorError === true)",
        "description": "Неисправность датчика давления после котла К1.2 (PE3)"
    },
    {
        "id": 49,
        "expression": "(state.sensors && state.sensors.isPressOutBoiler2PreHighLevel === true)",
        "description": "Контроль давления после котла К1.2 (PE3): предупредительно высокий уровень (H)"
    },
    {
        "id": 50,
        "expression": "(state.sensors && state.sensors.isPressOutBoiler2PreLowLevel === true)",
        "description": "Контроль давления после котла К1.2 (PE3): предупредительно низкий уровень (L)"
    },
    {
        "id": 51,
        "expression": "(state.sensors && state.sensors.isPressOutBoiler2HighLevel === true)",
        "description": "Контроль давления после котла К1.2 (PE3): высокий уровень (HH)"
    },
    {
        "id": 52,
        "expression": "(state.sensors && state.sensors.isPressOutBoiler2LowLevel === true)",
        "description": "Контроль давления после котла К1.2 (PE3): низкий уровень (LL)"
    },
    {
        "id": 53,
        "expression": "(state.sensors && state.sensors.isPressInBoiler2SensorError === true)",
        "description": "Неисправность датчика давления до котла К1.2 (PE4)"
    },
    {
        "id": 54,
        "expression": "(state.sensors && state.sensors.isPressInBoiler2PreLowLevel === true)",
        "description": "Контроль давления до котла К1.2 (PE4): предупредительно низкий уровень (L)"
    },
    {
        "id": 55,
        "expression": "(state.sensors && state.sensors.isPressInBoiler2LowLevel === true)",
        "description": "Контроль давления до котла К1.2 (PE4): низкий уровень (LL)"
    },
    {
        "id": 56,
        "expression": "(state.sensors && state.sensors.isPressBoilerCircuitSensorError === true)",
        "description": "Неисправность датчика давления котлового контура (PE5)"
    },
    {
        "id": 57,
        "expression": "(state.sensors && state.sensors.isLevelBoilerMakeupTankSensorError === true)",
        "description": "Неисправность датчика уровня в емкости подпитки котлового контура (PE6)"
    },
    {
        "id": 58,
        "expression": "(state.sensors && state.sensors.isLevelBoilerMakeupTankPreHighLevel === true)",
        "description": "Контроль уровня в емкости подпитки котлового контура (PE6): предупредительно высокий уровень (H)"
    },
    {
        "id": 59,
        "expression": "(state.sensors && state.sensors.isLevelBoilerMakeupTankPreLowLevel === true)",
        "description": "Контроль уровня в емкости подпитки котлового контура (PE6): предупредительно низкий уровень (L)"
    },
    {
        "id": 60,
        "expression": "(state.sensors && state.sensors.isLevelBoilerMakeupTankHighLevel === true)",
        "description": "Контроль уровня в емкости подпитки котлового контура (PE6): высокий уровень (HH)"
    },
    {
        "id": 61,
        "expression": "(state.sensors && state.sensors.isLevelBoilerMakeupTankLowLevel === true)",
        "description": "Контроль уровня в емкости подпитки котлового контура (PE6): низкий уровень (LL)"
    },
    {
        "id": 62,
        "expression": "(state.sensors && state.sensors.isLevelNetworkMakeupTankSensorError === true)",
        "description": "Неисправность датчика уровня в емкости подпитки сетевого контура (PE7)"
    },
    {
        "id": 63,
        "expression": "(state.sensors && state.sensors.isLevelNetworkMakeupTankPreHighLevel === true)",
        "description": "Контроль уровня в емкости подпитки сетевого контура (PE7): предупредительно высокий уровень (H)"
    },
    {
        "id": 64,
        "expression": "(state.sensors && state.sensors.isLevelNetworkMakeupTankPreLowLevel === true)",
        "description": "Контроль уровня в емкости подпитки сетевого контура (PE7): предупредительно низкий уровень (L)"
    },
    {
        "id": 65,
        "expression": "(state.sensors && state.sensors.isLevelNetworkMakeupTankHighLevel === true)",
        "description": "Контроль уровня в емкости подпитки сетевого контура (PE7): высокий уровень (HH)"
    },
    {
        "id": 66,
        "expression": "(state.sensors && state.sensors.isLevelNetworkMakeupTankLowLevel === true)",
        "description": "Контроль уровня в емкости подпитки сетевого контура (PE7): низкий уровень (LL)"
    },
    {
        "id": 67,
        "expression": "(state.sensors && state.sensors.isPressInHeatExchangerSensorError === true)",
        "description": "Неисправность датчика давления до теплообменника (PE8)"
    },
    {
        "id": 68,
        "expression": "(state.sensors && state.sensors.isPressOutNetSensorError === true)",
        "description": "Неисправность датчика давления после сетевых насосов (PE9)"
    },
    {
        "id": 69,
        "expression": "(state.sensors && state.sensors.isPressOutNetPreHighLevel === true)",
        "description": "Контроль давления после сетевых насосов (PE9): предупредительно высокий уровень (H)"
    },
    {
        "id": 70,
        "expression": "(state.sensors && state.sensors.isPressOutNetPreLowLevel === true)",
        "description": "Контроль давления после сетевых насосов (PE9): предупредительно низкий уровень (L)"
    },
    {
        "id": 71,
        "expression": "(state.sensors && state.sensors.isPressOutNetHighLevel === true)",
        "description": "Контроль давления после сетевых насосов (PE9): высокий уровень (HH)"
    },
    {
        "id": 72,
        "expression": "(state.sensors && state.sensors.isPressOutNetLowLevel === true)",
        "description": "Контроль давления после сетевых насосов (PE9): низкий уровень (LL)"
    },
    {
        "id": 73,
        "expression": "(state.sensors && state.sensors.isPressInNetSensorError === true)",
        "description": "Неисправность датчика давления обратки теплосети (PE10)"
    },
    {
        "id": 74,
        "expression": "(state.sensors && state.sensors.isPressInNetPreLowLevel === true)",
        "description": "Контроль давления обратки теплосети (PE10): предупредительно низкий уровень (L)"
    },
    {
        "id": 75,
        "expression": "(state.sensors && state.sensors.isPressInNetLowLevel === true)",
        "description": "Контроль давления обратки теплосети (PE10): низкий уровень (LL)"
    },
    {
        "id": 76,
        "expression": "(state.sensors && state.sensors.isPressGasSensorError === true)",
        "description": "Неисправность датчика давления газа (PE11)"
    },
    {
        "id": 77,
        "expression": "(state.sensors && state.sensors.isPressGasPreHighLevel === true)",
        "description": "Контроль давления газа (PE11): предупредительно высокий уровень (H)"
    },
    {
        "id": 78,
        "expression": "(state.sensors && state.sensors.isPressGasPreLowLevel === true)",
        "description": "Контроль давления газа (PE11): предупредительно низкий уровень (L)"
    },
    {
        "id": 79,
        "expression": "(state.sensors && state.sensors.isPressGasHighLevel === true)",
        "description": "Контроль давления газа (PE11): высокий уровень (HH)"
    },
    {
        "id": 80,
        "expression": "(state.sensors && state.sensors.isPressGasLowLevel === true)",
        "description": "Контроль давления газа (PE11): низкий уровень (LL)"
    }
]$nurlat5$::jsonb;
BEGIN
    -- Serializes reruns for this room, including creation without a unique deviceId constraint.
    SELECT id INTO room_id FROM public.device
    WHERE code = 'nurlat-5-boiler-room' FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Expected the registered nurlat-5-boiler-room device';
    END IF;

    PERFORM id FROM public.emergency WHERE "deviceId" = room_id FOR UPDATE;
    SELECT count(*), min(id) INTO registration_count, registration_id
    FROM public.emergency WHERE "deviceId" = room_id;

    IF registration_count > 1 THEN
        RAISE EXCEPTION 'Multiple emergency registrations for nurlat-5-boiler-room';
    ELSIF registration_count = 0 THEN
        INSERT INTO public.emergency
            ("deviceId", reasons, "updateStateInterval", "createdAt", "updatedAt")
        VALUES (room_id, desired_rules::json, 3, now(), now());
    ELSE
        SELECT reasons::jsonb, "updateStateInterval" INTO existing_rules, history_interval
        FROM public.emergency WHERE id = registration_id;
        IF jsonb_typeof(existing_rules) IS DISTINCT FROM 'array' THEN
            RAISE EXCEPTION 'Expected an array of Nurlat-5 emergency reasons';
        END IF;
        IF history_interval IS NULL OR history_interval <= 0 THEN
            RAISE EXCEPTION 'Expected a positive Nurlat-5 emergency history interval';
        END IF;
        IF existing_rules = desired_rules THEN
            NULL; -- Preserve existing registration metadata on an identical rerun.
        ELSIF existing_rules = '[]'::jsonb THEN
            UPDATE public.emergency SET reasons = desired_rules::json, "updatedAt" = now()
            WHERE id = registration_id;
        ELSE
            RAISE EXCEPTION 'Refusing to overwrite independently edited Nurlat-5 emergency reasons';
        END IF;
    END IF;
END
$migration$;

COMMIT;
