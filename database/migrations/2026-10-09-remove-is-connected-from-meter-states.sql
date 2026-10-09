-- Remove isConnected from the stored states of the EK270, VKT-7 and KM-5 meters. Their Node-RED readers used to put
-- isConnected: true into every state; DeviceStateService manages the field now, and the stored value would override
-- the one it sets for a device without a live state. Run after Node-RED is restarted with the readers that no longer
-- set the field, otherwise new rows keep getting it.
BEGIN;

UPDATE public.device_state
SET state = state - 'isConnected'
WHERE state ? 'isConnected'
  AND "deviceId" IN (
      SELECT id FROM public.device
      WHERE code IN ('spring-ek270-1116061420', 'spring2-vkt-289452', 'tsarevo1-km5-418200')
  );

COMMIT;
