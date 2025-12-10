export type ApiFetchOptions = RequestInit & {
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT = 10_000;

function getBaseUrl() {
  return (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, '') || '';
}

// In-flight request dedupe map: key -> promise
const inflight = new Map<string, Promise<any>>();

export async function apiFetch<T = any>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const base = getBaseUrl();
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;

  const { timeoutMs = DEFAULT_TIMEOUT, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    'Accept': 'application/json',
    ...(headers as Record<string, string> | undefined || {}),
  };

  // If there's an access token in localStorage, add Authorization header
  let token: string | null = null;
  try {
    token = localStorage.getItem('access_token');
    if (token) {
      finalHeaders['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore localStorage errors
  }

  // If there's a body and it's a plain object, serialize to JSON
  let body = rest.body as any;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    body = JSON.stringify(body);
    finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json';
  }

  const method = (options.method || 'GET').toString().toUpperCase();

  // Only dedupe safe GET requests to avoid side-effects for POST/PUT/DELETE
  const shouldDedupe = method === 'GET';
  const key = shouldDedupe ? `${method}:${url}:${token ?? ''}` : '';

  if (shouldDedupe && inflight.has(key)) {
    return inflight.get(key) as Promise<T>;
  }

  const promise = (async () => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...rest, method, headers: finalHeaders, body, signal: controller.signal, credentials: 'include' });
      clearTimeout(id);

      const contentType = res.headers.get('content-type') || '';
      if (!res.ok) {
        // Attempt to parse error body
        let errBody: any = null;
        try {
          if (contentType.includes('application/json')) errBody = await res.json();
          else errBody = await res.text();
        } catch (e) {
          // ignore
        }
        const err: any = new Error(`API request failed with status ${res.status}`);
        err.status = res.status;
        err.body = errBody;
        throw err;
      }

      if (contentType.includes('application/json')) {
        return await res.json();
      }
      // For non-json responses return text
      return (await res.text()) as any;
    } finally {
      clearTimeout(id);
      // remove from inflight map so future requests can run
      if (shouldDedupe) inflight.delete(key);
    }
  })();

  if (shouldDedupe) inflight.set(key, promise);

  return promise as Promise<T>;
}

export default apiFetch;
