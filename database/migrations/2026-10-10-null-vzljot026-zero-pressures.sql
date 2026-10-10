-- The old Modbus-node polling of the Vzljot026 (spring-vzljot026-1415796) produced presure1/presure2 (misspelled)
-- while collect-device-state read pressure1/pressure2, so pressureInputPipe/pressureReturnPipe were stored as 0 in
-- every row since the device was added. The real values are unknown (its pressure channels PD1/PD2 are switched
-- off; the new reader stores the pressures set in the calculator, 0.6/0.4 MPa), so the false zeros become null.
-- Only rows with both pressures exactly 0 change; run it after the new reader is deployed (rows written before that
-- are still zeros), and again if needed — it is safe to repeat.
BEGIN;

UPDATE public.device_state
SET state = state || '{"pressureInputPipe": null, "pressureReturnPipe": null}'::jsonb
WHERE "deviceId" = (SELECT id FROM public.device WHERE code = 'spring-vzljot026-1415796')
  AND state->'pressureInputPipe' = '0'::jsonb
  AND state->'pressureReturnPipe' = '0'::jsonb;

COMMIT;
