-- The alarm rules of Царёво-2 (4) and Statum (6) look up enum descriptions with dss.getEnumDescription(flowCode, ...),
-- but the per-flow schema files were removed on 2026-09-14 (6b7edfe), so since then the boiler and pump alarm texts
-- were stored with the raw ${...} template. The schemas live at devices/<deviceCode>/data-schema.json and the
-- emergency dispatcher now passes deviceCode instead of flowCode; this points the rules at it.
BEGIN;

UPDATE public.emergency
SET reasons = replace(reasons::text, 'dss.getEnumDescription(flowCode,', 'dss.getEnumDescription(deviceCode,')::json,
    "updatedAt" = now()
WHERE reasons::text LIKE '%dss.getEnumDescription(flowCode,%';

COMMIT;
