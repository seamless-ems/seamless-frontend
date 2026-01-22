const TOKEN_KEY = "accessToken";

export function setToken(accessToken: string) {
  try {
    localStorage.setItem(TOKEN_KEY, accessToken);
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
  } catch (e) {
    // ignore
  }
}

export default {
  setToken,
  getToken,
  clearToken,
};
