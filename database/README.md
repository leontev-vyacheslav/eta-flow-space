# Database schema

`schema.sql` is the schema of the production database (`eta_flow_space_database`): tables, sequences, constraints,
indexes, the `cleanup()` retention procedure and the `pg_stat_statements` extension. No data. It is the reference;
the web API's Sequelize models only describe it and no longer create tables (`synchronize` is off).

**Fresh install:** `docker-compose.yaml` mounts `schema.sql` into the database container's
`/docker-entrypoint-initdb.d/`, so Postgres applies it when it starts with an empty data folder
(`./flow-space-data`). An existing database is never touched by it.

## Changing the schema

1. Write the change as a new file `migrations/YYYY-MM-DD-what-it-does.sql`. Files are applied once, by hand, in
   name order; there is no tracking table.
2. Apply it on the server:
   ```bash
   docker exec -i eta-flow-space-database psql -v ON_ERROR_STOP=1 -U postgres -d eta_flow_space_database < database/migrations/YYYY-MM-DD-what-it-does.sql
   ```
3. Refresh `schema.sql` from the database and commit it together with the migration:
   ```bash
   docker exec eta-flow-space-database pg_dump -U postgres -d eta_flow_space_database --schema-only --no-owner --no-privileges \
     | grep -v '^\\\(un\)\?restrict ' > database/schema.sql
   ```
   (The `\restrict` lines carry a random key that changes on every dump.)
4. If a model in `flow-space-web-api/src/database/models` is affected, update it in the same commit.

## Applied migrations

| File | Applied on production |
|---|---|
| `2026-10-05-drop-sequelize-meta.sql` | 2026-10-05 |
| `2026-10-06-add-device-order.sql` | yes (verified 2026-10-07) |
| `2026-10-06-add-tsarevo1-boiler-room.sql` | yes (verified 2026-10-07) |
| `2026-10-06-rename-tsarevo-to-tsarevo2.sql` | yes (verified 2026-10-07) |
| `2026-10-07-drop-unused-emergency-state-indexes.sql` | yes (verified 2026-10-07) |
| `2026-10-07-unique-user-device-link.sql` | yes (verified 2026-10-07) |
| `2026-10-08-add-spring2-vkt.sql` | yes (verified 2026-10-08) |
| `2026-10-08-add-tsarevo1-km5.sql` | yes (verified 2026-10-08) |
| `2026-10-08-link-tsarevo1-users.sql` | yes (verified 2026-10-09) |
| `2026-10-09-add-device-type.sql` | yes (verified 2026-10-09) |
| `2026-10-09-emergency-rules-device-code.sql` | yes (verified 2026-10-09) |
| `2026-10-09-remove-is-connected-from-meter-states.sql` | yes (verified 2026-10-11); one KM-5 row written before the Node-RED restart (id 193331, 09.10 08:57) still has `isConnected` — run it once more |
| `2026-10-09-add-tsarevo1-tv7.sql` | yes (verified 2026-10-10) |
| `2026-10-10-fix-mercury230-current-scale.sql` | yes (verified 2026-10-11); one device-14 row written before the Node-RED restart (id 194786, 10.10 09:50) still has the 10x current — run it once more, before `2026-10-11-uniform-device-codes.sql` (it finds the meters by their old codes) |
| `2026-10-10-null-vzljot026-zero-pressures.sql` | yes (verified 2026-10-11) |
| `2026-10-11-irvis-state-names-and-flags.sql` | yes (verified 2026-10-11) |
| `2026-10-11-device-code-unique.sql` | yes (verified 2026-10-11) |
| `2026-10-11-uniform-device-codes.sql` | not yet |
