import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuthStore } from "../stores/auth";

export default function OAuthGoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setToken = useAuthStore((s) => s.setToken);

  const code = searchParams.get("code");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!code) {
        setError("Missing code");
        return;
      }
      try {
        const { data } = await api.get(`/auth/google/callback`, { params: { code } });
        if (cancelled) return;
        setToken(data.access_token);
        navigate("/chats");
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Google login failed");
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [code, navigate, setToken]);

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-xl font-semibold">Signing you in…</h1>
        {error ? <div className="mt-2 text-sm text-red-500">{error}</div> : <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Please wait.</div>}
      </div>
    </div>
  );
}

