CREATE OR REPLACE PROCEDURE cleanup()
LANGUAGE plpgsql
AS $$
DECLARE
    batch_size                    INTEGER := 1000;
    device_state_affected_rows    INTEGER;
    emergency_state_affected_rows INTEGER;
BEGIN
    LOOP
        DELETE FROM device_state
        WHERE id IN (
            SELECT id FROM device_state
            WHERE "createdAt" < NOW() - INTERVAL '3 months'
            LIMIT batch_size
        );
        GET DIAGNOSTICS device_state_affected_rows = ROW_COUNT;

        DELETE FROM emergency_state
        WHERE id IN (
            SELECT id FROM emergency_state
            WHERE "createdAt" < NOW() - INTERVAL '3 months'
            LIMIT batch_size
        );
        GET DIAGNOSTICS emergency_state_affected_rows = ROW_COUNT;

        RAISE NOTICE 'Deleted: device_state=%, emergency_state=%',
            device_state_affected_rows,
            emergency_state_affected_rows;

        -- Commit each batch to release locks and reduce transaction size
        COMMIT;

        EXIT WHEN device_state_affected_rows = 0 AND emergency_state_affected_rows = 0;

    END LOOP;
END;
$$;