import { syncPushTokenWithBackend } from "@/lib/pushNotifications";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";

// Both useLastNotificationResponse and the response listener can fire for the
// same tap (cold start vs. background resume) — track handled taps so each
// notification routes exactly once.
const handledResponses = new Set();

const routeFromNotification = (response) => {
  const id = response?.notification?.request?.identifier;
  if (!id || handledResponses.has(id)) return;
  handledResponses.add(id);

  const data = response?.notification?.request?.content?.data || {};

  // Chat pushes carry ids instead of app paths (the same payload also serves
  // web FCM, whose chat routes are query-param list pages).
  if (data.type === "chat" && data.senderId) {
    router.push({
      pathname: "/chat/[id]",
      params: {
        id: String(data.senderId),
        name: String(data.senderName || ""),
        email: String(data.senderEmail || ""),
      },
    });
    return;
  }
  if (data.type === "group-chat" && data.groupId) {
    router.push({
      pathname: "/group-chat/[id]",
      params: { id: String(data.groupId), name: String(data.groupName || "") },
    });
    return;
  }

  const link = data.link;
  if (typeof link !== "string" || !link.startsWith("/")) return;

  // Map web-only paths to their app equivalents; /groups/<id> matches both.
  if (link === "/dashboard" || link === "/") {
    router.push("/(tabs)/home");
    return;
  }
  router.push(link);
};

export function usePushNotifications(authToken) {
  const registeredRef = useRef(false); // prevent duplicate registration in same session

  // Handle notification that opened the app from killed/background state
  const lastResponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (lastResponse) routeFromNotification(lastResponse);
  }, [lastResponse]);

  // Clear the app-icon badge whenever the app comes to the foreground.
  useEffect(() => {
    if (Platform.OS === "web") return;
    Notifications.setBadgeCountAsync(0).catch(() => {});
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") Notifications.setBadgeCountAsync(0).catch(() => {});
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!authToken || Platform.OS === "web") return;
    if (registeredRef.current) return; // already attempted this session

    registeredRef.current = true;

    syncPushTokenWithBackend().catch(() => {
      // Allow retry on next app launch if this session fails
      registeredRef.current = false;
    });

    const receivedSub = Notifications.addNotificationReceivedListener(() => {});
    const responseSub = Notifications.addNotificationResponseReceivedListener(
      routeFromNotification
    );

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [authToken]);
}
