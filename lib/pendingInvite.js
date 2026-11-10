import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { normalizeInviteCode } from "./inviteCode";

// An invite the user opened before signing in (set by app/join/[inviteCode].jsx),
// so login/register can bring them straight back to it. Kept for a day only:
// an old invite must never silently pull someone into a group weeks later.
const PENDING_INVITE_KEY = "pendingInvite";
const TTL_MS = 24 * 60 * 60 * 1000;

export const savePendingInvite = async (code) => {
    const c = normalizeInviteCode(code);
    if (!c) return;
    try { await AsyncStorage.setItem(PENDING_INVITE_KEY, JSON.stringify({ code: c, at: Date.now() })); } catch { /* ignore */ }
};

export const clearPendingInvite = async () => {
    try { await AsyncStorage.removeItem(PENDING_INVITE_KEY); } catch { /* ignore */ }
};

/** The remembered invite code (forgotten once read), or null if none / too old. */
export const takePendingInvite = async () => {
    let raw = null;
    try { raw = await AsyncStorage.getItem(PENDING_INVITE_KEY); } catch { return null; }
    await clearPendingInvite();
    if (!raw) return null;
    try {
        const { code, at } = JSON.parse(raw);
        if (!code || !at || Date.now() - at > TTL_MS) return null;
        return normalizeInviteCode(code) || null;
    } catch {
        return normalizeInviteCode(raw) || null; // older plain-string format
    }
};

// Sends the user into the group they were invited to instead of the home
// screen, when they had to sign in/register first to accept the invite.
export const redirectAfterAuth = async () => {
    const code = await takePendingInvite();
    if (code) router.replace(`/join/${encodeURIComponent(code)}`);
    else router.replace("/(tabs)/home");
};
