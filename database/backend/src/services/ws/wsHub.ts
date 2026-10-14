import { WebSocket, WebSocketServer } from "ws";
import { Server, IncomingMessage } from "node:http";
import { verifyAccessToken } from "../../utils/jwt";

function extractAccessToken(req: IncomingMessage): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    for (const part of cookieHeader.split(";")) {
      const [key, ...rest] = part.trim().split("=");
      if (key === "vx_access") return decodeURIComponent(rest.join("="));
    }
  }
  return undefined;
}

type Topic = "market" | `account:${string}`;

interface ClientMeta {
  topics: Set<string>;
  userId?: string;
}

/**
 * Thin pub/sub WebSocket hub. Any connected client receives market.* events by default
 * (public data). Account-scoped events (order.*, position.*, balance.*, notification.created)
 * are only sent to the socket that authenticated as that user.
 *
 * Event envelope: { event: string, data: unknown, ts: string }
 */
export class WsHub {
  private wss: WebSocketServer;
  private clients = new Map<WebSocket, ClientMeta>();

  constructor(server: Server, allowedOrigins: string[]) {
    this.wss = new WebSocketServer({
      server,
      path: "/ws",
      verifyClient: ({ origin }, done) => {
        if (!origin || allowedOrigins.includes(origin)) {
          done(true);
          return;
        }
        done(false, 403, "Origin is not allowed");
      },
    });

    this.wss.on("connection", (socket, req) => {
      const meta: ClientMeta = { topics: new Set(["market"]) };
      this.clients.set(socket, meta);

      // Auth via the same httpOnly vx_access cookie used by the REST API — the browser sends
      // it automatically on the WS handshake request, so no token ever has to live in JS or a
      // URL (which could leak into logs or proxy history).
      try {
        const token = extractAccessToken(req);
        if (token) {
          const payload = verifyAccessToken(token);
          meta.userId = payload.sub;
          meta.topics.add(`account:${payload.sub}`);
        }
      } catch {
        // Invalid/missing token: socket stays on the public "market" topic only.
      }

      socket.on("close", () => this.clients.delete(socket));
      socket.on("error", () => this.clients.delete(socket));
    });
  }

  broadcastMarket(event: string, data: unknown) {
    this.broadcast("market", event, data);
  }

  sendToUser(userId: string, event: string, data: unknown) {
    this.broadcast(`account:${userId}`, event, data);
  }

  close() {
    for (const socket of this.clients.keys()) {
      socket.terminate();
    }
    this.clients.clear();
    this.wss.close();
  }

  private broadcast(topic: string, event: string, data: unknown) {
    const payload = JSON.stringify({ event, data, ts: new Date().toISOString() });
    for (const [socket, meta] of this.clients) {
      if (meta.topics.has(topic) && socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
      }
    }
  }

  get connectedCount() {
    return this.clients.size;
  }
}
