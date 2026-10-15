-- The gas fields of the Царёво-1 VKT-7 (tsarevo1-vkt7-22222222) are named per boiler: ТВ1 pipes 1 and 2 are boilers 1
-- and 2, ТВ2 pipes 1 and 2 boilers 3 and 4 (gasVolumeSystem1Pipe1 -> gasVolumeBoiler1, gasVolumeFlowRateSystem2Pipe2 ->
-- gasVolumeFlowRateBoiler4, ...). Renames the keys in the states stored before the Node-RED mapping changed. Only rows
-- still carrying an old key change, so running it again changes nothing. Run after restarting Node-RED; a row written
-- in between keeps the old names, so run it once more if one shows up.
BEGIN;

WITH renamed(old_key, new_key) AS (
    VALUES ('gasVolumeFlowRateSystem1Pipe1', 'gasVolumeFlowRateBoiler1'),
           ('gasVolumeFlowRateSystem1Pipe2', 'gasVolumeFlowRateBoiler2'),
           ('gasVolumeFlowRateSystem2Pipe1', 'gasVolumeFlowRateBoiler3'),
           ('gasVolumeFlowRateSystem2Pipe2', 'gasVolumeFlowRateBoiler4'),
           ('gasVolumeSystem1Pipe1', 'gasVolumeBoiler1'),
           ('gasVolumeSystem1Pipe2', 'gasVolumeBoiler2'),
           ('gasVolumeSystem2Pipe1', 'gasVolumeBoiler3'),
           ('gasVolumeSystem2Pipe2', 'gasVolumeBoiler4')
)
UPDATE public.device_state
SET state = (state - (SELECT array_agg(old_key) FROM renamed))
            || (SELECT jsonb_object_agg(new_key, state -> old_key) FROM renamed WHERE state ? old_key)
WHERE "deviceId" = (SELECT id FROM public.device WHERE code = 'tsarevo1-vkt7-22222222')
  AND state ?| (SELECT array_agg(old_key) FROM renamed);

COMMIT;
