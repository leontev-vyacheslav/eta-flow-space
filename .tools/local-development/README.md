# Local development services

An isolated PostgreSQL 17 instance initialized from `database/schema.sql` and
synthetic demo fixtures in `seed.sql`, alongside an isolated Redis 7 instance. Requires
Docker Engine and Docker Compose with `up --wait` support. Run from any directory:

```bash
bash .tools/local-development/local-development.sh up
bash .tools/local-development/local-development.sh status
bash .tools/local-development/local-development.sh psql -c '\dt'
bash .tools/local-development/local-development.sh restore flow-space-backups/eta_flow_space_database_TIMESTAMP_latest_device_and_emergency_states.sql
bash .tools/local-development/local-development.sh logs
bash .tools/local-development/local-development.sh down
```

`up` waits for both services, then checks that the demo account exists. It can be repeated:
initialization runs only on the first start of an empty volume. `down` stops and
removes this helper's containers and network but retains both data volumes. No reset
or automatic data-deletion command is provided.

## Restore a plain SQL backup

The `restore` action replaces only this helper's isolated `eta_flow_space_local`
database. It accepts a human-readable SQL file produced by `pg_dump --format=plain`:

```bash
bash .tools/local-development/local-development.sh restore \
  flow-space-backups/eta_flow_space_database_20261109_120302_latest_device_and_emergency_states.sql
```

The command starts the local PostgreSQL container if necessary and asks for an
explicit `RESTORE` confirmation. For deliberate non-interactive use, append
`--yes`. It restores into a temporary database and checks for the core Flow Space
tables before replacing the current development database. A failed import leaves
the current local database unchanged. After a successful swap, the previous local
database is removed. Redis data and the source backup are not changed.

Only plain SQL dumps are accepted; PostgreSQL custom-format `.dump` files require
`pg_restore` and are rejected. Restored production-derived data remains sensitive
even on a development machine. Keep it in the Git-ignored `flow-space-backups/`
directory and do not use production credentials in the local API configuration.

The helper uses its own `docker-compose.yaml`, project `eta-flow-space-local-db`, network,
and volumes `eta-flow-space-local-db_local-db-data` and
`eta-flow-space-local-db_local-redis-data`. PostgreSQL binds to `127.0.0.1:55432`
and Redis to `127.0.0.1:56379`, leaving the production tunnel ports 35432 and 6379
alone. Redis starts empty and persists its data with append-only storage. Remote Docker
endpoints are rejected. It does not start other application services, connect to
production, copy production data, or read production environment files.

The Docker project and volume names retain their original `local-db` names so
renaming the helper directory does not disconnect existing local data. Use the
script for lifecycle commands so the same project name is always selected.

Its bridge uses `172.30.250.0/28`, avoiding automatic pool allocation (which can
fail when VPN routes cover the Docker address pools). If that subnet conflicts
with your network, set `LOCAL_DB_SUBNET` to an unused subnet before the first `up`.
Keep the same value on subsequent commands.

## Demo data

Both accounts use password **`demo-local-only`** (stored as bcrypt hashes):

- `demo-admin`: administrator.
- `demo-viewer`: guest.

Each account has access to one fictional boiler room, a fictional map location,
and 25 hourly temperature/pressure samples. The boiler room uses the existing
`spring1-boiler-room` asset code to reuse its diagram and data schema; its name
begins with `ДЕМО`. No real user details, credentials, device addresses or state
values are copied. No device commands or polling connections are configured.
The fixtures do not create reports or alarm rules.

The seed runs only on an empty volume and refuses a different database name or
existing users/devices. Restarting does not duplicate fixtures or refresh their
timestamps. The API shows database samples as offline through its Redis fallback;
this helper does not simulate continuous live updates.

## Connect a local API

Use these development-only connection values with the API's existing environment
configuration (do not overwrite an existing environment file blindly):

```dotenv
DB_HOST=127.0.0.1
DB_PORT=55432
DB_USERNAME=postgres
DB_PASSWORD=local-development-only
DB_DATABASE=eta_flow_space_local
REDIS_HOST=127.0.0.1
REDIS_PORT=56379
```

The password is intentionally public and only for this loopback-bound development
database. Do not reuse it on production or expose this database publicly.

The API also requires JWT secrets. Its git-ignored `.env.local` should contain the
values above so `.env` cannot supply production database credentials or the Redis
tunnel address. The helper itself does not edit environment files. For the UI,
point its development API host at the local API's port (`PORT` in `.env.local`;
currently 3001), with `STATICS_PATH` pointing to the absolute
path of this checkout's `flow-space-statics`. The API and UI are not started here.
Do not leave the production SSH tunnel bound to the same API port when starting
the local API. This is a database fixture environment, not a full application stack.

## Schema changes and troubleshooting

The reference schema is loaded as-is, including `pg_stat_statements` and the
retention procedure. Historical migrations are not replayed: some change
production data and are not suitable as seeds. Later changes to `schema.sql` do
not update an existing volume. Apply a specific reviewed schema migration to the
local database using `psql`, for example:

```bash
bash .tools/local-development/local-development.sh psql < database/migrations/REVIEWED-MIGRATION.sql
```

Check `logs` if initialization fails. PostgreSQL can leave a partially initialized
volume after a SQL error; repeating `up` does not replay the schema. Preserve any
needed local data before manually replacing that specific volume. A busy port
55432 or 56379 causes startup to fail instead of taking over another service.
