import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const PENDING_INVITE_KEY = "pendingInvite";

// Sends the user into the group they were invited to instead of the home
// screen, when they had to sign in/register first to accept the invite
// (set by app/join/[inviteCode].jsx when it hits an unauthenticated user).
export const redirectAfterAuth = async () => {
    let code = null;
    try {
        code = await AsyncStorage.getItem(PENDING_INVITE_KEY);
        if (code) await AsyncStorage.removeItem(PENDING_INVITE_KEY);
    } catch {
        code = null;
    }

    if (code) router.replace(`/join/${code}`);
    else router.replace("/(tabs)/home");
};
