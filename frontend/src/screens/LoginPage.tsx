import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { googleAuthUrl, login } from "../api/auth";
import { useAuthStore } from "../stores/auth";

export default function LoginPage() {
  const setToken = useAuthStore((s) => s.setToken);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = searchParams.get("from") || "/chats";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email, password);
      setToken(res.access_token);
      navigate(from);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setError(null);
    try {
      const { url } = await googleAuthUrl();
      window.location.href = url;
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Google login not configured");
    }
  }

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-semibold">VibeCheck</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Sign in to continue.</p>

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
            <span className="text-zinc-700 dark:text-zinc-300">Password</span>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </label>

          {error ? <div className="text-sm text-red-500">{error}</div> : null}

          <button
            disabled={loading}
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
            type="submit"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <button
            type="button"
            onClick={onGoogle}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium dark:border-zinc-800"
          >
            Continue with Google
          </button>

          <div className="flex items-center justify-between text-sm">
            <Link className="text-zinc-600 hover:underline dark:text-zinc-400" to="/reset-password">
              Forgot password?
            </Link>
            <Link className="text-zinc-600 hover:underline dark:text-zinc-400" to="/signup">
              Create account
            </Link>
          </div>
        </form>

        <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-500">
          Tip: For Google sign-in, set backend env `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` to a frontend URL like `https://your-frontend.../oauth/google/callback`.
        </p>
      </div>
    </div>
  );
}

