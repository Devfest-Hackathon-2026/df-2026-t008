import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { randomUUID } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import { RoomRegistry } from "./rooms";
import { handleAi } from "./ai";
const registry = new RoomRegistry();
const root = resolve("dist");
const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};
const server = createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (await handleAi(req, res)) return;
  if (req.url === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, rooms: registry.rooms.size }));
    return;
  }
  if (req.url?.startsWith("/api/")) {
    res.writeHead(404);
    res.end();
    return;
  }
  try {
    const pathname = decodeURIComponent(
      new URL(req.url ?? "/", "http://localhost").pathname,
    );
    let file = resolve(root, "." + pathname);
    if (file !== root && !file.startsWith(root + "/"))
      throw new Error("Invalid path");
    try {
      if (!(await stat(file)).isFile()) file = resolve(root, "index.html");
    } catch {
      file = resolve(root, "index.html");
    }
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": mime[extname(file)] ?? "application/octet-stream",
      "Cache-Control":
        extname(file) === ".html" ? "no-cache" : "public, max-age=3600",
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("Build the app with npm run build, or use npm run dev.");
  }
});
const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 65536 });
const sockets = new Map<string, WebSocket>();
const send = (socket: WebSocket, message: unknown) => {
  if (socket.readyState === WebSocket.OPEN)
    socket.send(JSON.stringify(message));
};
const broadcast = (room: ReturnType<RoomRegistry["get"]>) =>
  room.players.forEach((p) => {
    const socket = sockets.get(p.id);
    if (socket) send(socket, { type: "state", state: room });
  });
wss.on("connection", (socket, req) => {
  const origin = req.headers.origin;
  if (origin) {
    try {
      const source = new URL(origin);
      const requestHost = (req.headers.host ?? "").split(":")[0];
      if (
        source.hostname !== requestHost &&
        !(
          process.env.ALLOWED_ORIGIN &&
          source.origin === process.env.ALLOWED_ORIGIN
        )
      ) {
        socket.close(1008, "Origin not allowed");
        return;
      }
    } catch {
      socket.close(1008, "Invalid origin");
      return;
    }
  }
  const id = randomUUID();
  sockets.set(id, socket);
  let alive = true;
  let count = 0;
  let windowStart = Date.now();
  socket.on("pong", () => {
    alive = true;
  });
  const heartbeat = setInterval(() => {
    if (!alive) {
      socket.terminate();
      return;
    }
    alive = false;
    socket.ping();
  }, 30000);
  socket.on("message", (raw) => {
    try {
      if (Date.now() - windowStart > 1000) {
        count = 0;
        windowStart = Date.now();
      }
      if (++count > 60)
        throw new Error("操作が多すぎます。少し待ってください。");
      const event = JSON.parse(raw.toString());
      if (!event || typeof event !== "object")
        throw new Error("不正な操作です。");
      if (event.type === "create" || event.type === "join") {
        if (event.language !== "javascript" && event.language !== "python")
          throw new Error("コースを選んでください。");
        if (typeof event.name !== "string")
          throw new Error("名前を入力してください。");
        const room =
          event.type === "create"
            ? registry.create(id, event.language, event.name)
            : registry.join(id, String(event.code), event.language, event.name);
        send(socket, { type: "joined", playerId: id, state: room });
        broadcast(room);
      } else if (event.type === "leave") {
        const room = registry.leave(id);
        if (room) broadcast(room);
      } else broadcast(registry.handle(id, event));
    } catch (error) {
      send(socket, {
        type: "error",
        message:
          error instanceof Error ? error.message : "操作に失敗しました。",
      });
    }
  });
  socket.on("close", () => {
    clearInterval(heartbeat);
    sockets.delete(id);
    const room = registry.leave(id);
    if (room) broadcast(room);
  });
  socket.on("error", () => socket.terminate());
});
const port = Number(process.env.PORT ?? 3001);
server.listen(port, process.env.HOST ?? "127.0.0.1", () =>
  console.log(`Please server ready at http://127.0.0.1:${port}`),
);
function shutdown() {
  wss.clients.forEach((socket) => socket.close());
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
