let currentToken: string | null = null;

export function setCurrentToken(t: string | null) {
  currentToken = t;
}

export function getCurrentToken() {
  return currentToken;
}

export function setTokenAndNotify(token: string) {
  try {
    localStorage.setItem('auth_token', token);
    setCurrentToken(token);
    window.dispatchEvent(new CustomEvent('auth-token-changed', { detail: { token } }));
  } catch (e) {
    // noop
    // eslint-disable-next-line no-console
    console.warn('setTokenAndNotify failed:', e);
  }
}

export function clearTokenAndNotify() {
  try {
    localStorage.removeItem('auth_token');
    setCurrentToken(null);
    window.dispatchEvent(new CustomEvent('auth-token-changed', { detail: { token: null } }));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('clearTokenAndNotify failed:', e);
  }
}

export function setUserAndNotify(user: Record<string, any>) {
  try {
    localStorage.setItem('auth_user', JSON.stringify(user));
    window.dispatchEvent(new CustomEvent('auth-user-changed', { detail: { user } }));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('setUserAndNotify failed:', e);
  }
}

export function clearUserAndNotify() {
  try {
    localStorage.removeItem('auth_user');
    window.dispatchEvent(new CustomEvent('auth-user-changed', { detail: { user: null } }));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('clearUserAndNotify failed:', e);
  }
}

export default { getCurrentToken, setCurrentToken, setTokenAndNotify, clearTokenAndNotify, setUserAndNotify, clearUserAndNotify };