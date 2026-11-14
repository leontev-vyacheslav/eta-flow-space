# Lightweight database backup

Create a human-readable PostgreSQL SQL backup with all schema and other table data,
but only the highest-ID row for each non-NULL `deviceId` in `device_state` and
`emergency_state`. This follows the existing latest-state convention. Devices with
no stored state do not get a synthetic row; unassociated NULL-device state rows are
omitted. Sequence positions from `pg_dump` are preserved. Ownership and grants are
omitted so the SQL can be restored under the local development role.

## Usage

Requires Linux, Bash, local Docker Engine, and a locally available `postgres:17`
image. Python 3 is needed only for the default password-file fallback. Use Bash,
not `sh`. From the repository root:

```bash
# If the existing developer tunnel is not already running:
systemctl --user start ssh-tunnel

bash .tools/database-backup/lightweight-backup.sh
```

The script resolves project paths from its own directory, so its absolute path
also works from another working directory. It does not start or stop the tunnel.
An optional positional argument selects the output directory (relative paths are
relative to the caller). The default is the checkout's Git-ignored
`flow-space-backups/`. Output files are timestamped in Europe/Moscow, use mode
`0600`, and are never overwritten. The command prints the path, size, retained row
counts and SHA-256 checksum after verification succeeds.

An alternative output directory that is also Git-ignored:

```bash
bash .tools/database-backup/lightweight-backup.sh .tools/database-backup/output
```

Environment settings:

| Variable | Default |
| --- | --- |
| `PGHOST` | `127.0.0.1` |
| `PGPORT` | `35432` (developer SSH tunnel) |
| `PGUSER` | `postgres` |
| `PGDATABASE` | `eta_flow_space_database` |
| `PGPASSWORD` | Password parsed from `DATABASE_URL` in `flow-space-reporting/.env-reporting` |
| `BACKUP_POSTGRES_IMAGE` | `postgres:17` |

The connection host, port, user and database are **not** taken from that reporting
URL, which can name a production container host. Explicit environment overrides
allow a disposable fixture database to be used instead. Use a PostgreSQL client
image for PostgreSQL 17, matching this project's source server and verification
data directory. Images are not pulled automatically.

## Consistency, verification and side effects

The export uses a shared read-only, repeatable-read snapshot for schema, ordinary
table data, latest state rows and verification fingerprints. Connection attempts
time out after 10 seconds and dump lock waits after 10 seconds. Unexpected columns
in either state table cause an error so new fields cannot be silently omitted.

Every export is restored in a temporary local PostgreSQL container with networking
disabled, no published ports and database files on tmpfs. The tool compares the
restored device count and both sets of state rows, including IDs, timestamps,
JSON contents and NULLs, with the source snapshot. It also checks that restored
state sequences are not behind their rows. Only a successful verification publishes
the final `.sql` file. The temporary container and staging files are removed on
exit. The existing development database and Redis are not used.

Source access consists of read-only queries, `pg_dump` and shared table locks;
polling and application containers keep running. Sequences are not MVCC snapshots:
their dumped positions can include concurrent allocations after the snapshot.
Credentials are read at runtime and passed through container environment variables.
Do not commit generated backups; even a lightweight dump contains production user
data and password hashes. Custom output directories need equivalent Git exclusions.

To restore an exported file into the isolated development database:

```bash
bash .tools/local-development/local-development.sh restore /absolute/path/to/backup.sql
```

## Offline regression test

```bash
bash .tools/database-backup/test.sh
```

This uses disposable local PostgreSQL fixtures and the same complete export and
restore workflow. It checks highest-ID selection despite backdated timestamps,
missing device states, NULL JSON, escaped text, unchanged non-history data and
sequence positions. It also checks that an unexpected state column fails without
publishing a backup. No production credentials or production connection are used.
