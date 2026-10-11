-- 1. Весна is spring1, like spring2 (Весна-2): the codes of its devices change
--      spring-boiler-room         -> spring1-boiler-room         (device 13)
--      spring-mercury230-26077096 -> spring1-mercury230-26077096 (device 14)
--      spring-mercury230-26077087 -> spring1-mercury230-26077087 (device 19)
--      spring-ek270-1116061420    -> spring1-ek270-1116061420    (device 20)
--      spring-vzljot026-1415796   -> spring1-vzljot026-1415796   (device 22)
-- 2. Each flow's code (the Node-RED tab label, the UI's /flow/<code> route) is its main device's code instead of
--    "<site>-boiler-automation"; flows are matched by uid (the Node-RED tab id), which does not change.
-- Statics folders, diagram bindings, DEVICE_CODE values and the tab labels changed in the same commit; nothing else
-- in the database refers to these codes (checked 2026-10-11). Only rows still carrying an old code change, so running
-- it again changes nothing. Deploy together: this migration, then restart the web API (device cache in Redis) and
-- Node-RED. Old UI bookmarks to /flow/<old code> stop working, and each diagram's saved zoom resets once.
BEGIN;

UPDATE public.device AS d
SET code = m.new_code, "updatedAt" = now()
FROM (VALUES
    ('spring-boiler-room', 'spring1-boiler-room'),
    ('spring-mercury230-26077096', 'spring1-mercury230-26077096'),
    ('spring-mercury230-26077087', 'spring1-mercury230-26077087'),
    ('spring-ek270-1116061420', 'spring1-ek270-1116061420'),
    ('spring-vzljot026-1415796', 'spring1-vzljot026-1415796')
) AS m (old_code, new_code)
WHERE d.code = m.old_code;

UPDATE public.flow AS f
SET code = m.new_code, "updatedAt" = now()
FROM (VALUES
    ('8c7f93e2ebca7614', 'tsarevo1-boiler-room'),
    ('30c8a42fdf53c9ea', 'tsarevo2-boiler-room'),
    ('a03807f6777b0746', 'spring1-boiler-room'),
    ('7ada8f3f5d804ee5', 'statum-boiler-room'),
    ('2d15e59c76504bcb', 'spring2-boiler-room'),
    ('f86b501c2fcfb0fb', 'amirkhana99-hws-node')
) AS m (uid, new_code)
WHERE f.uid = m.uid AND f.code IS DISTINCT FROM m.new_code;

COMMIT;
