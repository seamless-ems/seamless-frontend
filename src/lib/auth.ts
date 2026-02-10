const TOKEN_KEY = "accessToken";

export function setToken(accessToken: string) {
  try {
    localStorage.setItem(TOKEN_KEY, accessToken);
    try {
      // Notify app immediately in same window that token changed
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("seamless:token-changed"));
      }
    } catch (e) {
      // ignore
    }
  } catch (e) {
    // ignore
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    try {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("seamless:token-changed"));
      }
    } catch (e) {
      // ignore
    }
  } catch (e) {
    // ignore
  }
}

export default {
  setToken,
  getToken,
  clearToken,
};
