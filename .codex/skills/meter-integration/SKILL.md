---
name: meter-integration
description: Add, replace, move, or rename an Eta Flow Space meter across its protocol reader, Node-RED flow, database, state schema, and deployment plan. Use for coordinated device integration.
---

# Meter integration

Adapted from `.claude/skills/meter-integration/SKILL.md`. Paths are relative to the repository root.
Use [device-reader-raw](../device-reader-raw/SKILL.md) for protocol work and
[device-state-mapping](../device-state-mapping/SKILL.md) for site interpretation. Read only the parts
needed for the user's task; integration does not implicitly authorize deployment or live mutations.

## Identity and naming

- Site codes use Latin names and site parts: `spring1`, `spring2`, `tsarevo1`, `tsarevo2`.
- Meter code: `<site>-<device_type.code>-<serial>`, for example `spring2-vkt7-289452`.
  Boiler rooms: `<site>-boiler-room`; other existing main devices include `<site>-hws-node`.
  `device.code` is unique and non-null.
- Node-RED site tab label and `flow.code` use the site's main device code. Preserve tab ids:
  `flow.uid` associates the database flow with its Node-RED tab.
- Reader instance: `<type>-<serial>`; comment: `<device code> [<id>] (...)`;
  connection configuration nodes use the site name.
- Statics live in `flow-space-statics/devices/<device code>/`; schema `title` is the device code.
- Display names are Russian and include site numbers, without surrounding whitespace.
- Inspect `flow-space-ui/src/constants/app-routes.tsx` for current routes; the device dashboard
  currently uses `/:flowCode/device/:deviceId`.

## Implement the integration

1. Read the manufacturer's protocol and manual in `.docs/<type>/`. For new documents use ASCII
   filenames, preserve source/edition information in the document index or notes, and check first and
   last pages as well as page count; downloaded PDFs can be truncated or describe another model.
2. Establish identity, serial, byte order, supported values and session timing through bounded,
   authorized reads or captured frames. Space live probes out because production shares gateways.
   For slow or battery-powered meters, quantify request cost before expanding polling coverage.
3. Implement the generic raw reader and register it in `flow-space-nodered-a/settings.js`.
   A major delicate rework may warrant a local backup under `.temp/`; git remains the source history.
4. Develop the reader subflow in the testing instance, normally B. Inspect actual flows and
   `docker-compose.yaml` to determine ownership: A, B and C exist; C's README currently duplicates B's.
   All share A's readers/settings. Configure host/port/address/serial and timeouts, wrap reads in
   `withConnectionLock`, set status, report failures with `node.error`, and send nothing on failure.
   Record the raw payload in the subflow's `info`.
5. A testing instance uses `DEVICE_CODE = null` and must not store state. Confirm the actual function
   skips persistence; the storage helper itself rejects unknown/null codes. Test with
   `.tools/device-probes/subflow_run.js` and mock storage, following its README.
6. When promoting a subflow, preserve its id and keep its definition identical in every instance
   that shares it. A moved site tab keeps its ids. Each gateway belongs to one polling instance:
   connection locks are process-local, although Redis is shared.
7. A site chain contains comment, timed inject, reader instance, explicit `collect-device-state`
   mapping, and inactive debug. Choose the polling interval for the device (often 60 seconds;
   slow/battery devices may need 180–300 seconds). Preserve old stock Modbus chains when replacing
   them: disable their main read node (`d: true`), label the old chain, and explain corrected defects.
   Existing boiler controllers intentionally retain stock Modbus nodes.
8. For a new device, prepare a migration following comparable files in `database/migrations/`:
   device type if needed, device, site flow/location/order, diagram selector, emergency configuration,
   and user-device links. Reuse site access policy only when clear; otherwise ask which users.
   Follow `database/README.md` for schema/model updates and migration status.
9. Add the device data schema with matching state keys, groups, labels and units. Regenerate the
   manifest with `bash .tools/diagram-renderer/gen-manifest.sh`. Change diagram bindings only within
   the requested scope; render visual changes using [project-tools](../project-tools/SKILL.md).

## Verification and handoff

Compare old/new states by key, type, units and plausible values; totals must continue the stored
history. Check adjacent devices cannot receive this device's state. Use local fixtures/emulators
before live checks and state which hardware behavior remains unverified. Test migrations against a
throwaway database; for idempotent data corrections run twice and include unaffected devices.

Use `python3 flow-space-nodered-a/flows-diff.py` (or pass the relevant instance file) to review node
function changes rather than the full JSON serialization. Preserve CRLF and JSON formatting.

For renames or deployment ordering, read [references/rename-and-deploy.md](references/rename-and-deploy.md).
Propose a commit message using [commit-message](../commit-message/SKILL.md).
