-- Rename the Царёво boiler room to Царёво-2 (device id 4, flow id 2).
-- The device code is the key of the statics folder (flow-space-statics/devices/<code>) and of states['<code>'] in the
-- mnemoschema, so deploy the renamed statics together with this migration. Node-RED finds its flow by uid, not by code.
BEGIN;

UPDATE public.device
SET code = 'tsarevo2-boiler-room',
    name = 'Котельная ЖК Царёво-2',
    description = 'Котельная ЖК Царёво-2',
    "updatedAt" = now()
WHERE id = 4 AND code = 'tsarevo-boiler-room';

UPDATE public.flow
SET code = 'tsarevo2-boiler-automation-t1',
    name = 'Котельная Царёво-2',
    description = 'Система мониторинга котельной ЖК Царёво-2',
    "updatedAt" = now()
WHERE id = 2 AND code = 'tsarevo-boiler-automation-t1';

COMMIT;
