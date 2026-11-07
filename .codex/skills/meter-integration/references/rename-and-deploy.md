# Renaming codes and preparing deployment

## Rename together

Find the old code in source, statics and database text columns (`emergency.reasons`, `report.settings`,
`user.settings`, `device.settings`). Start with `rg -n --hidden -F '<old>'` over relevant project paths,
then distinguish exact codes from longer codes; a substring replacement of `spring` corrupts `spring2`.

- Move the statics directory, update schema `title`, and regenerate the manifest using the local wrapper.
- Update SVG/script `states['<old>']` bindings, `DEVICE_CODE`, comments and any tab/instance labels.
- Update current documentation; retain historical migrations unchanged.
- Create a new idempotent migration updating `device.code` and, when needed, `flow.code`.
  Match flow identity by `uid` when the label/code changes. Refresh the reference schema/models as needed.
- Preserve SVG line endings and avoid whole-file JSON reformatting.
- Explain that bookmarks containing renamed codes stop working and saved diagram zoom may reset.

## Deployment plan

Prepare an ordered plan for the user unless deployment was explicitly requested. Skills do not grant
permission to apply production migrations, restart containers, deploy editor flows or change modem settings.

Check Node-RED drift first: production editor Deploys can change flows outside git. Build on the user's
latest `sync: flows` changes. A stale open editor can overwrite new flows; reload it before Deploy.

Reader/settings changes require restarting every instance that runs them; choose A/B/C from actual
ownership. Shared subflow definitions must remain identical. Restarting only the UI does not reload readers.

For code renames, apply the migration before refreshing the API's Redis device pool and restarting the
relevant Node-RED instance. The API currently refreshes the pool at startup and every five minutes; confirm in
`flow-space-web-api/src/common/services/shared-store/device-pool-sync.service.ts`. During an
incomplete transition an old/new code can be absent from the cache. Avoid leaving that state unattended.

For historical data corrections, decide whether old polling can recreate bad data; those corrections may
need to follow the reader restart. A migration that selects an old code must precede its rename. Include
reporting rebuild/restart when its code changes; use the affected service's documented deploy procedure.

After deployment, verify database effects with read-only queries: corrected rows, constraints, latest
state fields, and neighboring devices. Mark `database/README.md` as applied/verified only with evidence
and the actual date. Do not label a prepared migration as applied. If a transition created more old-form
rows, explain the need for a separately authorized rerun of the idempotent correction.
