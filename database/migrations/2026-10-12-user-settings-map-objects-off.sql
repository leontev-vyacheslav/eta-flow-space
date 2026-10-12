-- The side menu's "Карта объектов" lists only "Все объекты" for every user: the new user setting isShowedAllMapObject
-- ("Показывать все объекты карты" in the settings dialog) is stored as false. The UI treats a missing value as true,
-- so the key is written explicitly. Only settings without the key change, so running it again does not undo a choice a
-- user has made in the dialog since. settings is json: converted to jsonb to add the key, which also compacts the text.
BEGIN;

UPDATE public."user"
SET settings = (coalesce(settings::jsonb, '{}'::jsonb) || '{"isShowedAllMapObject": false}'::jsonb)::json,
    "updatedAt" = now()
WHERE settings IS NULL OR NOT (settings::jsonb ? 'isShowedAllMapObject');

COMMIT;
