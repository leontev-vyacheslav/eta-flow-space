-- One link per user and device: a duplicate link (user 4 / device 20, ids 44 and 45) doubled that user's counts in the
-- emergency summary report. Removes the duplicates (keeps the oldest link) and adds the unique constraint, whose index
-- also serves the per-user device lookups.
BEGIN;

DELETE FROM public.user_device_link duplicate
USING public.user_device_link original
WHERE duplicate."userId" = original."userId"
  AND duplicate."deviceId" = original."deviceId"
  AND duplicate.id > original.id;

ALTER TABLE public.user_device_link
    ADD CONSTRAINT user_device_link_user_device_unique UNIQUE ("userId", "deviceId");

COMMIT;
