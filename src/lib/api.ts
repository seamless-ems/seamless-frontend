import { getToken } from "@/lib/auth";
import { deepCamel } from "@/lib/utils";

export const API_BASE = import.meta.env.VITE_API_URL || "";

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

  const json = await res.json();
  return deepCamel(json) as TRes;
}

async function patchJson<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(body),
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }

  const json = await res.json();
  return deepCamel(json) as TRes;
}

export async function getJson<TRes>(path: string): Promise<TRes> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: authHeaders(),
    credentials: "include",
  });

  if (!res.ok) {
    // If the user is unauthorized, redirect to the login page.
    if (res.status === 401) {
      // Use location.replace so the back button doesn't return to the protected page
      if (typeof window !== "undefined" && window.location) {
        window.location.replace("/login");
        // Return a never-resolving promise to satisfy the return type; navigation will occur.
        return new Promise<TRes>(() => {});
      }
    }

    const text = await res.text();
    throw new Error(text || res.statusText);
  }

  const json = await res.json();
  return deepCamel(json) as TRes;
}

export function presignUpload(body: { filename: string; content_type: string; owner_type: string; owner_id: string; }) {
  return postJson<typeof body, any>(`/uploads/presign`, body);
}

// Upload a binary file to the backend (multipart/form-data). Used as a fallback when presigned PUTs are blocked by CORS.
// Make ownerId, speakerId and eventId optional so callers can omit them when not available.
export async function uploadFile(
  file: File,
  ownerType: string,
  ownerId?: string,
  speakerId?: string,
  eventId?: string
): Promise<any> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("owner_type", ownerType);
  if (ownerId) fd.append("owner_id", ownerId);
  if (speakerId) fd.append("speaker_id", speakerId);
  if (eventId) fd.append("event_id", eventId);

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

  const json = await res.json();
  return deepCamel(json);
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
  accessToken: string;
  tokenType: string;
};

export function signup(body: SignupRequest): Promise<TokenSchema> {
  throw new Error("signup function has been removed.");
}

export function login(body: LoginRequest): Promise<TokenSchema> {
  throw new Error("login function has been removed.");
}

// Exchange a Firebase ID token for the backend's session/token representation.
// Backend should verify the ID token and return a TokenSchema { accessToken, tokenType }
export function exchangeFirebaseToken(idToken: string): Promise<TokenSchema> {
  return postJson<{ accessToken: string }, TokenSchema>("/auth/firebase", { accessToken: idToken });
}

// --- Account endpoints ---
export function getTeam(): Promise<any[]> {
  return getJson<any[]>(`/account/team`);
}

export function inviteTeamMember(body: any): Promise<any> {
  return postJson<any, any>(`/account/team/invite`, body);
}

export function acceptTeamInvite(token: string): Promise<any> {
  // token is expected in query per API spec
  return postJson<{}, any>(`/account/team/accept?token=${encodeURIComponent(token)}`, {});
}

export function updateTeamMember(memberId: string, role: string): Promise<any> {
  // role is a required query param per spec; use PATCH
  return patchJson<{}, any>(`/account/team/${encodeURIComponent(memberId)}?role=${encodeURIComponent(role)}`, {});
}

// Update team-level details (name/description)
export function updateTeamDetails(teamId: string, body: { name?: string; description?: string }): Promise<any> {
  // The backend expects PATCH /team/{team_id}/details with optional name/description
  const qs = [] as string[];
  if (body.name !== undefined) qs.push(`name=${encodeURIComponent(String(body.name))}`);
  if (body.description !== undefined) qs.push(`description=${encodeURIComponent(String(body.description))}`);
  const path = `/account/team/${encodeURIComponent(teamId)}/details${qs.length ? `?${qs.join("&")}` : ""}`;
  return patchJson<{}, any>(path, {});
}

export async function deleteTeamMember(memberId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/account/team/${encodeURIComponent(memberId)}`, {
    method: "DELETE",
    headers: authHeaders(),
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
}

export function getSubscription(): Promise<any> {
  return getJson<any>(`/account/subscription`);
}

export function changeSubscription(body: any): Promise<any> {
  return postJson<any, any>(`/account/subscription/change`, body);
}

export function listInvoices(): Promise<any> {
  return getJson<any>(`/account/billing/invoices`);
}

export function addPaymentMethod(body: any): Promise<any> {
  return postJson<any, any>(`/account/billing/payment-method`, body);
}

export function cancelSubscription(): Promise<any> {
  return postJson<{}, any>(`/account/subscription/cancel`, {});
}

export function getMe(): Promise<any> {
  return getJson<any>(`/account/me`);
}

export async function updateMe(body: any): Promise<any> {
  return patchJson<any, any>(`/account/me`, body);
}

export async function deleteAccount(): Promise<void> {
  const res = await fetch(`${API_BASE}/account/me`, {
    method: "DELETE",
    headers: authHeaders(),
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
}

export function changePassword(oldPassword: string, newPassword: string): Promise<any> {
  // API expects these as query params per spec
  return postJson<{}, any>(`/account/me/change-password?old_password=${encodeURIComponent(oldPassword)}&new_password=${encodeURIComponent(newPassword)}`, {});
}

export function getSettings(): Promise<any> {
  return getJson<any>(`/account/settings`);
}

export function updateSettings(body: any): Promise<any> {
  return postJson<any, any>(`/account/settings`, body);
}

// Integrations
export function getIntegrationUrl(provider: string): Promise<{ url: string }> {
  // backend returns { url: string }
  return getJson<{ url: string }>(`/integrations/link/${encodeURIComponent(provider)}`);
}

// Check provider connection status. Example: GET /integrations/google/drive/status
export function getGoogleDriveStatus(): Promise<{ connected: boolean; root_folder?: string }>{
  return getJson<{ connected: boolean; root_folder?: string }>(`/google/drive/status`);
}

// Create a new folder in the connected Google Drive for the current user
export function createGoogleDriveFolder(body: { folder_name: string; parent_folder_id?: string | null }): Promise<any> {
  return postJson<typeof body, any>(`/google/drive/folder`, body);
}
export async function deleteIntegration(provider: string): Promise<void> {
  const res = await fetch(`${API_BASE}/integrations/${encodeURIComponent(provider)}`, {
    method: "DELETE",
    headers: authHeaders(),
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
}

// Provider login initiators (these endpoints usually redirect)
// NOTE: googleLogin and microsoftLogin functions have been removed.

// Create an event
export function createEvent<T = any>(body: T): Promise<any> {
  return postJson<T, any>("/events", body);
}

// Update an existing event by id
export function updateEvent<T = any>(eventId: string, body: T): Promise<any> {
  return patchJson<T, any>(`/events/${encodeURIComponent(eventId)}`, body);
}

// Create a speaker for an event
export function createSpeakerIntake<T = any>(eventId: string, body: T): Promise<any> {
  return postJson<T, any>(`/events/${eventId}/speakers`, body);
}

export function createSpeaker<T = any>(eventId: string, body: T): Promise<any> {
  return postJson<T, any>(`/events/${eventId}/speakers`, body);
}

export async function updateSpeaker<T = any>(eventId: string, speakerId: string, body: T): Promise<any> {
  return patchJson<T, any>(`/events/${eventId}/speakers/${speakerId}`, body);
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

export async function deleteEvent(eventId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: authHeaders(),
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
}

// Support / Help
export function sendSupportMessage(body: { name?: string; email: string; subject?: string; message: string; }): Promise<any> {
  return postJson<typeof body, any>(`/support/contact`, body);
}
