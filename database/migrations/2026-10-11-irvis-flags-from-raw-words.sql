-- The old Modbus-node polling of the Irvis (spring2-irvis) decoded its flag words from msg.payload (the raw Modbus
-- result) instead of the decoded values, so every derived flag (powerOffFl, noFlowFl, lowQFl...) was stored as 0,
-- although the raw words CommonFlags (Fl_a) and IndivFlags (Fl_b) were stored correctly (IndivFlags = 12, "no flow",
-- in ~4440 rows). This recomputes the derived flags from the raw words (protocol table 1.4.1, as the new
-- collect-device-state does) and renames the misspelled badQdurningArcFl to badQduringArcFl. The result depends only
-- on the raw words, so running it again changes nothing.
BEGIN;

UPDATE public.device_state ds
SET state = (ds.state - 'badQdurningArcFl') || jsonb_build_object(
        'powerOffFl', f.c & 1,
        'dataChangeFl', (f.c >> 1) & 1,
        'errRTCFl', (f.c >> 2) & 1,
        'lowQFl', (f.i & 3 = 1)::int,
        'highQFl', (f.i & 3 = 2)::int,
        'highFQFl', (f.i & 3 = 3)::int,
        'waterQFl', ((f.i >> 2) & 3 = 1)::int,
        'errQFl', ((f.i >> 2) & 3 = 2)::int,
        'noFlowFl', ((f.i >> 2) & 3 = 3)::int,
        'badQFl', ((f.i >> 4) & 3 = 1)::int,
        'analysisQFl', ((f.i >> 4) & 3 = 2)::int,
        'outOfRangeTFl', (f.i >> 6) & 1,
        'outOfRangePFl', (f.i >> 7) & 1,
        'noDataFl', (f.i >> 8) & 1,
        'writeSettingFl', (f.i >> 9) & 1,
        'badQduringArcFl', (f.i >> 10) & 1)
FROM (
    SELECT id, (state->>'IndivFlags')::int AS i, (state->>'CommonFlags')::int AS c
    FROM public.device_state
    WHERE "deviceId" = (SELECT id FROM public.device WHERE code = 'spring2-irvis')
      AND state ? 'IndivFlags' AND state ? 'CommonFlags'
) f
WHERE ds.id = f.id;

COMMIT;
