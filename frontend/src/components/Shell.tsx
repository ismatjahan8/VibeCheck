import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../stores/auth";

function NavLink({ to, label }: { to: string; label: string }) {
  const { pathname } = useLocation();
  const active = pathname === to || pathname.startsWith(`${to}/`);
  return (
    <Link
      to={to}
      className={`rounded-lg px-3 py-2 text-sm ${
        active ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
      }`}
    >
      {label}
    </Link>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const logout = useAuthStore((s) => s.logout);
  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-900 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/chats" className="text-sm font-semibold">
            VibeCheck
          </Link>
          <nav className="flex gap-1">
            <NavLink to="/chats" label="Chats" />
            <NavLink to="/contacts" label="Contacts" />
            <NavLink to="/profile" label="Profile" />
            <NavLink to="/settings" label="Settings" />
          </nav>
          <button
            onClick={logout}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-4">{children}</main>
    </div>
  );
}

