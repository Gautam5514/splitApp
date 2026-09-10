import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { PlayInstallReferrer } from "react-native-play-install-referrer";

const CHECKED_KEY = "installReferrerChecked";
const TIMEOUT_MS = 3000;

// Android-only, and only meaningful on the very first app launch after
// install: reads the Play Store install referrer (see the &referrer= param
// the web /join/[inviteCode] page appends to the Play Store fallback URL)
// and pulls out the invite code it was installed for, if any. Google's own
// guidance is to query this once per install and cache the result, so a
// flag is set before the native call even resolves.
export const getPendingJoinCodeFromInstallReferrer = async () => {
    if (Platform.OS !== "android") return null;

    try {
        const alreadyChecked = await AsyncStorage.getItem(CHECKED_KEY);
        if (alreadyChecked) return null;
        await AsyncStorage.setItem(CHECKED_KEY, "true");
    } catch {
        return null;
    }

    const referrerPromise = new Promise((resolve) => {
        try {
            PlayInstallReferrer.getInstallReferrerInfo((info, error) => {
                resolve(error ? null : info?.installReferrer || null);
            });
        } catch {
            resolve(null);
        }
    });
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS));

    const referrer = await Promise.race([referrerPromise, timeoutPromise]);
    if (!referrer) return null;

    const match = /(?:^|&)join_code=([^&]+)/.exec(referrer);
    return match ? decodeURIComponent(match[1]) : null;
};
