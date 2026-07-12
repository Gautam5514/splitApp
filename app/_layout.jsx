import { AuthProvider, useAuth } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Stack } from "expo-router";

function PushNotificationBootstrap() {
  const { token } = useAuth();
  usePushNotifications(token);
  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <PushNotificationBootstrap />
      <NotificationProvider>
        <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="expense-breakdown" />
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/register" />
          <Stack.Screen name="join/[inviteCode]" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="profile-edit" />
          <Stack.Screen name="appearance" />
          <Stack.Screen name="theme-store" />
          <Stack.Screen name="rewards" />
          <Stack.Screen name="create-group" />
          <Stack.Screen name="info/terms" />
          <Stack.Screen name="info/privacy" />
          <Stack.Screen name="info/help-center" />
          <Stack.Screen name="info/contact" />
          <Stack.Screen name="info/pricing" />
          <Stack.Screen name="info/how-it-works" />
          <Stack.Screen name="info/what-we-offer" />
          <Stack.Screen
            name="modal"
            options={{
              presentation: "modal",
              title: "Modal",
              headerShown: true,
            }}
          />
        </Stack>
        </ThemeProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
