# Database schema

`schema.sql` is the schema of the production database (`eta_flow_space_database`): tables, sequences, constraints,
indexes, the `cleanup()` retention procedure and the `pg_stat_statements` extension. No data. It is the reference;
the web API's Sequelize models only describe it and no longer create tables (`synchronize` is off).

**Fresh install:** `docker-compose.yaml` mounts `schema.sql` into the database container's
`/docker-entrypoint-initdb.d/`, so Postgres applies it when it starts with an empty data folder
(`./flow-space-data`). An existing database is never touched by it.

## Local development

For a lightweight, human-readable backup with only the latest device and emergency
state per device, run `bash .tools/database-backup/lightweight-backup.sh` through
the existing developer tunnel. It saves a timestamped SQL file in the Git-ignored
`flow-space-backups/` directory and verifies it in disposable PostgreSQL before
publishing. See [the backup tool](../.tools/database-backup/README.md) for settings,
verification and restore usage.

For an isolated local PostgreSQL deployment, run
`bash .tools/local-development/local-development.sh up`. It uses port **55432**, a separate Docker
volume, and this reference schema with synthetic demo users and measurements.
The same helper starts a separate local Redis on port **56379**. See
[the local development helper](../.tools/local-development/README.md) for connection values,
stop/start commands, and limitations.

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
| `2026-10-09-remove-is-connected-from-meter-states.sql` | yes (verified 2026-10-11, incl. the second run) |
| `2026-10-09-add-tsarevo1-tv7.sql` | yes (verified 2026-10-10) |
| `2026-10-10-fix-mercury230-current-scale.sql` | yes (verified 2026-10-11, incl. the second run) |
| `2026-10-10-null-vzljot026-zero-pressures.sql` | yes (verified 2026-10-11) |
| `2026-10-11-irvis-state-names-and-flags.sql` | yes (verified 2026-10-11) |
| `2026-10-11-device-code-unique.sql` | yes (verified 2026-10-11) |
| `2026-10-11-uniform-device-codes.sql` | yes (verified 2026-10-11) |
| `2026-10-11-rename-spring2-vkt-to-vkt7.sql` | yes (verified 2026-10-11) |
| `2026-10-11-spring1-and-flow-codes.sql` | yes (verified 2026-10-11) |
| `2026-10-11-spring1-display-names.sql` | yes (verified 2026-10-11) |
| `2026-10-12-user-settings-map-objects-off.sql` | yes (verified 2026-10-12) |
| `2026-10-12-link-tsarevo1-tv7-users.sql` | yes (verified 2026-10-12) |
| `2026-10-13-user-settings-all-devices.sql` | not needed any more: on 2026-10-13 no stored settings had the old key |
| `2026-10-15-replace-tsarevo1-km5-418200-with-413498.sql` | yes (verified 2026-10-15) |
| `2026-10-15-delete-tsarevo1-km5-418200-history.sql` | yes (verified 2026-10-15) |
| `2026-10-15-add-tsarevo1-mercury230.sql` | yes (verified 2026-10-15) |
| `2026-10-15-add-tsarevo1-vkt7.sql` | yes (verified 2026-10-15) |
| `2026-10-15-tsarevo1-vkt7-gas-per-boiler.sql` | yes (verified 2026-10-15) |
| `2026-10-16-remove-tsarevo1-tv7.sql` | yes (verified 2026-10-16) |
| `2026-10-22-spring2-boiler-alarm-emergency.sql` | yes (verified 2026-10-22) |
| `2026-10-22-spring2-pump-sensor-relay-emergencies.sql` | yes (all 11 reasons verified by a read-only query on 2026-11-18; application date unknown) |
| `2026-10-27-add-gagarin-boiler-room.sql` | not yet |
| `2026-11-07-add-object-location-locality.sql` | yes (applied and verified 2026-11-07) |
| `2026-11-07-normalize-locality-abbreviations.sql` | yes (applied and verified 2026-11-07, including a second run) |
| `2026-11-08-add-kama-river-mouth-watcher.sql` | not yet |
| `2026-11-08-remove-boiler-is-working.sql` | not yet |
| `2026-11-09-link-latest-boiler-rooms-to-boiler-watcher.sql` | yes (applied and verified 2026-11-09) |
| `2026-11-11-add-muslum-boiler-rooms.sql` | yes (applied and verified 2026-11-11) |
| `2026-11-11-add-muslum-emergencies.sql` | yes (applied and verified 2026-11-11) |
| `2026-11-11-link-muslum-boiler-room-users.sql` | yes (applied and verified 2026-11-11; sign-in and device access checked) |
| `2026-11-13-update-muslum-watcher-access.sql` | yes (applied and verified 2026-11-13; 10-character password reset, both watcher accounts linked to Muslum-7/9, sign-in and device access checked) |
| `2026-11-13-reset-boiler-watcher-password.sql` | yes (applied and verified 2026-11-13; 10-character password reset, sign-in and all 21 existing device links checked) |
| `2026-11-13-add-muslum-emergency-rules.sql` | not yet; 43 reasons for Muslum-7 and 41 for Muslum-9, validated with the API evaluator and isolated PostgreSQL 17 |
| `2026-11-16-add-nurlat-5-boiler-room.sql` | yes (applied and verified 2026-11-16; device 35, flow 13, own mnemoschema and both shared watcher links) |
| `2026-11-16-add-nurlat-5-location.sql` | yes (applied and verified 2026-11-16; location 15, address and supplied coordinates; production API list/detail checked) |
| `2026-11-17-add-nurlat-boiler-watcher.sql` | yes (applied and verified 2026-11-17; user 8, 10-character password, Nurlat-5 access for both watcher accounts; sign-in and access isolation checked) |
| `2026-11-17-add-nurlat-5-emergency-rules.sql` | yes (applied and verified 2026-11-17; emergency 25, 80 reasons covering 93 PLC flags, three-minute history interval; live API and stored emergency history checked; 124 evaluator and 12 isolated PostgreSQL checks passed) |
| `2026-11-18-spring2-sensor-status-emergencies.sql` | not yet; all 22 SensorStatus fields, seven existing rules extended and 15 added; 141 evaluator and 25 isolated PostgreSQL checks passed |

