import { syncPushTokenWithBackend } from "@/lib/pushNotifications";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

const routeFromNotification = (response) => {
  const link = response?.notification?.request?.content?.data?.link;
  if (typeof link === "string" && link.startsWith("/")) {
    router.push(link);
  }
};

export function usePushNotifications(authToken) {
  const registeredRef = useRef(false); // prevent duplicate registration in same session

  // Handle notification that opened the app from killed/background state
  const lastResponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (lastResponse) routeFromNotification(lastResponse);
  }, [lastResponse]);

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
