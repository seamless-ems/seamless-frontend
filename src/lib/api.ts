export const API_BASE = import.meta.env.VITE_API_URL || "";

import { getToken } from "@/lib/auth";

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function postJson<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }

  return res.json();
}

export async function getJson<TRes>(path: string): Promise<TRes> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: authHeaders(),
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }

  return res.json();
}

export type SignupRequest = {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type TokenSchema = {
  access_token: string;
  token_type: string;
};

export function signup(body: SignupRequest): Promise<TokenSchema> {
  return postJson<SignupRequest, TokenSchema>("/oauth2/signup", body);
}

export function login(body: LoginRequest): Promise<TokenSchema> {
  return postJson<LoginRequest, TokenSchema>("/oauth2/login", body);
}

// Provider login initiators (these endpoints usually redirect)
export function googleLogin(): string {
  return `${API_BASE}/google/login`;
}

export function microsoftLogin(): string {
  return `${API_BASE}/microsoft/login`;
}
