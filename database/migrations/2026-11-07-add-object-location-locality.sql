-- Add populated locality names for the map filter.
BEGIN;

ALTER TABLE public.object_location ADD COLUMN locality character varying(128);

-- Only backfill addresses with an explicit, known locality. Other rows stay NULL.
UPDATE public.object_location
SET locality = CASE
    WHEN address = 'Kazan, Republic of Tatarstan, Russia, 420111'
      OR address LIKE '%, Казань' THEN 'г. Казань'
    WHEN address LIKE '%пгт Камское Устье%' THEN 'пгт Камское Устье'
    WHEN address LIKE '%село Новое Шигалеево%' THEN 'село Новое Шигалеево'
END,
    "updatedAt" = now()
WHERE address = 'Kazan, Republic of Tatarstan, Russia, 420111'
   OR address LIKE '%, Казань'
   OR address LIKE '%пгт Камское Устье%'
   OR address LIKE '%село Новое Шигалеево%';

COMMIT;
