import { useAuthStore } from "../stores/auth";

const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
const wsBase =
  (import.meta.env.VITE_WS_URL as string | undefined) ||
  apiBase.replace(/^http/, "ws"); // http->ws, https->wss

export type WsEvent =
  | { type: "message:new"; conversation_id: number; message: any }
  | { type: "receipt:update"; conversation_id: number; message_id: number; user_id: number; status: string }
  | { type: "typing:start" | "typing:stop"; conversation_id?: number; user_id: number }
  | { type: "presence:update"; user_id: number; online: boolean }
  | { type: string; [k: string]: any };

export function connectWs(onEvent: (e: WsEvent) => void) {
  const token = useAuthStore.getState().token;
  if (!token) throw new Error("Not authenticated");

  const ws = new WebSocket(`${wsBase}/api/v1/ws?token=${encodeURIComponent(token)}`);

  ws.onmessage = (msg) => {
    try {
      onEvent(JSON.parse(msg.data));
    } catch {
      // ignore
    }
  };

  return ws;
}

