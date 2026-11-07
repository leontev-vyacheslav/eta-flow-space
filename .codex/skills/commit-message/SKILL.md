---
name: commit-message
description: Propose Eta Flow Space commit subjects after project changes or when asked for a commit message; check pending files and follow repository wording without committing automatically.
---

# Commit messages

Adapted from `.claude/skills/commit-message/SKILL.md`.
The established preference is for the user to commit. After a change, include a short proposed subject
in the final reply. A request only for a message does not authorize committing.

Before proposing, inspect `git status --short` and recent subjects (`git log -3 --oneline`). Account only
for pending work; do not claim unrelated user edits. Check required companion files such as the static
manifest, schema and migration status documentation.

Use one subject line, no trailing period or co-author trailer unless requested:

`<type>: <result>`

Types include `fix`, `feat`, `refactor`, `chore`, `docs`, `perf`, `test`, `build`, and `sync`.
`sync: flows` describes Node-RED editor changes synchronized from production.
Use lowercase after the colon, concise present-tense English, and the observable result. Retain Russian
site names, meter names and quoted UI labels where helpful. Do not put identifiers in backticks inside
the subject. Related results may be joined by `; `.

Examples:

- `feat: selecting a meter highlights it on the diagram`
- `fix: missing state fields return 400 instead of 500`
- `docs: database README records the verified migration`

If components are genuinely independent, suggest separate subjects and identify their file groups;
otherwise propose one cohesive subject. Offer a combined alternative only if useful.

Commit only when the user requests it, respecting their requested message and scope. Inspect the
current branch and working tree; do not switch to master or include unrelated changes automatically.
