-- The Mercury230 reader scaled the phase currents by 0.01 instead of 0.001 (protocol: I = N / 1000), so currentL1-L3
-- of both meters (mercury230-26077096, mercury230-26077087) were stored 10 times too high. Fixed in the reworked
-- reader; this divides the stored history by 10. A row is changed only while its currents still disagree with its
-- apparent power: sum(I x U) above 3 x S (wrong rows show ~10 x S, correct rows ~1 x S), so the migration can run
-- before or after the new reader is deployed, and running it again changes nothing. Rows without load have zero
-- currents and need no change. Checked on 2026-10-10: 3053 + 1783 rows, ratios 8.8-11.1.
BEGIN;

UPDATE public.device_state
SET state = state || jsonb_build_object(
        'currentL1', round((state->>'currentL1')::numeric / 10, 3),
        'currentL2', round((state->>'currentL2')::numeric / 10, 3),
        'currentL3', round((state->>'currentL3')::numeric / 10, 3))
WHERE "deviceId" IN (SELECT id FROM public.device WHERE code IN ('mercury230-26077096', 'mercury230-26077087'))
  AND (state->>'apparentPowerTotal')::numeric > 0
  AND (state->>'currentL1')::numeric * (state->>'voltageL1')::numeric
    + (state->>'currentL2')::numeric * (state->>'voltageL2')::numeric
    + (state->>'currentL3')::numeric * (state->>'voltageL3')::numeric
    > 3 * (state->>'apparentPowerTotal')::numeric;

COMMIT;
