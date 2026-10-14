---
name: commit-message
description: Propose commit messages the project way after EVERY change (fix, feature, refactor, docs, diagram/statics, migration, Node-RED flows) in any part of eta-flow-space — without being asked. Use at the end of every reply that leaves uncommitted changes, and whenever the user asks for a commit name or to commit.
---

# Proposed commit messages

The user commits each change themselves and wants the message ready to approve. So **every reply that
finishes a change ends with a proposed commit message**: fixes, features, refactors, docs, diagram and
statics edits, migrations, `flows.json` edits. Don't just ask "want me to commit?". Repeat the proposal in
follow-up replies (after a test run, a render, a question) while the change is still uncommitted.

## Before proposing

- Run `git status --short` (and `git log --oneline -3`): the user may already have committed part of it.
  Propose messages only for what is really pending, and name the files each message covers when the
  change spans several parts.
- Check for side files the change needs: `flow-space-statics/manifest.json` hashes after a statics edit,
  the `database/` README after a migration.

## Format

One subject line only: **no body, no trailing period, no `Co-Authored-By`** (unless the user asks).

```
<type>: <what changed, as the user sees it>[ (short reason or numbers)][; second part][; third part]
```

- **Types** (by frequency in this repo): `fix`, `feat`, `refactor`, `chore`, `docs`, `perf`, `test`,
  `build`, `sync` (`sync: flows` = Node-RED re-saved flows.json on production).
- Lower case after the colon. A plain English sentence in the present tense describing the **result**
  ("the header's user button is round again", "boiler rooms get their own icon"), not the action
  ("fix button", "add icon").
- Lead with the user-visible effect. Put the cause or key detail in parentheses, and numbers when they
  matter: `(400, not 500)`, `(start JavaScript 3.6 → 3.1 MB)`.
- Several related parts in one commit: join them with `; `.
- **Keep it short.** When in doubt, offer the short version: the user chose
  `feat: selecting a meter in the side menu highlights it on the diagram` over a longer variant that
  listed the hook name, the tagged elements and the manifest.
- Russian where the repo uses it: site names (Весна-1, Царёво-1, Statum), UI labels in quotes
  ("Показывать все устройства", "Журнал аварий..."), meter names (ТВ7, КМ-5, Взлёт026, Меркурий).
- Identifiers in backticks are not used; write code names plainly (`dx-styles.scss`, `isShowedAllDevices`).

## Several commits or one

When a change spans parts the user may commit or deploy separately (UI / web API / statics / Node-RED /
database), propose one message per part with its files, **and** a single combined message as an option.

## Examples from the history

```
fix: the header's user button is round again (its menu styles moved after the DevExtreme theme, whose toolbar padding had won)
fix: device states by dates require fields (400, not 500); a device without a diagram selector shows its own diagram (no 500, live state keyed by its code)
feat: "Показывать все объекты карты" defaults to off for users without a stored value
feat: selecting a meter in the side menu highlights it on the diagram
perf: import DataGrid and SelectBox from their own devextreme-react modules; the start download halves (7.8 → 3.6 MB)
refactor: the alarm popover's mute menu is its own component (no component created during render)
chore: link the Царёво-1 ТВ7 heat meter to boiler-watcher, energoresurs and ukteplo (migration, applied)
docs: database README notes that the user-settings rename migration is no longer needed
```

## Committing

Commit only when the user asks, directly on `master`, with exactly the approved message.
