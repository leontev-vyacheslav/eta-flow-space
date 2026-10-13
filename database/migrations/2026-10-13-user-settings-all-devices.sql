-- The side-menu setting isShowedOnlyBaseDevice ("Показывать только основные устройства") became isShowedAllDevices
-- ("Показывать все устройства") with the opposite meaning. The old key is removed; its value is turned over into the new
-- key (only=true is all=false) unless the new key is already there, which is the newer choice and is kept. Settings
-- without the old key do not change, so running it again changes nothing. settings is json: converted to jsonb for the
-- edit, which also compacts the text.
BEGIN;

UPDATE public."user"
SET settings = ((settings::jsonb - 'isShowedOnlyBaseDevice')
        || CASE WHEN settings::jsonb ? 'isShowedAllDevices' THEN '{}'::jsonb
                ELSE jsonb_build_object('isShowedAllDevices', NOT (settings::jsonb ->> 'isShowedOnlyBaseDevice')::boolean) END)::json,
    "updatedAt" = now()
WHERE settings IS NOT NULL AND settings::jsonb ? 'isShowedOnlyBaseDevice';

COMMIT;
