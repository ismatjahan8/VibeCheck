import { api } from "./client";

export type Me = {
  id: number;
  email: string;
  profile: { display_name: string; avatar_url?: string | null; status: string };
};

export async function getMe() {
  const { data } = await api.get("/users/me");
  return data as Me;
}

export async function updateProfile(payload: Partial<{ display_name: string; avatar_url: string | null; status: string }>) {
  const { data } = await api.put("/users/me/profile", payload);
  return data as Me;
}

