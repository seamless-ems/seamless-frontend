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
    // Surface 401 errors to callers instead of redirecting here.
    // Components (or a global auth handler) should decide how to react
    // when the backend reports the token is invalid/expired.
    const text = await res.text();
    const message = text || res.statusText || `HTTP ${res.status}`;
    const err: any = new Error(message);
    err.status = res.status;
    throw err;
  }

  const json = await res.json();
  return deepCamel(json) as TRes;
}

// Request a presigned upload URL. Backend no longer expects `owner_type`/`owner_id`.
// Keep a compatible helper but accept event/speaker metadata instead.
export function presignUpload(body: { filename: string; content_type: string; event_id?: string; speaker_id?: string; speaker_name?: string; }) {
  return postJson<typeof body, any>(`/uploads/presign`, body);
}

// Upload a binary file to the backend (multipart/form-data). Used as a fallback when presigned PUTs are blocked by CORS.
// Keep signature compatible but do not send deprecated fields `owner_type` or `owner_id`.
export async function uploadFile(
  file: File,
  speakerId?: string,
  eventId?: string,
  speakerName?: string
): Promise<any> {
  const fd = new FormData();
  fd.append("file", file);
  // backend no longer expects owner_type or owner_id; preserve other metadata
  if (speakerId) fd.append("speaker_id", speakerId);
  if (eventId) fd.append("event_id", eventId);
  if (speakerName) fd.append("speaker_name", speakerName);

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
  name?: string;
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
export function exchangeFirebaseToken(idToken: string, name?: string): Promise<TokenSchema> {
  const body: { accessToken: string; name?: string } = { accessToken: idToken };
  if (name) body.name = name;
  return postJson<{ accessToken: string; name?: string }, TokenSchema>("/auth/firebase", body);
}

// --- Account endpoints ---
export function getTeam(): Promise<any[]> {
  return getJson<any[]>(`/account/team`);
}

export function createTeam(body: { name: string; description?: string; organizationId: string }): Promise<any> {
  // Backend expects the organization id to associate the team with.
  return postJson<typeof body, any>(`/account/team`, body);
}

export function getOrganization(): Promise<any> {
  return getJson<any>(`/account/organization`);
}

export function createOrganization(body: { name: string }): Promise<any> {
  return postJson<typeof body, any>(`/account/organization`, body);
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
  const res = await fetch(`${API_BASE}/account/team/member/${encodeURIComponent(memberId)}`, {
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

// List available roles for the current account/organization
export function getRoles(): Promise<any[]> {
  return getJson<any[]>(`/account/roles`);
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

// Forms config endpoints
export function getFormConfigForEvent(eventId: string, formType: string): Promise<any> {
  const qs = `?form_type=${encodeURIComponent(formType)}`;
  return getJson<any>(`/forms/config/${encodeURIComponent(eventId)}${qs}`);
}

export function createFormConfig(body: { eventId: string; formType: string; config: any[] }): Promise<any> {
  // Backend expects eventId, formType and config (array)
  return postJson<typeof body, any>(`/forms/config`, body);
}

// Promo cards endpoints
export function getPromoConfigForEvent(eventId: string, promoType?: string): Promise<any> {
  const qs = promoType ? `?promo_type=${encodeURIComponent(promoType)}` : "";
  return getJson<any>(`/promo-cards/config/${encodeURIComponent(eventId)}${qs}`);
}

export function createPromoConfig(body: { eventId: string; promoType: string; config: any }): Promise<any> {
  return postJson<typeof body, any>(`/promo-cards/config`, body);
}
// Website template endpoints (parallel to promo cards)
export function getWebsiteConfigForEvent(eventId: string): Promise<any> {
  return getJson<any>(`/website/config/${encodeURIComponent(eventId)}`);
}

export function createWebsiteConfig(body: { eventId: string; config: any }): Promise<any> {
  return postJson<typeof body, any>(`/website/config`, body);
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
