// Public web origin — used to build shareable links (referral invites, etc.)
// that open the SplitEase web app. Override via EXPO_PUBLIC_WEB_URL.
export const WEB_URL =
  process.env.EXPO_PUBLIC_WEB_URL || "https://split.elitecrew.online";

// Base API origin (without the trailing /api).
// Production builds must never silently resolve requests against the phone's
// own localhost when an EAS environment variable is missing.
const DEFAULT_API_URL = "https://split.facedeliver.shop";
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL
).replace(/\/+$/, "");
