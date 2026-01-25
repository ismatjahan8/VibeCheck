import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Shell from "../components/Shell";
import { Message, listMessages, presignUpload, sendMessage } from "../api/chat";
import { connectWs, WsEvent } from "../api/ws";

export default function ChatPage() {
  const { conversationId } = useParams();
  const convId = useMemo(() => Number(conversationId), [conversationId]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [typingUserIds, setTypingUserIds] = useState<number[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<number[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!convId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await listMessages(convId);
        if (!cancelled) setMessages(data);
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Failed to load messages");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [convId]);

  useEffect(() => {
    try {
      const ws = connectWs((e: WsEvent) => {
        if (e.type === "message:new" && e.conversation_id === convId) {
          setMessages((prev) => (prev.some((m) => m.id === e.message.id) ? prev : [...prev, e.message]));
        }
        if ((e.type === "typing:start" || e.type === "typing:stop") && e.conversation_id === convId) {
          setTypingUserIds((prev) => {
            const set = new Set(prev);
            if (e.type === "typing:start") set.add(e.user_id);
            else set.delete(e.user_id);
            return Array.from(set);
          });
        }
        if (e.type === "presence:update") {
          setOnlineUserIds((prev) => {
            const set = new Set(prev);
            if (e.online) set.add(e.user_id);
            else set.delete(e.user_id);
            return Array.from(set);
          });
        }
      });
      wsRef.current = ws;
      return () => {
        ws.close();
      };
    } catch {
      return;
    }
  }, [convId]);

  function emitTyping(active: boolean) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: active ? "typing:start" : "typing:stop", conversation_id: convId }));
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!text.trim()) return;
    try {
      const m = await sendMessage(convId, text.trim(), []);
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      setText("");
      emitTyping(false);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Send failed");
    }
  }

  async function onUpload(file: File) {
    setError(null);
    try {
      const presign = await presignUpload(file.type || "application/octet-stream", file.name, file.type.startsWith("image/") ? "image" : "file");
      await fetch(presign.upload_url, {
        method: presign.upload_method,
        headers: presign.upload_headers,
        body: file
      });
      const m = await sendMessage(convId, "", [presign.attachment_id]);
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Upload failed");
    }
  }

  return (
    <Shell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Chat #{convId}</h1>
          <div className="mt-0.5 text-xs text-zinc-500">
            Online users (seen): {onlineUserIds.length ? onlineUserIds.join(", ") : "—"}
          </div>
        </div>
        <label className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
          Attach
          <input
            className="hidden"
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      {loading ? <div className="mt-3 text-sm text-zinc-500">Loading…</div> : null}
      {error ? <div className="mt-3 text-sm text-red-500">{error}</div> : null}

      <div className="mt-4 h-[60vh] overflow-auto rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m.id} className="rounded-lg border border-zinc-100 p-2 text-sm dark:border-zinc-800">
              <div className="text-xs text-zinc-500">User {m.sender_id}</div>
              {m.body ? <div className="mt-1 whitespace-pre-wrap">{m.body}</div> : null}
              {m.attachments?.length ? (
                <div className="mt-2 space-y-2">
                  {m.attachments.map((a) => (
                    <div key={a.id} className="text-xs">
                      {a.kind === "image" ? (
                        <a href={a.url} target="_blank" rel="noreferrer" className="inline-block">
                          <img src={a.url} alt={`attachment-${a.id}`} className="max-h-48 rounded-lg border border-zinc-200 dark:border-zinc-800" />
                        </a>
                      ) : (
                        <a href={a.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
                          Download {a.kind} #{a.id}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {typingUserIds.length ? (
        <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">Typing: {typingUserIds.join(", ")}</div>
      ) : (
        <div className="mt-2 text-xs text-zinc-500"> </div>
      )}

      <form onSubmit={onSend} className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            emitTyping(true);
            if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = window.setTimeout(() => emitTyping(false), 1200);
          }}
          className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
          placeholder="Message…"
        />
        <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900" type="submit">
          Send
        </button>
      </form>
    </Shell>
  );
}

