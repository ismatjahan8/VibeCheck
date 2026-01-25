import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signup } from "../api/auth";
import { useAuthStore } from "../stores/auth";

export default function SignupPage() {
  const setToken = useAuthStore((s) => s.setToken);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signup(email, password, displayName);
      setToken(res.access_token);
      navigate("/chats");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-semibold">Create account</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Join VibeCheck.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <label className="block text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Email</span>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </label>

          <label className="block text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Display name</span>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              type="text"
              placeholder="Optional"
            />
          </label>

          <label className="block text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Password</span>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              minLength={8}
            />
          </label>

          {error ? <div className="text-sm text-red-500">{error}</div> : null}

          <button
            disabled={loading}
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
            type="submit"
          >
            {loading ? "Creating..." : "Create account"}
          </button>

          <div className="text-sm">
            <Link className="text-zinc-600 hover:underline dark:text-zinc-400" to="/login">
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

