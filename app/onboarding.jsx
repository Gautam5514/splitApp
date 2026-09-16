import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { useState } from "react";
import {
  Image,
  ImageBackground,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OnboardingScreen() {
  const { height } = useWindowDimensions();
  const [leaving, setLeaving] = useState(false);
  const compact = height < 720;

  const openAuth = (path) => {
    if (leaving) return;
    setLeaving(true);
    router.replace(path);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ImageBackground
        source={require("../assets/images/onboarding-earth.webp")}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
        imageStyle={styles.heroImage}
      />
      <LinearGradient
        colors={["rgba(3,7,20,0.18)", "rgba(3,7,20,0)", "#050812", "#050812"]}
        locations={[0, 0.35, 0.68, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topRow}>
          <View style={styles.brand}>
            <Image source={require("../assets/images/favicon.png")} style={styles.brandIcon} />
            <Text style={styles.brandName}>SplitEase</Text>
          </View>
          <View style={styles.pageBadge}>
            <Text style={styles.pageBadgeText}>WELCOME</Text>
          </View>
        </View>

        <View style={[styles.bottomContent, compact && styles.bottomContentCompact]}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowLine} />
            <Text style={styles.eyebrow}>BETTER TOGETHER</Text>
          </View>

          <Text style={[styles.title, compact && styles.titleCompact]}>
            Share moments.{"\n"}
            <Text style={styles.titleAccent}>Split the rest.</Text>
          </Text>
          <Text style={styles.description}>
            Keep every trip, dinner, and shared bill simple with the people who matter.
          </Text>

          <View style={styles.socialRow}>
            <View style={styles.avatarStack}>
              <View style={[styles.avatar, styles.avatarOne]}><Text style={styles.avatarText}>A</Text></View>
              <View style={[styles.avatar, styles.avatarTwo]}><Text style={styles.avatarText}>M</Text></View>
              <View style={[styles.avatar, styles.avatarThree]}><Text style={styles.avatarText}>K</Text></View>
            </View>
            <Text style={styles.socialText}>Made for your circle</Text>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Get started and register"
            style={styles.primaryButton}
            onPress={() => openAuth("/auth/register")}
            disabled={leaving}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Get started</Text>
            <View style={styles.arrowCircle}>
              <ArrowRight size={22} color="#061225" strokeWidth={2.5} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Log in to your account"
            style={styles.loginButton}
            onPress={() => openAuth("/auth/login")}
            disabled={leaving}
            activeOpacity={0.75}
          >
            <Text style={styles.loginPrompt}>Already have an account? </Text>
            <Text style={styles.loginText}>Log in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#050812" },
  heroImage: { width: "100%", height: "100%" },
  safeArea: { flex: 1, paddingHorizontal: 26 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12 },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandIcon: { width: 32, height: 32, borderRadius: 9 },
  brandName: { color: "#FFFFFF", fontSize: 23, fontWeight: "700", letterSpacing: -0.8 },
  pageBadge: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: "rgba(8,17,39,0.48)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
  },
  pageBadgeText: { color: "rgba(255,255,255,0.82)", fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
  bottomContent: { marginTop: "auto", paddingBottom: 15 },
  bottomContentCompact: { paddingBottom: 6 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  eyebrowLine: { width: 23, height: 2, borderRadius: 2, backgroundColor: "#65DDF5" },
  eyebrow: { color: "#A7CAE2", fontSize: 11, fontWeight: "800", letterSpacing: 2.2 },
  title: { color: "#FFFFFF", fontSize: 40, lineHeight: 45, fontWeight: "800", letterSpacing: -1.9 },
  titleCompact: { fontSize: 34, lineHeight: 39 },
  titleAccent: { color: "#70DAF3" },
  description: { color: "#B1BDD1", fontSize: 14, lineHeight: 21, marginTop: 13, maxWidth: 330 },
  socialRow: { flexDirection: "row", alignItems: "center", gap: 13, marginTop: 20, marginBottom: 22 },
  avatarStack: { flexDirection: "row", paddingLeft: 1 },
  avatar: {
    width: 33, height: 33, borderRadius: 17, borderWidth: 2, borderColor: "#050812",
    alignItems: "center", justifyContent: "center", marginLeft: -3,
  },
  avatarOne: { backgroundColor: "#F2A976" },
  avatarTwo: { backgroundColor: "#9776DD" },
  avatarThree: { backgroundColor: "#58B8B8" },
  avatarText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  socialText: { color: "#B9C9D9", fontSize: 12, fontWeight: "600" },
  primaryButton: {
    height: 62, borderRadius: 31, paddingLeft: 24, paddingRight: 6,
    backgroundColor: "#F7FAFF", flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  primaryButtonText: { color: "#081329", fontSize: 16, fontWeight: "800" },
  arrowCircle: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: "#76DDF4",
    alignItems: "center", justifyContent: "center",
  },
  loginButton: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 16 },
  loginPrompt: { color: "#9EAEC5", fontSize: 13 },
  loginText: { color: "#80E2F7", fontSize: 13, fontWeight: "800" },
});
