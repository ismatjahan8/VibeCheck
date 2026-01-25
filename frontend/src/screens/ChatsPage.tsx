import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Shell from "../components/Shell";
import { Conversation, listConversations } from "../api/chat";

export default function ChatsPage() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const data = await listConversations();
        if (!cancelled) setConvs(data);
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Failed to load conversations");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Shell>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Chats</h1>
        <Link className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800" to="/contacts">
          Start chat
        </Link>
      </div>

      {loading ? <div className="mt-4 text-sm text-zinc-500">Loading…</div> : null}
      {error ? <div className="mt-4 text-sm text-red-500">{error}</div> : null}

      <div className="mt-4 space-y-2">
        {convs.map((c) => (
          <Link
            key={c.id}
            to={`/chats/${c.id}`}
            className="block rounded-xl border border-zinc-200 bg-white p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-900/60"
          >
            <div className="text-sm font-medium">
              {c.type === "group" ? c.title || `Group #${c.id}` : `Direct #${c.id}`}
            </div>
            <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Members: {c.member_user_ids.join(", ")}
            </div>
          </Link>
        ))}
        {!loading && convs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            No chats yet. Go to Contacts to start one.
          </div>
        ) : null}
      </div>
    </Shell>
  );
}

