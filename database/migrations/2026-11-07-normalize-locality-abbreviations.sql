-- Normalize the displayed locality types without changing the full addresses.
BEGIN;

UPDATE public.object_location
SET locality = CASE locality
    WHEN 'пгт Камское Устье' THEN 'пгт. Камское Устье'
    WHEN 'село Новое Шигалеево' THEN 'с. Новое Шигалеево'
END,
    "updatedAt" = now()
WHERE locality IN ('пгт Камское Устье', 'село Новое Шигалеево');

COMMIT;
