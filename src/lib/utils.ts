import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toCamel(str: string) {
  return str.replace(/_([a-z0-9])/g, (_: string, c: string) => c.toUpperCase());
}

export function deepCamel(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(deepCamel);
  if (typeof obj !== "object") return obj;

  const out: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const camelKey = toCamel(key);
    out[camelKey] = deepCamel(obj[key]);
  }
  return out;
}

// Flatten a nested folder tree into a list of { id, name, path }
export function flattenFolderTree(folders: any[] | undefined): Array<{ id: string; name: string; path: string }> {
  const out: Array<{ id: string; name: string; path: string }> = [];
  if (!folders || !Array.isArray(folders)) return out;

  const dfs = (nodes: any[], prefix: string) => {
    for (const node of nodes) {
      const id = node.id ?? node.folder_id ?? String(node);
      const name = node.name ?? node.title ?? String(node);
      const path = prefix ? `${prefix} / ${name}` : name;
      out.push({ id, name, path });
      if (node.children && Array.isArray(node.children) && node.children.length) {
        dfs(node.children, path);
      }
    }
  };

  dfs(folders, "");
  return out;
}


// ── Pretty event URLs ─────────────────────────────────────────────────────────
// URLs look like /organizer/event/tech-summit-2025-{uuid}/speakers
// The slug is cosmetic; the UUID (always last 36 chars) drives all API calls.

/** Convert an event title + UUID into a single URL segment, e.g. "tech-summit-2025-{uuid}" */
export function toEventSlugId(title: string, id: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  return `${slug}-${id}`;
}

/** Extract the UUID from a slugId segment (handles both "slug-uuid" and bare "uuid") */
export function extractEventId(slugId: string): string {
  return slugId.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)?.[0] ?? slugId;
}

/** Build a full organizer event URL. Components without a title pass the UUID as slugId directly. */
export function eventPath(slugId: string, subpath = ''): string {
  return `/organizer/event/${slugId}${subpath}`;
}

// Generate a deterministic event id for uploads so backend can associate assets with the event
export const generateUuid = () => {
  try {
    // prefer crypto.randomUUID when available
    if (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function") {
      return (crypto as any).randomUUID();
    }
  } catch (err) {
    // fallthrough to fallback generator
  }

  // fallback RFC4122 v4-ish generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};