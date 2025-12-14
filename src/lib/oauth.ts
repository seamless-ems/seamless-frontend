export type PopTokenResult = {
  token: string | null;
  cleanedUrl: string;
};

// Extract access_token/accessToken from a URL (search or hash) and return the token and
// a cleaned url with those keys removed from both the search and the hash.
export function popTokenFromLocation(href?: string): PopTokenResult {
  const url = href ?? window.location.href;

  try {
    const u = new URL(url, window.location.origin);

    const searchParams = new URLSearchParams(u.search);

    let rawHash = u.hash || "";
    if (rawHash.startsWith("#")) rawHash = rawHash.slice(1);
    if (rawHash.startsWith("/")) rawHash = rawHash.slice(1);
    if (rawHash.startsWith("?")) rawHash = rawHash.slice(1);
    const hashParams = new URLSearchParams(rawHash);

    const getTokenFrom = (p: URLSearchParams) => p.get("access_token") ?? p.get("accessToken");

    let token = getTokenFrom(searchParams) ?? getTokenFrom(hashParams);

    if (!token) {
      const broadMatch = url.match(/(?:access_token|accessToken)=([^&#]+)/i);
      if (broadMatch && broadMatch[1]) {
        token = decodeURIComponent(broadMatch[1]);
      }
    }

    // Remove token keys from both places for a cleaned URL
    ["access_token", "accessToken"].forEach((k) => {
      searchParams.delete(k);
      hashParams.delete(k);
    });

    const newSearch = searchParams.toString();
    const newHash = hashParams.toString();

    const cleanedUrl = u.pathname + (newSearch ? `?${newSearch}` : "") + (newHash ? `#${newHash}` : "");

    return { token, cleanedUrl };
  } catch (e) {
    return { token: null, cleanedUrl: url };
  }
}
