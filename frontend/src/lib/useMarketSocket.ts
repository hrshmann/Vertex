"use client";

import { useEffect, useRef } from "react";
import { marketSocketUrl } from "./config";

export interface WsEvent<T = unknown> {
  event: string;
  data: T;
  ts: string;
}

type Listener = (evt: WsEvent) => void;

/**
 * One shared WebSocket connection per browser tab. Any connected client receives public
 * market.* events; account events (notifications) are only
 * sent to sockets authenticated via the vx_access cookie, which the browser attaches to the
 * handshake request automatically — see backend/src/services/ws/wsHub.ts.
 */
let sharedSocket: WebSocket | null = null;
let listeners = new Set<Listener>();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;

function ensureSocket() {
  if (sharedSocket && (sharedSocket.readyState === WebSocket.OPEN || sharedSocket.readyState === WebSocket.CONNECTING)) {
    return;
  }
  const socket = new WebSocket(marketSocketUrl());
  sharedSocket = socket;

  socket.onopen = () => {
    reconnectDelay = 1000;
  };
  socket.onmessage = (ev) => {
    try {
      const parsed = JSON.parse(ev.data) as WsEvent;
      listeners.forEach((l) => l(parsed));
    } catch {
      /* ignore malformed frame */
    }
  };
  socket.onclose = () => {
    reconnectTimer = setTimeout(() => {
      if (listeners.size > 0) ensureSocket();
    }, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, 15000);
  };
  socket.onerror = () => socket.close();
}

/** True while the shared socket is connected and delivering live events. */
export function isMarketSocketOpen(): boolean {
  return sharedSocket?.readyState === WebSocket.OPEN;
}

/** Listens to the shared socket outside React; returns the unsubscribe function. */
export function subscribeMarketSocket(listener: Listener): () => void {
  if (!marketSocketUrl()) return () => {};
  listeners.add(listener);
  ensureSocket();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && sharedSocket) {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      sharedSocket.close();
      sharedSocket = null;
    }
  };
}

export function useMarketSocket(onEvent: Listener) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => subscribeMarketSocket((evt) => handlerRef.current(evt)), []);
}
