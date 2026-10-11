-- Irvis (spring2-irvis) state: human-readable field names, boolean flags, and the flags recomputed from the raw words.
-- The old Modbus-node polling decoded the flags from msg.payload (the raw Modbus result) instead of the decoded
-- values, so every derived flag was stored as 0, although the raw words CommonFlags (Fl_a) and IndivFlags (Fl_b) were
-- right (IndivFlags = 12, "no flow", in ~4440 rows). The new collect-device-state uses new names and booleans; this
-- converts the history the same way:
--   accumulatedVolume -> volumeStandard, currentFlowRateNc -> volumeFlowRateStandard,
--   currentFlowRateWc -> volumeFlowRateWorking, currentPressure -> pressure, currentTemp -> temperature,
--   timeOfWork -> operatingTime, CommonFlags -> generalFlags, IndivFlags -> meterFlags,
--   and the flags (protocol table 1.4.1) recomputed from the raw words under their new names as booleans; the old
--   flag keys (powerOffFl ... badQdurningArcFl) are removed.
-- Rows already in the new form (written by the new reader) have no IndivFlags/CommonFlags and are not touched, so the
-- migration can run before or after the deploy and again without changing anything. Replaces the never-applied
-- 2026-10-11-irvis-flags-from-raw-words.sql.
BEGIN;

UPDATE public.device_state ds
SET state = (ds.state - ARRAY[
        'accumulatedVolume', 'currentFlowRateNc', 'currentFlowRateWc', 'currentPressure', 'currentTemp', 'timeOfWork',
        'CommonFlags', 'IndivFlags',
        'powerOffFl', 'dataChangeFl', 'errRTCFl', 'lowQFl', 'highQFl', 'highFQFl', 'waterQFl', 'errQFl', 'noFlowFl',
        'badQFl', 'analysisQFl', 'outOfRangeTFl', 'outOfRangePFl', 'noDataFl', 'writeSettingFl', 'badQdurningArcFl',
        'badQduringArcFl'])
    || jsonb_build_object(
        'volumeStandard', ds.state->'accumulatedVolume',
        'volumeFlowRateStandard', ds.state->'currentFlowRateNc',
        'volumeFlowRateWorking', ds.state->'currentFlowRateWc',
        'pressure', ds.state->'currentPressure',
        'temperature', ds.state->'currentTemp',
        'operatingTime', ds.state->'timeOfWork',
        'generalFlags', f.c,
        'meterFlags', f.i,
        'powerOffFlag', f.c & 1 = 1,
        'dateTimeChangedFlag', (f.c >> 1) & 1 = 1,
        'clockFailureFlag', (f.c >> 2) & 1 = 1,
        'lowFlowRateFlag', f.i & 3 = 1,
        'highFlowRateFlag', f.i & 3 = 2,
        'highSensorFrequencyFlag', f.i & 3 = 3,
        'waterInFlowSensorFlag', (f.i >> 2) & 3 = 1,
        'flowSensorFailureFlag', (f.i >> 2) & 3 = 2,
        'noFlowFlag', (f.i >> 2) & 3 = 3,
        'badFlowSignalFlag', (f.i >> 4) & 3 = 1,
        'flowSignalAnalysisFlag', (f.i >> 4) & 3 = 2,
        'temperatureOutOfRangeFlag', (f.i >> 6) & 1 = 1,
        'pressureOutOfRangeFlag', (f.i >> 7) & 1 = 1,
        'noDataFlag', (f.i >> 8) & 1 = 1,
        'constantsArchiveRecordFlag', (f.i >> 9) & 1 = 1,
        'badSignalAccountingFlag', (f.i >> 10) & 1 = 1)
FROM (
    SELECT id, (state->>'IndivFlags')::int AS i, (state->>'CommonFlags')::int AS c
    FROM public.device_state
    WHERE "deviceId" = (SELECT id FROM public.device WHERE code = 'spring2-irvis')
      AND state ? 'IndivFlags' AND state ? 'CommonFlags'
) f
WHERE ds.id = f.id;

COMMIT;
