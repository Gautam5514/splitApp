// Public web origin — used to build shareable links (referral invites, etc.)
// that open the SplitEase web app. Override via EXPO_PUBLIC_WEB_URL.
export const WEB_URL =
  process.env.EXPO_PUBLIC_WEB_URL || "https://split.elitecrew.online";

// Base API origin (without the trailing /api).
// Production builds must never silently resolve requests against the phone's
// own localhost when an EAS environment variable is missing.
const DEFAULT_API_URL = "https://api.split.elitecrew.online";
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL
).replace(/\/+$/, "");

console.log(
  `[config] API_URL = ${API_URL} (${
    API_URL.includes("localhost") || API_URL.includes("10.") || API_URL.includes("192.168")
      ? "LOCAL"
      : "LIVE"
  })`
);
