import { DurableObject } from "cloudflare:workers";

// One DuelRoom Durable Object instance per room *name* -- env.DUEL_ROOM.idFromName(name)
// deterministically maps a name string to the same object every time, which is exactly the
// "type the same name, land in the same room" behavior the game wants. The room name itself is
// never listed or broadcast anywhere; it only ever appears in messages the two players exchange
// directly (out of band, e.g. texting each other "join room bluefox42").
const MAX_SEATS = 4;

export class DuelRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // seat (0..3) -> live WebSocket. Seat 0 is whoever connects to an empty room first.
    this.sockets = new Map();
  }

  fetch(request) {
    const upgradeHeader = request.headers.get("Upgrade");
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
      return new Response("Expected a WebSocket upgrade request", { status: 426 });
    }

    let seat = -1;
    for (let i = 0; i < MAX_SEATS; i++) {
      if (!this.sockets.has(i)) { seat = i; break; }
    }
    if (seat === -1) {
      return new Response("Room is full", { status: 409 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    this.sockets.set(seat, server);

    server.send(JSON.stringify({
      type: "welcome",
      seat,
      seatsTaken: [...this.sockets.keys()].sort((a, b) => a - b),
    }));
    this.broadcast({ type: "peer-joined", seat }, seat);

    server.addEventListener("message", (evt) => {
      let msg;
      try { msg = JSON.parse(evt.data); } catch { return; }
      if (!msg || typeof msg !== "object") return;
      // The relay is deliberately game-agnostic: it doesn't parse or validate the payload at
      // all, just stamps who it's from and forwards it to everyone else in the room. All game
      // meaning lives entirely in the client.
      if (msg.type === "relay") {
        this.broadcast({ type: "relay", from: seat, payload: msg.payload }, seat);
      } else if (msg.type === "unicast") {
        // Directed delivery to exactly one seat -- everything else this relay does is a broadcast
        // (send to everyone but the sender), which is fine for public game state and actions, but
        // a per-recipient redacted state snapshot (each guest should see only their own hand, not
        // everyone else's) genuinely needs to reach exactly one socket, not all of them. Still
        // deliberately game-agnostic: the relay doesn't parse msg.payload at all, just needs a
        // target seat number to route to.
        const target = this.sockets.get(msg.to);
        if (target) {
          try { target.send(JSON.stringify({ type: "relay", from: seat, payload: msg.payload })); }
          catch { /* socket already gone; its own close handler will clean up */ }
        }
      }
    });

    const cleanup = () => {
      if (this.sockets.get(seat) === server) {
        this.sockets.delete(seat);
        this.broadcast({ type: "peer-left", seat }, seat);
      }
    };
    server.addEventListener("close", cleanup);
    server.addEventListener("error", cleanup);

    return new Response(null, { status: 101, webSocket: client });
  }

  broadcast(msgObj, excludeSeat) {
    const text = JSON.stringify(msgObj);
    for (const [seat, ws] of this.sockets) {
      if (seat === excludeSeat) continue;
      try { ws.send(text); } catch { /* socket already gone; its own close handler will clean up */ }
    }
  }
}

function normalizeRoomName(raw) {
  // Case/whitespace-insensitive so "BlueFox42" and " bluefox42 " land in the same room --
  // players are typing this by hand to match each other.
  return raw.trim().toLowerCase();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response("SchoolyardDuel relay is running.", { status: 200 });
    }

    if (url.pathname !== "/room") {
      return new Response("Not found", { status: 404 });
    }

    const rawName = url.searchParams.get("name") || "";
    const roomName = normalizeRoomName(rawName);
    if (!roomName || roomName.length > 64) {
      return new Response("Missing or invalid room name (1-64 chars)", { status: 400 });
    }

    const id = env.DUEL_ROOM.idFromName(roomName);
    const stub = env.DUEL_ROOM.get(id);
    return stub.fetch(request);
  },
};
