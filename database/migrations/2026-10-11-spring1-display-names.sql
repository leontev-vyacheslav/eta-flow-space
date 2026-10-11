-- Display names follow the spring1 codes: Весна is Весна-1, like Весна-2 (device 13 and its flow), and the trailing
-- spaces in the Весна-2 names are dropped. Only rows that still differ change, so running it again changes nothing.
BEGIN;

UPDATE public.device
SET name = 'Котельная ЖК Весна-1', description = 'Котельная ЖК Весна-1', "updatedAt" = now()
WHERE code = 'spring1-boiler-room'
  AND (name IS DISTINCT FROM 'Котельная ЖК Весна-1' OR description IS DISTINCT FROM 'Котельная ЖК Весна-1');

UPDATE public.flow
SET name = 'Котельная ЖК Весна-1', description = 'Система мониторинга котельной ЖК Весна-1', "updatedAt" = now()
WHERE uid = 'a03807f6777b0746'
  AND (name IS DISTINCT FROM 'Котельная ЖК Весна-1' OR description IS DISTINCT FROM 'Система мониторинга котельной ЖК Весна-1');

UPDATE public.device
SET name = btrim(name), description = btrim(description), "updatedAt" = now()
WHERE code = 'spring2-boiler-room' AND (name <> btrim(name) OR description <> btrim(description));

UPDATE public.flow
SET name = btrim(name), description = btrim(description), "updatedAt" = now()
WHERE uid = '2d15e59c76504bcb' AND (name <> btrim(name) OR description <> btrim(description));

COMMIT;
