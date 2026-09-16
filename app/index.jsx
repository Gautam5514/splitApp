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

  return <OnboardingScreen />;
}
