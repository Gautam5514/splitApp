import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { api } from "@/lib/api";

const PUSH_TOKEN_KEY = "expo_push_token";
const PUSH_TOKEN_SYNCED_KEY = "expo_push_token_synced"; // tracks last-synced token

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const getStoredPushToken = async () => {
  if (Platform.OS === "web") return null;
  return SecureStore.getItemAsync(PUSH_TOKEN_KEY);
};

export const registerForPushNotificationsAsync = async () => {
  if (Platform.OS === "web") return null;

  if (Platform.OS === "android") {
    // A channel's sound is locked in the moment it's created - "default" was
    // already created (with no custom sound) on devices from earlier app
    // versions, and Android won't let us change it in place. "alerts" is a
    // fresh channel so the custom tune actually takes effect.
    await Notifications.setNotificationChannelAsync("alerts", {
      name: "SplitEase Alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#4f46e5",
      sound: "notification.wav",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission not granted");
    return null;
  }

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ||
    Constants?.easConfig?.projectId;

  if (!projectId) {
    console.warn("Push notifications: EAS projectId missing in app.json extra.eas.projectId");
    return null;
  }

  const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, expoPushToken);
  return expoPushToken;
};

export const syncPushTokenWithBackend = async () => {
  if (Platform.OS === "web") return null;

  const expoPushToken = await registerForPushNotificationsAsync();
  if (!expoPushToken) return null;

  // Skip if we already synced this exact token — avoids repeated 404s
  const lastSynced = await SecureStore.getItemAsync(PUSH_TOKEN_SYNCED_KEY);
  if (lastSynced === expoPushToken) return expoPushToken;

  try {
    await api.post("/notifications/push-token", {
      expoPushToken,
      platform: Platform.OS,
    });
    // Mark this token as successfully synced
    await SecureStore.setItemAsync(PUSH_TOKEN_SYNCED_KEY, expoPushToken);
  } catch (error) {
    const status = error?.response?.status;
    if (status === 404) {
      // Backend endpoint not yet deployed — silent, not a crash
      console.warn(
        "Push token endpoint not found (404). Deploy /notifications/push-token on your backend."
      );
    } else if (status === 401) {
      // Auth issue — will be retried after token refresh by api interceptor
      console.warn("Push token sync: auth error, will retry on next login.");
    } else {
      console.warn("Push token sync failed:", error?.message);
    }
  }

  return expoPushToken;
};

export const unregisterStoredPushToken = async () => {
  if (Platform.OS === "web") return;

  const expoPushToken = await getStoredPushToken();
  if (!expoPushToken) return;

  try {
    await api.delete("/notifications/push-token", {
      data: { expoPushToken },
    });
  } catch (error) {
    // Best-effort — don't block logout if this fails
    console.warn("Push token unregister failed:", error?.message);
  } finally {
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(PUSH_TOKEN_SYNCED_KEY);
  }
};
