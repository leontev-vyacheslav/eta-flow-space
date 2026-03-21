#!/bin/sh

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting cleanup..."
psql "postgresql://postgres:0987654321@eta-flow-space-database:5432/eta_flow_space_database" <<-SQL
    CALL cleanup();
SQL

if [ $? -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleanup done. Running VACUUM..."
    psql "postgresql://postgres:0987654321@eta-flow-space-database:5432/eta_flow_space_database" <<-SQL
        VACUUM ANALYZE device_state;
        VACUUM ANALYZE emergency_state;
SQL
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] VACUUM completed."
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleanup FAILED." >&2
    exit 1
fi