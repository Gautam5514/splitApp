import { FullScreenLoader } from "@/components/Loader";
import { useAuth } from "@/context/AuthContext";
import { getPendingJoinCodeFromInstallReferrer } from "@/lib/installReferrer";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import OnboardingScreen from "./onboarding";

export default function IndexScreen() {
  const { token, loading } = useAuth();
  const inviteFound = useRef(false);

  useEffect(() => {
    getPendingJoinCodeFromInstallReferrer()
      .then((code) => {
        if (code) {
          inviteFound.current = true;
          router.replace(`/join/${code}`);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading && token && !inviteFound.current) {
      router.replace("/(tabs)/home");
    }
  }, [loading, token]);

  // Signed-in users are about to be redirected home - show a loader instead of
  // flashing the onboarding slides while auth restores or the redirect runs.
  if (loading || token) return <FullScreenLoader />;

  return <OnboardingScreen />;
}
