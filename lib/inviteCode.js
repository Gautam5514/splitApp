// Group invite codes: 6 characters from an alphabet without look-alikes
// (no 0/O, 1/I/L). Mirrors backend/utils/inviteCode.js.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const SHORT_RE = new RegExp(`^[${ALPHABET}]{6}$`);

// People paste the code, the code with spaces, the invite link or the whole
// shared message. Pull the code out of any of those; old long codes pass
// through unchanged. Returns "" when nothing usable was given.
export function normalizeInviteCode(input) {
  const raw = String(input || "").trim();
  const fromLink = /\/join\/([A-Za-z0-9_-]{4,64})/.exec(raw) || /[?&](?:code|invite|join_code)=([A-Za-z0-9_-]{4,64})/.exec(raw);
  const candidate = fromLink ? fromLink[1] : raw;
  const compact = candidate.replace(/[\s-]/g, "").toUpperCase();
  if (SHORT_RE.test(compact)) return compact;
  return /^[A-Za-z0-9_-]{8,64}$/.test(candidate) ? candidate : "";
}

export const isShortInviteCode = (code) => SHORT_RE.test(String(code || ""));

// Hosts whose /join/... links are SplitEase invites (plus the app's own scheme).
const INVITE_HOSTS = ["split.elitecrew.online", "www.split.elitecrew.online", "split-expense-vert.vercel.app"];

const withVia = (url, via) => {
    if (!url) return "";
    return url.includes("?") ? `${url}&via=${via}` : `${url}?via=${via}`;
};

// The link to share from the app (opens the app on the recipient's phone when
// it's installed, the website otherwise) and the one to put in a QR code.
// Newer API responses carry ready-made `links`; older ones only `joinLink`.
export const appShareLink = (invite, webUrl) =>
    invite?.links?.app || withVia(invite?.joinLink || (invite?.inviteCode && webUrl ? `${webUrl}/join/${invite.inviteCode}` : ""), "app");
export const qrLink = (invite, webUrl) =>
    invite?.links?.qr || withVia(invite?.joinLink || (invite?.inviteCode && webUrl ? `${webUrl}/join/${invite.inviteCode}` : ""), "qr");

/**
 * What a scanned QR code means. Accepts a SplitEase invite link, the app's
 * splitapp://join/... link, or a bare code. Returns { code } or { error }.
 * Links to other websites are refused rather than guessed at.
 */
export function parseScannedInvite(data, extraHosts = []) {
    const text = String(data || "").trim();
    if (!text) return { error: "That QR code is empty." };
    if (/^splitapp:\/\//i.test(text)) {
        const code = normalizeInviteCode(text);
        return code ? { code } : { error: "This SplitEase link doesn't contain an invite." };
    }
    if (/^https?:\/\//i.test(text)) {
        const host = (/^https?:\/\/([^/?#:]+)/i.exec(text)?.[1] || "").toLowerCase();
        const allowed = [...INVITE_HOSTS, ...extraHosts.map((h) => String(h).toLowerCase())];
        if (!allowed.includes(host)) return { error: "This QR code isn't a SplitEase invite." };
        const code = normalizeInviteCode(text);
        return code ? { code } : { error: "This SplitEase link isn't an invite." };
    }
    const code = normalizeInviteCode(text);
    return code ? { code } : { error: "This QR code isn't a SplitEase invite." };
}
