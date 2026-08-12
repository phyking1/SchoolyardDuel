# Schoolyard Duel

A single-file Yu-Gi-Oh-style card duel game. The entire game lives in `index.html`
(card database, game state, bot AI, rendering — all client-side, no server).

## Versioning

- The game has an in-game version string, `GAME_VERSION`, set near the top of the `<script>`
  block and displayed in small, dim text at the bottom of the start screen (`#version-tag`).
- Every time a new version of `index.html` is pushed (whether supplied by the user as an
  uploaded file named like `schoolyardduelvNN.html`, or produced by edits in a session), bump
  `GAME_VERSION` to the next `vNN` and keep the displayed tag in sync.
- Commit messages should mention the version where practical (e.g. "Update to v13: ...").

## Before pushing to `main`

Always ask the user for explicit permission before pushing any new version to `main`, even if
the change was requested in the same message. Make the change, show/describe it, then confirm
before running `git push`.
