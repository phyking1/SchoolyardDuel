# Schoolyard Duel

A single-file Yu-Gi-Oh-style card duel game. The entire game lives in `index.html`
(card database, game state, bot AI, rendering — all client-side).

## Online multiplayer

`server/` is a Cloudflare Worker + Durable Object relay for room-name-based online play (see
`server/README.md`). It's a thin, game-agnostic WebSocket relay only — it never inspects game
content. `index.html`'s host client is the sole source of truth for a networked game: it runs the
same game logic as local vs-bots play and broadcasts the full state after every render(); other
connected seats are thin renderers that dispatch their own actions back to the host instead of
mutating state directly (see the "ONLINE MULTIPLAYER" section near the top of the `<script>`
block, and `ONLINE_ACTION_FNS`/`dispatchAction()`). `RELAY_WS_BASE` points at the deployed Worker
(`wss://schoolyardduel-relay.schoolyardduel.workers.dev/room`). Redeploy via the "Deploy relay
server" GitHub Actions workflow (`.github/workflows/deploy-relay.yml`, manual trigger, needs a
`CLOUDFLARE_API_TOKEN` repo secret) whenever `server/` changes -- it doesn't redeploy
automatically on push.

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
