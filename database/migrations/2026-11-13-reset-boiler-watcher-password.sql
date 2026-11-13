-- Reset the existing boiler-watcher password. Only the bcrypt hash (cost 12)
-- is stored here; plaintext credentials stay outside Git. Roles, settings,
-- existing device access and other accounts are unchanged.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';

DO $migration$
DECLARE
    account_count integer;
    password_hash constant text := '$2b$12$Muy6WNFPv2KAJI5zkBZzrOU/0eRa44G9iUk0fFez9KnjAMyI0tR7W';
BEGIN
    -- Names have no unique constraint; serialize the exact-account check.
    LOCK TABLE public."user" IN SHARE ROW EXCLUSIVE MODE;

    SELECT count(*) INTO account_count
    FROM public."user" WHERE name = 'boiler-watcher';

    IF account_count <> 1 THEN
        RAISE EXCEPTION 'Expected exactly one boiler-watcher account, found %', account_count;
    END IF;

    UPDATE public."user"
    SET password = password_hash, "updatedAt" = now()
    WHERE name = 'boiler-watcher'
      AND password IS DISTINCT FROM password_hash;
END
$migration$;

COMMIT;
