import { create } from "zustand";

type AuthState = {
  token: string | null;
  setToken: (t: string | null) => void;
  logout: () => void;
};

const STORAGE_KEY = "vibecheck_token";

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(STORAGE_KEY),
  setToken: (t) => {
    if (t) localStorage.setItem(STORAGE_KEY, t);
    else localStorage.removeItem(STORAGE_KEY);
    set({ token: t });
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ token: null });
  }
}));

