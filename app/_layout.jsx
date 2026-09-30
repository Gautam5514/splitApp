import { AuthProvider, useAuth } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { PremiumAlertProvider } from "@/components/ui/PremiumAlert";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setAppFontsReady } from "@/components/ui/Typography";
import { FONT_ASSETS } from "@/constants/typography";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

// Keep the splash up until the app font is ready, so no screen ever flashes
// in the system font first.
SplashScreen.preventAutoHideAsync().catch(() => {});

function PushNotificationBootstrap() {
  const { token } = useAuth();
  usePushNotifications(token);
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const ready = fontsLoaded || !!fontError;

  // Set synchronously (before children render) so the very first frame of
  // every screen already uses the app font.
  setAppFontsReady(fontsLoaded && !fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        {Platform.OS !== "web" && <PushNotificationBootstrap />}
        <NotificationProvider>
          <ThemeProvider>
          <PremiumAlertProvider>
          <StatusBar style="auto" translucent />
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
          <Stack.Screen name="rewards" />
          <Stack.Screen name="create-group" />
          <Stack.Screen name="quick-split" />
          <Stack.Screen name="invites" />
          <Stack.Screen name="privacy" />
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
          </PremiumAlertProvider>
          </ThemeProvider>
        </NotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
