# SchoolyardDuel relay server

A tiny Cloudflare Worker + Durable Object that lets two (soon up to four) browsers find each
other by room name and exchange messages in real time. It runs entirely on Cloudflare's free
plan (Durable Objects + WebSockets are both included, no paid tier needed).

## How it works

- `env.DUEL_ROOM.idFromName(roomName)` deterministically maps a room name string to one specific
  `DuelRoom` Durable Object instance -- so two browsers that connect with the same name land in
  the same room, with nothing published or listed anywhere. Room names are trimmed and
  lowercased before hashing, so casing/whitespace differences still match.
- Each `DuelRoom` tracks up to 4 connected WebSockets, assigned seat 0-3 in join order (first
  connector -- the "host" -- gets seat 0). The 5th connection attempt to a full room is rejected
  with HTTP 409.
- The relay is deliberately game-agnostic: it never inspects the contents of a message, it just
  stamps `from: <seat>` and forwards `{type:"relay", payload:...}` messages to everyone else in
  the room. All game meaning lives entirely in the client (`index.html`).

## Local development

```
npm install
npm run dev          # starts a local simulator on http://localhost:8787, no Cloudflare account needed
```

## Deploying

Deploying to a real `*.workers.dev` URL requires a Cloudflare account:

```
npx wrangler login   # one-time interactive browser login
npm run deploy
```
