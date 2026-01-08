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
