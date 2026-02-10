import { exchangeFirebaseToken } from "./api";

export async function tryExchangeWithRetry(idToken: string, name?: string, timeout = 2000): Promise<import("./api").TokenSchema | null> {
  const start = Date.now();
  let attempt = 0;
  // Increase base delay between retries to give backend more time to become ready
  const baseDelay = 500;

  while (Date.now() - start < timeout) {
    attempt += 1;
    try {
      const backendToken = await exchangeFirebaseToken(idToken, name);
      if (backendToken && backendToken.accessToken) return backendToken as any;
    } catch (e) {
      // swallow and retry until timeout
    }

    // backoff
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, baseDelay * attempt));
  }

  return null;
}

export default tryExchangeWithRetry;
