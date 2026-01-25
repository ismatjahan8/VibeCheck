import { create } from "zustand";

type Theme = "light" | "dark";

type UiState = {
  theme: Theme;
  setTheme: (t: Theme) => void;
};

const STORAGE_KEY = "vibecheck_theme";

function initialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

export const useUiStore = create<UiState>((set) => ({
  theme: initialTheme(),
  setTheme: (t) => {
    localStorage.setItem(STORAGE_KEY, t);
    set({ theme: t });
  }
}));

