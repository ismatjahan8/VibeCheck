import { FormEvent, useEffect, useState } from "react";
import Shell from "../components/Shell";
import { getMe, updateProfile } from "../api/users";

export default function ProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const [statusText, setStatusText] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const me = await getMe();
        if (cancelled) return;
        setDisplayName(me.profile.display_name || "");
        setStatusText(me.profile.status || "");
        setAvatarUrl(me.profile.avatar_url ?? "");
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Failed to load profile");
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(null);
    try {
      await updateProfile({
        display_name: displayName,
        status: statusText,
        avatar_url: avatarUrl === "" ? null : avatarUrl
      });
      setSaved("Saved.");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Save failed");
    }
  }

  return (
    <Shell>
      <h1 className="text-lg font-semibold">Profile</h1>
      <form onSubmit={onSave} className="mt-4 space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="block text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Display name</span>
          <input
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Status</span>
          <input
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800"
            value={statusText}
            onChange={(e) => setStatusText(e.target.value)}
            placeholder="Feeling…"
          />
        </label>

        <label className="block text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Avatar URL</span>
          <input
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800"
            value={avatarUrl ?? ""}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://…"
          />
        </label>

        {saved ? <div className="text-sm text-green-600 dark:text-green-400">{saved}</div> : null}
        {error ? <div className="text-sm text-red-500">{error}</div> : null}

        <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900" type="submit">
          Save
        </button>
      </form>
    </Shell>
  );
}

