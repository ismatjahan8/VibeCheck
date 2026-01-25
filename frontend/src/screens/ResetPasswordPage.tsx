import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { forgotPassword, resetPassword } from "../api/auth";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const [email, setEmail] = useState("");
  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onForgot(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    setLoading(true);
    try {
      await forgotPassword(email);
      setStatus("If the email exists, a reset link was sent.");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function onReset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setStatus("Password updated. You can now sign in.");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-md px-4 py-12 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Password reset</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Request a reset link or set a new password.</p>
        </div>

        <form onSubmit={onForgot} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-sm font-medium">Request reset link</div>
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
          <button
            disabled={loading}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium disabled:opacity-60 dark:border-zinc-800"
            type="submit"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <form onSubmit={onReset} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-sm font-medium">Reset with token</div>
          <label className="block text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Token</span>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              type="text"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">New password</span>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              minLength={8}
              required
            />
          </label>
          <button
            disabled={loading}
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
            type="submit"
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>

        {status ? <div className="text-sm text-green-600 dark:text-green-400">{status}</div> : null}
        {error ? <div className="text-sm text-red-500">{error}</div> : null}

        <div className="text-sm">
          <Link className="text-zinc-600 hover:underline dark:text-zinc-400" to="/login">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

