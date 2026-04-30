import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import html2canvas from 'html2canvas';

function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null;
  // filename*=utf-8''%E2%82%AC%20rates.png or filename="name.png"
  const filenameStarMatch = header.match(/filename\*=(?:UTF-8'')?([^;\n]+)/i);
  if (filenameStarMatch && filenameStarMatch[1]) {
    try {
      const raw = filenameStarMatch[1].trim();
      // decode percent-encoding
      return decodeURIComponent(raw.replace(/^"|"$/g, ''));
    } catch (e) {
      return filenameStarMatch[1].replace(/^"|"$/g, '');
    }
  }
  const filenameMatch = header.match(/filename=(?:"([^"]+)"|([^;\n]+))/i);
  if (filenameMatch) {
    return (filenameMatch[1] || filenameMatch[2] || '').trim().replace(/^"|"$/g, '');
  }
  return null;
}

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

// Download a resource URL and trigger a browser download via blob.
// Falls back to opening the URL in a new tab if fetch is blocked (CORS) or fails.
export async function downloadResource(url?: string | null, fallbackName?: string) {
  if (!url) return;

  // Pull the real filename from the URL path — CDN content-type headers are often wrong
  let urlFilename = '';
  try {
    const p = new URL(String(url)).pathname;
    urlFilename = p.split('/').filter(Boolean).pop() || '';
  } catch { /* ignore */ }

  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const contentType = res.headers.get('content-type') || '';
    // HTML response means we got an error/redirect page, not the actual file
    if (contentType.includes('text/html')) throw new Error('html-response');

    const disposition = res.headers.get('content-disposition');
    const headerName = parseContentDispositionFilename(disposition);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    // Filename priority: Content-Disposition > fallbackName > URL path filename
    let name = headerName || fallbackName || urlFilename || 'download';

    // If name has no extension, try URL path extension first, then content-type
    if (!/\.[a-zA-Z0-9]{1,6}$/.test(name)) {
      const urlExt = urlFilename.match(/\.([a-zA-Z0-9]{1,6})$/)?.[0] || '';
      if (urlExt) {
        name = `${name}${urlExt}`;
      } else {
        const extMap: Record<string, string> = {
          'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif',
          'image/webp': '.webp', 'image/avif': '.avif', 'image/svg+xml': '.svg',
          'application/pdf': '.pdf', 'application/zip': '.zip',
          'video/mp4': '.mp4', 'video/quicktime': '.mov',
          'application/vnd.ms-powerpoint': '.ppt',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
          'application/msword': '.doc',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        };
        const match = Object.keys(extMap).find(k => contentType.includes(k));
        if (match) name = `${name}${extMap[match]}`;
      }
    }

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  } catch {
    // CORS blocked or error — open in new tab as best fallback
    try { window.open(String(url), "_blank"); } catch { /* swallow */ }
  }
}