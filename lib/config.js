import Constants from "expo-constants";

// Public web origin — used to build shareable links (referral invites, etc.)
// that open the SplitEase web app. Override via EXPO_PUBLIC_WEB_URL.
export const WEB_URL =
  process.env.EXPO_PUBLIC_WEB_URL || "https://split.elitecrew.online";

// Base API origin (without the trailing /api).
// Production builds must never silently resolve requests against the phone's
// own localhost when an EAS environment variable is missing.
const DEFAULT_API_URL = "https://api.split.elitecrew.online";

const PRIVATE_HOST = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

// Dev only: a LAN API URL in .env goes stale whenever the Mac's Wi-Fi IP
// changes ("Network Error" on every request). The phone is already talking to
// Metro on the Mac, so reuse that host and keep the API port from .env.
// Production (non-__DEV__) and tunnel/public hosts are left untouched.
const resolveDevUrl = (url) => {
  if (typeof __DEV__ === "undefined" || !__DEV__) return url;
  try {
    const metroHost = String(Constants.expoConfig?.hostUri || "").split(":")[0];
    const match = url.match(/^(https?:\/\/)([^/:]+)(:\d+)?(.*)$/);
    if (!match || !PRIVATE_HOST.test(match[2]) || !PRIVATE_HOST.test(metroHost)) return url;
    return `${match[1]}${metroHost}${match[3] || ""}${match[4]}`;
  } catch {
    return url;
  }
};

export const API_URL = resolveDevUrl(
  (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/+$/, "")
);

console.log(
  `[config] API_URL = ${API_URL} (${
    API_URL.includes("localhost") || API_URL.includes("10.") || API_URL.includes("192.168")
      ? "LOCAL"
      : "LIVE"
  })`
);
