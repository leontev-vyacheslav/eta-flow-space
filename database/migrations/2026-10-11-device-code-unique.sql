-- Node-RED now stores each device state by the device's code (collect-device-state: DEVICE_CODE, see
-- flow-space/src/helpers/store-device-state-to-cache.js) instead of its position among the flow's devices, so
-- every device needs a code and no two devices may share one. All 14 devices had distinct, non-empty codes when
-- this was written (2026-10-11).
BEGIN;

ALTER TABLE public.device ALTER COLUMN code SET NOT NULL;

ALTER TABLE ONLY public.device
    ADD CONSTRAINT device_code_unique UNIQUE (code);

COMMIT;
