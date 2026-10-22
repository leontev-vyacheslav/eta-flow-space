-- Весна-2 (spring2-boiler-room): a boiler in the PLC state ALARM (BoilerState 128) raised no emergency, only its
-- water pressure flags had rules (38–45). This adds "Авария котла N" (ids 48–51) on boilers[N-1].state === 128, like
-- Царёво-2/Statum ("Авария котла N. <cause>"); the description names the active causes: the burner failure and the
-- alarm word flags without their own rules (max water temperature, no flow, outlet valve, circulation pumps). The
-- burner flag alone is not a rule: in the history it comes with state 128, apart from one minute of boiler 4 in
-- NOT_READY. title keeps the reason constant for the emergency summary report. The reasons are appended as they are
-- (json, the existing ones untouched); a second run changes nothing.
BEGIN;

WITH added_reasons(reasons) AS (
    VALUES ($json$[
        {
            "id": 48,
            "expression": "state.boilers[0].state === 128",
            "title": "Авария котла 1",
            "description": "`Авария котла 1${state.boilers[0].isBurnerFailure ? '. Авария горелки' : ''}${state.boilers[0].isMaxWaterTemperature ? '. Максимальная температура воды' : ''}${state.boilers[0].isNoFlow ? '. Нет протока' : ''}${state.boilers[0].isOutputValveFailure ? '. Авария выходной задвижки' : ''}${state.boilers[0].isCirculationPumpFailure ? '. Авария циркуляционных насосов' : ''}`"
        },
        {
            "id": 49,
            "expression": "state.boilers[1].state === 128",
            "title": "Авария котла 2",
            "description": "`Авария котла 2${state.boilers[1].isBurnerFailure ? '. Авария горелки' : ''}${state.boilers[1].isMaxWaterTemperature ? '. Максимальная температура воды' : ''}${state.boilers[1].isNoFlow ? '. Нет протока' : ''}${state.boilers[1].isOutputValveFailure ? '. Авария выходной задвижки' : ''}${state.boilers[1].isCirculationPumpFailure ? '. Авария циркуляционных насосов' : ''}`"
        },
        {
            "id": 50,
            "expression": "state.boilers[2].state === 128",
            "title": "Авария котла 3",
            "description": "`Авария котла 3${state.boilers[2].isBurnerFailure ? '. Авария горелки' : ''}${state.boilers[2].isMaxWaterTemperature ? '. Максимальная температура воды' : ''}${state.boilers[2].isNoFlow ? '. Нет протока' : ''}${state.boilers[2].isOutputValveFailure ? '. Авария выходной задвижки' : ''}${state.boilers[2].isCirculationPumpFailure ? '. Авария циркуляционных насосов' : ''}`"
        },
        {
            "id": 51,
            "expression": "state.boilers[3].state === 128",
            "title": "Авария котла 4",
            "description": "`Авария котла 4${state.boilers[3].isBurnerFailure ? '. Авария горелки' : ''}${state.boilers[3].isMaxWaterTemperature ? '. Максимальная температура воды' : ''}${state.boilers[3].isNoFlow ? '. Нет протока' : ''}${state.boilers[3].isOutputValveFailure ? '. Авария выходной задвижки' : ''}${state.boilers[3].isCirculationPumpFailure ? '. Авария циркуляционных насосов' : ''}`"
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
      WHERE (x.reason->>'id')::int BETWEEN 48 AND 51
  );

COMMIT;