The Spring-2 SensorStatus migration covers all boiler outlet/flue temperatures,
diesel levels, boiler-pump current sensors and common temperature/pressure sensors.
Each sensor has one reason for exact numeric status 4, 8, 16 or 32; its dynamic
description names the current alarm, fault, calibration error or overload.
WARNING (2) is excluded for every sensor.
Existing reasons 55–61 retain their IDs and descriptions while gaining the requested alarm/fault
coverage; new reasons use 63–77. The current 43-reason registration would become
58 reasons. Existing numeric limits, unrelated rules, intervals and history remain
unchanged. Persistent sensor faults are deliberately included. Identical reruns
change nothing; conflicting managed IDs, malformed arrays and missing/duplicate
registrations abort. No schema, ORM or application deployment is needed. See the
[migration review and saved-state preview](../.reports/2026-11-18-spring2-sensor-status-emergencies/README.md).

The Nurlat-5 emergency migration creates its missing registration or populates an
existing empty reason list. It covers gas/fire/security, pressure and dry-run
protections, boiler faults/locks, pump start errors and all available sensor faults
and H/L/HH/LL flags. Paired alarm/input flags and each boiler's fault/alarm flags
activate one reason per event; warning and alarm thresholds remain separate.
Connection loss remains the dispatcher's reason 100. Identical reruns preserve all
metadata; conflicting non-empty rules, duplicate registrations and malformed lists
abort. Existing intervals and unrelated registrations are preserved. See the
[verification report](../.reports/2026-11-17-nurlat-5-emergency-rules/README.md).

The Nurlat watcher migration creates `nurlat-boiler-watcher` with operator role 2,
standard initial watcher settings and access only to `nurlat-5-boiler-room` (device 35).
The generated password is 10 characters; only its bcrypt hash (cost 12) is committed.
The readable credential is kept in a private, Git-ignored local file. The existing
`boiler-watcher` already had Nurlat-5 access; its password, settings and other links
were preserved. Reruns restore missing target links without changing credentials.
All 13 isolated PostgreSQL checks passed. Production sign-in, the one-device list,
device details and rejection of unrelated-device access were checked, then signed out.

The Nurlat-5 migration registers `nurlat-5-boiler-room` as `Котельная Нурлат-5`,
linked to Node-RED B tab `93dc403dd0a3e7b1`. It uses the existing boiler-room settings:
10-minute state TTL and history interval, with list order 10. Both `admin-boiler-watcher`
and `boiler-watcher` receive access. The supplied address is РТ, Нурлат,
ул. Ленинградская, 15А, retained in the device description. The registration initially
left the location unset. After the user supplied coordinates, the separate location
migration added locality `г. Нурлат` and position `54.43420093, 50.82059551`
(rounded to the columns' eight decimal places). Controller type remains unset pending
hardware confirmation. Registration reruns preserve existing metadata, restore missing
access/diagram links and reject conflicting identities. The location migration changes
nothing on identical reruns and rejects a different existing location. All 18 isolated
PostgreSQL 17 checks passed; production application was verified against the database
and the configured watcher's API list/detail, followed by sign-out.
The 16 November registration omitted emergency monitoring while telemetry storage
was disabled. Production telemetry was confirmed on 17 November, and the separate
emergency migration above then enabled monitoring. These data migrations require no
schema, ORM, Node-RED deployment or service restart.

The Muslum emergency-rules migration populates only the existing registrations for
`muslum-7-boiler-room` and `muslum-9-boiler-room`. It uses their collected boolean alarm,
warning and sensor-fault flags, following the rules stored for Gagarin, Komarova and Kirov.
It preserves registration IDs and polling intervals. Identical reruns change nothing;
unexpected non-empty rule lists abort the transaction. Connection loss remains the
dispatcher's built-in reason 100. No schema change or application deployment is required.

`object_location.locality` stores the canonical populated locality name, including its type
(for example, `пгт. Камское Устье`). Use the same spelling for locations in the same locality.
NULL means unspecified. Apply the locality migration before deploying the updated API.
