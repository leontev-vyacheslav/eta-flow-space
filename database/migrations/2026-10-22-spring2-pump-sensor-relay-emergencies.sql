-- Весна-2 (spring2-boiler-room) emergencies from the 2026-10-22 review of 30 days of history (ids 52–62):
-- - "Авария сетевого насоса N" (52–54) on networkPumps[N-1].state === 512, as Царёво-2/Statum have; dry run and the
--   converter alarm keep their own rules (32–37), so the text does not repeat them.
-- - TE5, PE4, PE3, TE12 (55–58): the PLC's sensor status from "авария" (4, outside its alarm limits) up — the alarm
--   adds the value, the faults (8 sensor fault, 16 calibration, 32 overload) name themselves from the SensorStatus enum.
-- - PE1, PE2, TE6 (59–61): only the sensor faults (status 8 and up), their alarm level is already covered by our own
--   limits (11, 12, 28–31).
-- - Низкое давление исходной воды (62): the relay spmp_pout_ll_di (DI 694) is normally open — since the input fix
--   (2026-10-20) it read 1 only once, in the sample with the lowest PE3 (3.96 bar against the usual 4.3–4.6).
-- The faulty boiler sensors (TE7 of boiler 1, TE4 of boiler 4) and the unused diesel levels (LE1, LE2) get no rules:
-- they would never clear. title keeps a dynamic reason constant for the emergency summary report. The reasons are
-- appended as they are (json, the existing ones untouched); a second run changes nothing.
BEGIN;

WITH added_reasons(reasons) AS (
    VALUES ($json$[
        {
            "id": 52,
            "expression": "state.networkPumps[0].state === 512",
            "description": "Авария сетевого насоса 1"
        },
        {
            "id": 53,
            "expression": "state.networkPumps[1].state === 512",
            "description": "Авария сетевого насоса 2"
        },
        {
            "id": 54,
            "expression": "state.networkPumps[2].state === 512",
            "description": "Авария сетевого насоса 3"
        },
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
        },
        {
            "id": 62,
            "expression": "state.isSourceWaterRelay === true",
            "description": "Низкое давление исходной воды (реле давления)"
        }
    ]$json$::json)
)
UPDATE public.emergency e
SET reasons = (
        SELECT json_agg(r.reason ORDER BY r.n)
        FROM (
            SELECT existing.reason, existing.n
            FROM json_array_elements(e.reasons) WITH ORDINALITY AS existing(reason, n)
            UNION ALL
            SELECT added.reason, 1000 + added.n
            FROM json_array_elements(ar.reasons) WITH ORDINALITY AS added(reason, n)
        ) r
    ),
    "updatedAt" = now()
FROM public.device d, added_reasons ar
WHERE d.id = e."deviceId"
  AND d.code = 'spring2-boiler-room'
  AND NOT EXISTS (
      SELECT 1
      FROM json_array_elements(e.reasons) AS x(reason)
      WHERE (x.reason->>'id')::int BETWEEN 52 AND 62
  );

COMMIT;
