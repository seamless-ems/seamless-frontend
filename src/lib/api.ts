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

export function presignUpload(body: { filename: string; content_type: string; owner_type: string; owner_id: string; }) {
  return postJson<typeof body, any>(`/uploads/presign`, body);
}

// Upload a binary file to the backend (multipart/form-data). Used as a fallback when presigned PUTs are blocked by CORS.
export async function uploadFile(file: File, ownerType: string, ownerId: string): Promise<any> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("owner_type", ownerType);
  fd.append("owner_id", ownerId);

  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/uploads`, {
    method: "POST",
    headers,
    body: fd,
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

// Create an event
export function createEvent<T = any>(body: T): Promise<any> {
  return postJson<T, any>("/events", body);
}

// Create a speaker for an event
export function createSpeakerIntake<T = any>(eventId: string, body: T): Promise<any> {
  return postJson<T, any>(`/events/${eventId}/speakers`, body);
}

export function createSpeaker<T = any>(eventId: string, body: T): Promise<any> {
  return postJson<T, any>(`/events/${eventId}/speakers`, body);
}

export async function updateSpeaker<T = any>(eventId: string, speakerId: string, body: T): Promise<any> {
  const res = await fetch(`${API_BASE}/events/${eventId}/speakers/${speakerId}`, {
    method: "PATCH",
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

export async function deleteSpeaker(eventId: string, speakerId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/events/${eventId}/speakers/${speakerId}`, {
    method: "DELETE",
    headers: authHeaders(),
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
}
