import { api } from "./client";

export async function signup(email: string, password: string, display_name: string) {
  const { data } = await api.post("/auth/signup", { email, password, display_name });
  return data as { access_token: string; token_type: string };
}

export async function login(email: string, password: string) {
  // OAuth2PasswordRequestForm expects x-www-form-urlencoded with username/password
  const params = new URLSearchParams();
  params.set("username", email);
  params.set("password", password);
  const { data } = await api.post("/auth/login", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });
  return data as { access_token: string; token_type: string };
}

export async function forgotPassword(email: string) {
  const { data } = await api.post("/auth/forgot-password", { email });
  return data as { ok: boolean };
}

export async function resetPassword(token: string, new_password: string) {
  const { data } = await api.post("/auth/reset-password", { token, new_password });
  return data as { ok: boolean };
}

export async function googleAuthUrl() {
  const { data } = await api.get("/auth/google/url");
  return data as { url: string };
}

