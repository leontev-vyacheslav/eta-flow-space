---
name: english-review
description: Review the user’s session English, identify recurring mistakes, suggest natural phrases, and update english-notes.md when the user asks for English feedback or the former Claude /english command.
---

# Session English review

Adapted from `.claude/commands/english.md`.

When the user requests an English review, use their messages from the available session. Identify
recurring mistakes with original and corrected wording, then give three natural phrases for similar
ideas. Distinguish a repeated pattern from a single typo; do not invent repetition or unavailable history.
Keep the response supportive and concise, preserving the user's intended meaning.

Read `english-notes.md` in the project root and append useful new corrections or phrases in its existing
style, avoiding duplicates. Review requests authorize this notes update under the former command's
workflow; if the user asks for feedback only or says not to edit files, honor that scope. Use the current
user-facing date if notes are dated. Do not turn unrelated programming requests into English lessons.
