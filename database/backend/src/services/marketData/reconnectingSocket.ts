import WebSocket from "ws";

interface Handlers {
  onOpen?: (ws: WebSocket) => void;
  /** May be async; rejections are logged instead of crashing the process. */
  onMessage: (message: any) => void | Promise<void>;
}

/** Feed connections silent for this long are treated as dead and re-established. */
const SILENCE_RECONNECT_MS = 30_000;

/**
 * JSON WebSocket client for upstream market-data feeds: reconnects with exponential backoff,
 * tracks when the last message arrived, and replaces connections that go silent (a socket can
 * stay "open" after the upstream stops sending).
 */
export class ReconnectingSocket {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private watchdog: NodeJS.Timeout | null = null;
  private reconnectDelayMs = 1000;
  private readonly maxReconnectDelayMs = 30_000;
  private stopped = false;
  private lastMessageAt = 0;

  constructor(
    private readonly name: string,
    private readonly url: string,
    private readonly handlers: Handlers
  ) {}

  start() {
    this.stopped = false;
    this.connect();
    this.watchdog = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN && Date.now() - this.lastMessageAt > SILENCE_RECONNECT_MS) {
        console.warn(`[${this.name}] no data for ${SILENCE_RECONNECT_MS / 1000}s, reconnecting`);
        this.ws.terminate();
      }
    }, 5_000);
  }

  stop() {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.watchdog) clearInterval(this.watchdog);
    this.ws?.close();
  }

  /** True when connected and a message arrived within the last `maxSilenceMs`. */
  isLive(maxSilenceMs: number): boolean {
    return this.ws?.readyState === WebSocket.OPEN && Date.now() - this.lastMessageAt < maxSilenceMs;
  }

  private connect() {
    if (this.stopped) return;
    console.log(`[${this.name}] connecting: ${this.url}`);
    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.on("open", () => {
      console.log(`[${this.name}] connected`);
      this.reconnectDelayMs = 1000;
      this.lastMessageAt = Date.now();
      this.handlers.onOpen?.(ws);
    });

    ws.on("message", (raw) => {
      this.lastMessageAt = Date.now();
      let message: unknown;
      try {
        message = JSON.parse(raw.toString());
      } catch (err) {
        console.error(`[${this.name}] failed to parse message`, err);
        return;
      }
      Promise.resolve()
        .then(() => this.handlers.onMessage(message))
        .catch((err) => console.error(`[${this.name}] failed to handle message`, err));
    });

    ws.on("close", () => {
      if (this.stopped || this.ws !== ws) return;
      console.warn(`[${this.name}] disconnected, reconnecting in ${this.reconnectDelayMs}ms`);
      this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelayMs);
      this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, this.maxReconnectDelayMs);
    });

    ws.on("error", (err) => {
      console.error(`[${this.name}] socket error`, err.message);
    });
  }
}
