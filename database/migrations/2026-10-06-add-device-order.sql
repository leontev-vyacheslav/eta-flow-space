-- Position of a device in device lists (side menu, map, emergency summary report): ascending,
-- devices without a value come after the ordered ones, ties by id.
ALTER TABLE public.device ADD COLUMN "order" integer;

COMMENT ON COLUMN public.device."order" IS 'Position in device lists (ascending); NULL = after the ordered devices';
