-- Drop two emergency_state indexes that cost space and insert time but serve no query:
-- idx_emergency_state_reasons (GIN on state->'reasons') was never scanned; idx_emergency_state_device_created is a
-- partial copy of idx_emergency_state_device whose predicate (state ? 'reasons') holds for every row.
-- CONCURRENTLY doesn't block the dispatchers' inserts; it can't run inside a transaction, so there is no BEGIN/COMMIT.
DROP INDEX CONCURRENTLY IF EXISTS public.idx_emergency_state_reasons;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_emergency_state_device_created;
