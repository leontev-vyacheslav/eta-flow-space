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
| `2026-10-08-add-spring2-vkt.sql` | not yet |
