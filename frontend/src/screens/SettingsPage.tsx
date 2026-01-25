import Shell from "../components/Shell";
import { useUiStore } from "../stores/ui";

export default function SettingsPage() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);

  return (
    <Shell>
      <h1 className="text-lg font-semibold">Settings</h1>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-sm font-medium">Appearance</div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Theme</div>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme("light")}
              className={`rounded-lg border px-3 py-2 text-sm dark:border-zinc-800 ${
                theme === "light" ? "border-zinc-900 dark:border-zinc-100" : "border-zinc-200"
              }`}
            >
              Light
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`rounded-lg border px-3 py-2 text-sm dark:border-zinc-800 ${
                theme === "dark" ? "border-zinc-900 dark:border-zinc-100" : "border-zinc-200"
              }`}
            >
              Dark
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

