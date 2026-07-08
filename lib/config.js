// Public web origin — used to build shareable links (referral invites, etc.)
// that open the SplitEase web app. Override via EXPO_PUBLIC_WEB_URL.
export const WEB_URL =
  process.env.EXPO_PUBLIC_WEB_URL || "https://split.elitecrew.online";

// Base API origin (without the trailing /api).
export const API_URL = process.env.EXPO_PUBLIC_API_URL || "";
