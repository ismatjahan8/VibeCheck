import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Shell from "../components/Shell";
import { Contact, addContact, createConversation, listContacts } from "../api/chat";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [email, setEmail] = useState("");
  const [groupTitle, setGroupTitle] = useState("");
  const [selectedIds, setSelectedIds] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listContacts();
      setContacts(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await addContact(email);
      setEmail("");
      await refresh();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to add contact");
    }
  }

  async function startChat(userId: number) {
    setError(null);
    try {
      const conv = await createConversation("direct", [userId]);
      navigate(`/chats/${conv.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to start chat");
    }
  }

  async function createGroup() {
    setError(null);
    const ids = Object.entries(selectedIds)
      .filter(([, v]) => v)
      .map(([k]) => Number(k));
    if (ids.length < 1) {
      setError("Select at least 1 contact for a group");
      return;
    }
    try {
      const conv = await createConversation("group", ids, groupTitle || "New group");
      navigate(`/chats/${conv.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to create group");
    }
  }

  return (
    <Shell>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Contacts</h1>
      </div>

      <form onSubmit={onAdd} className="mt-4 flex gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
          placeholder="Add by email…"
          type="email"
          required
        />
        <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900" type="submit">
          Add
        </button>
      </form>

      {loading ? <div className="mt-3 text-sm text-zinc-500">Loading…</div> : null}
      {error ? <div className="mt-3 text-sm text-red-500">{error}</div> : null}

      <div className="mt-4 space-y-2">
        {contacts.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div>
              <div className="text-sm font-medium">{c.display_name || c.email}</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">{c.email} (user {c.user_id})</div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={!!selectedIds[c.user_id]}
                  onChange={(e) => setSelectedIds((prev) => ({ ...prev, [c.user_id]: e.target.checked }))}
                />
                Group
              </label>
              <button
                onClick={() => startChat(c.user_id)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
              >
                Message
              </button>
            </div>
          </div>
        ))}
        {!loading && contacts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            No contacts yet. Add someone by email (they must already have an account).
          </div>
        ) : null}
      </div>

      {contacts.length ? (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-sm font-medium">Create group</div>
          <div className="mt-3 flex gap-2">
            <input
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value)}
              className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
              placeholder="Group title…"
            />
            <button
              onClick={createGroup}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              type="button"
            >
              Create
            </button>
          </div>
          <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">Use the “Group” checkboxes above to choose members.</div>
        </div>
      ) : null}
    </Shell>
  );
}

