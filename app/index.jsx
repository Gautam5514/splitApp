import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ArrowRight, ShieldCheck } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const AURORA_DARK = ["#0A0613", "#150C2E", "#0A0714"];
const AURORA_LIGHT = ["#EEF2FF", "#F3F0FF", "#FFFFFF"];
const BTN_GRADIENT = ["#6366F1", "#8B5CF6"];

export default function HomeScreen() {
  const [isSplashVisible, setSplashVisible] = useState(true);
  const [isMinTimeElapsed, setMinTimeElapsed] = useState(false);
  const { token, loading } = useAuth();
  const { theme } = useTheme();

  const isDark = theme === "dark";
  const aurora = isDark ? AURORA_DARK : AURORA_LIGHT;
  const glassTint = isDark ? "dark" : "light";
  const glassBorder = isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.75)";
  const glassFill = isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.45)";
  const textMain = isDark ? "#FFFFFF" : "#15102B";
  const textDim = isDark ? "rgba(255,255,255,0.55)" : "rgba(30,20,60,0.55)";
  const accent = isDark ? "#A78BFA" : "#6366F1";

  const ring = useSharedValue(1);
  const ring2 = useSharedValue(1);

  useEffect(() => {
    ring.value = withRepeat(withTiming(1.22, { duration: 2200 }), -1, true);
    ring2.value = withRepeat(withTiming(1.45, { duration: 2200 }), -1, true);
    const timer = setTimeout(() => setMinTimeElapsed(true), 2200);
    return () => clearTimeout(timer);
  }, [ring, ring2]);

  useEffect(() => {
    if (!loading && isMinTimeElapsed) {
      if (token) router.replace("/(tabs)/home");
      else setSplashVisible(false);
    }
  }, [loading, isMinTimeElapsed, token]);

  // Shared aurora background + floating color orbs.
  const Background = () => (
    <>
      <LinearGradient colors={aurora} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[styles.orb, styles.orbA]} />
      <View pointerEvents="none" style={[styles.orb, styles.orbB]} />
      <View pointerEvents="none" style={[styles.orb, styles.orbC, { opacity: isDark ? 0.5 : 0.35 }]} />
    </>
  );

  // ─── Splash ───────────────────────────────────────────────────────────────
  if (isSplashVisible) {
    return (
      <View style={styles.fill}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
        <Background />

        <Animated.View style={[styles.ringOuter, { borderColor: glassBorder, transform: [{ scale: ring }] }]} />
        <Animated.View style={[styles.ringInner, { borderColor: glassBorder, transform: [{ scale: ring2 }] }]} />

        <Animated.View entering={ZoomIn.duration(700).springify()} style={styles.splashCenter}>
          <BlurView intensity={isDark ? 40 : 60} tint={glassTint} experimentalBlurMethod="dimezisBlurView" style={[styles.splashIcon, { borderColor: glassBorder }]}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: glassFill }]} />
            <Image source={require("../assets/images/icon.png")} style={{ width: 74, height: 74, borderRadius: 18 }} resizeMode="contain" />
          </BlurView>

          <Animated.Text entering={FadeInDown.delay(280).duration(700)} style={[styles.splashName, { color: textMain }]}>
            SplitEase
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(450).duration(700)} style={[styles.splashTagline, { color: textDim }]}>
            Split expenses effortlessly
          </Animated.Text>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(900)} style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, i === 1 ? { backgroundColor: accent, transform: [{ scale: 1.35 }] } : { backgroundColor: isDark ? "rgba(255,255,255,0.25)" : "rgba(99,102,241,0.25)" }]} />
          ))}
        </Animated.View>
      </View>
    );
  }

  // ─── Landing ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.fill}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
      <Background />

      <SafeAreaView style={styles.fill}>
        {/* Wordmark */}
        <Animated.View entering={FadeIn.duration(500)} style={styles.topBar}>
          <Image source={require("../assets/images/icon.png")} style={{ width: 24, height: 24, borderRadius: 6, marginRight: 8 }} resizeMode="contain" />
          <Text style={[styles.wordmark, { color: textMain }]}>SplitEase</Text>
        </Animated.View>

        {/* Hero glass card */}
        <View style={styles.heroWrap}>
          <Animated.View entering={FadeInDown.delay(120).duration(700)} style={styles.glassShadow}>
            <BlurView intensity={isDark ? 45 : 70} tint={glassTint} experimentalBlurMethod="dimezisBlurView" style={[styles.glassCard, { borderColor: glassBorder }]}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: glassFill }]} />
              {/* top sheen */}
              <LinearGradient
                colors={isDark ? ["rgba(255,255,255,0.10)", "transparent"] : ["rgba(255,255,255,0.6)", "transparent"]}
                style={styles.sheen}
                pointerEvents="none"
              />

              <Animated.View entering={ZoomIn.delay(180).duration(600).springify()}>
                <LinearGradient colors={BTN_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroIcon}>
                  <Image source={require("../assets/images/icon.png")} style={{ width: 46, height: 46, borderRadius: 12 }} resizeMode="contain" />
                </LinearGradient>
              </Animated.View>

              <Animated.Text entering={FadeInDown.delay(260).duration(650)} style={[styles.headline, { color: textMain }]}>
                Split bills,{"\n"}not friendships.
              </Animated.Text>
              <Animated.Text entering={FadeInDown.delay(360).duration(650)} style={[styles.subCopy, { color: textDim }]}>
                Track expenses, settle debts, and travel together — without the math.
              </Animated.Text>

              <Animated.View entering={FadeInUp.delay(440).duration(600)} style={styles.pills}>
                {["Groups", "Smart Split", "Instant Settle"].map((label) => (
                  <View key={label} style={[styles.pill, { borderColor: glassBorder, backgroundColor: isDark ? "rgba(167,139,250,0.14)" : "rgba(99,102,241,0.10)" }]}>
                    <Text style={[styles.pillText, { color: accent }]}>{label}</Text>
                  </View>
                ))}
              </Animated.View>
            </BlurView>
          </Animated.View>
        </View>

        {/* CTAs */}
        <Animated.View entering={FadeInUp.delay(520).duration(650)} style={styles.ctas}>
          <TouchableOpacity onPress={() => router.push("/auth/register")} activeOpacity={0.9} style={styles.primaryWrap}>
            <LinearGradient colors={BTN_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Get Started</Text>
              <ArrowRight size={18} color="#fff" strokeWidth={2.4} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/auth/login")} activeOpacity={0.8} style={styles.secondaryWrap}>
            <BlurView intensity={isDark ? 40 : 60} tint={glassTint} experimentalBlurMethod="dimezisBlurView" style={[styles.secondaryBtn, { borderColor: glassBorder }]}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: glassFill }]} />
              <Text style={[styles.secondaryBtnText, { color: textMain }]}>I already have an account</Text>
            </BlurView>
          </TouchableOpacity>

          <View style={styles.legalRow}>
            <ShieldCheck size={13} color={textDim} />
            <Text style={[styles.legal, { color: textDim }]}>Free to use · No card required</Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },

  // Background orbs
  orb: { position: "absolute", borderRadius: 9999 },
  orbA: { width: 360, height: 360, top: -120, left: -110, backgroundColor: "rgba(99,102,241,0.55)", opacity: 0.45 },
  orbB: { width: 380, height: 380, bottom: -120, right: -120, backgroundColor: "rgba(139,92,246,0.5)", opacity: 0.4 },
  orbC: { width: 300, height: 300, top: height * 0.38, right: -130, backgroundColor: "rgba(34,211,238,0.45)" },

  // Splash
  ringOuter: { position: "absolute", width: 250, height: 250, borderRadius: 125, borderWidth: 1, alignSelf: "center", top: height / 2 - 130 },
  ringInner: { position: "absolute", width: 320, height: 320, borderRadius: 160, borderWidth: 1, alignSelf: "center", top: height / 2 - 165 },
  splashCenter: { flex: 1, justifyContent: "center", alignItems: "center", gap: 14 },
  splashIcon: {
    width: 116, height: 116, borderRadius: 32, borderWidth: 1, overflow: "hidden",
    justifyContent: "center", alignItems: "center", marginBottom: 10,
  },
  splashName: { fontSize: 36, fontWeight: "800", letterSpacing: -1 },
  splashTagline: { fontSize: 14, fontWeight: "500", letterSpacing: 0.3 },
  dots: { flexDirection: "row", gap: 7, paddingBottom: 54, alignSelf: "center" },
  dot: { width: 7, height: 7, borderRadius: 4 },

  // Landing
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 28, paddingTop: 14, paddingBottom: 4 },
  wordmark: { fontSize: 17, fontWeight: "800", letterSpacing: -0.4 },

  heroWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 22 },
  glassShadow: {
    borderRadius: 30,
    shadowColor: "#4C1D95", shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.3, shadowRadius: 30, elevation: 12,
  },
  glassCard: {
    borderRadius: 30, borderWidth: 1, overflow: "hidden",
    paddingHorizontal: 26, paddingVertical: 34, alignItems: "center", gap: 16,
  },
  sheen: { position: "absolute", top: 0, left: 0, right: 0, height: 120 },
  heroIcon: {
    width: 78, height: 78, borderRadius: 22, justifyContent: "center", alignItems: "center", marginBottom: 4,
    shadowColor: "#6366F1", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 18, elevation: 10,
  },
  headline: { fontSize: 34, fontWeight: "800", textAlign: "center", letterSpacing: -1.2, lineHeight: 41 },
  subCopy: { fontSize: 15, textAlign: "center", lineHeight: 22, fontWeight: "400", maxWidth: width * 0.74 },
  pills: { flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap", justifyContent: "center" },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, borderWidth: 1 },
  pillText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.2 },

  // CTAs
  ctas: { paddingHorizontal: 24, paddingBottom: 34, gap: 12, alignItems: "center" },
  primaryWrap: {
    width: "100%", borderRadius: 16, overflow: "hidden",
    shadowColor: "#6366F1", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  primaryBtn: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryBtnText: { color: "#fff", fontSize: 16.5, fontWeight: "800", letterSpacing: 0.2 },
  secondaryWrap: { width: "100%", borderRadius: 16, overflow: "hidden" },
  secondaryBtn: { height: 54, borderWidth: 1, borderRadius: 16, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  secondaryBtnText: { fontSize: 15, fontWeight: "700" },
  legalRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  legal: { fontSize: 12.5, fontWeight: "500" },
});
