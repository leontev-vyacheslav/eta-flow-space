-- Царёво-1's KM-5 heat meter is 413498 (WIZ108SR 78.138.147.158:5010); 418200 (178.205.241.58:5011, the IHN on
-- Tabeev Street, 5) was polled only as an example. Device 25 keeps its id, links, mnemoschema selector and emergency
-- row; its code, name and description follow the new meter: tsarevo1-km5-418200 -> tsarevo1-km5-413498. Its statics
-- folder, the Царёво-1 diagram bindings, the reader instance and the DEVICE_CODE of its collect-device-state changed
-- in the same commit; nothing else in the database refers to the code. Only a row still carrying the old code
-- changes, so running it again changes nothing. Deploy together: this migration, then restart the web API (device
-- cache in Redis) and Node-RED.
BEGIN;

UPDATE public.device
SET code = 'tsarevo1-km5-413498',
    name = 'КМ-5 (413498)',
    description = 'Теплосчетчик КМ-5 (413498)',
    "updatedAt" = now()
WHERE code = 'tsarevo1-km5-418200';

COMMIT;
