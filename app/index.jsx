import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const AURORA_DARK = ["#0A0613", "#150C2E", "#0A0714"];
const AURORA_LIGHT = ["#EEF2FF", "#F3F0FF", "#FFFFFF"];
const BTN_GRADIENT = ["#6366F1", "#8B5CF6"];

const DEMO_MEMBERS = [
  { initial: "A", bg: "#6366F1" },
  { initial: "R", bg: "#0EA5E9" },
  { initial: "K", bg: "#F59E0B" },
];

const FEATURES = [
  {
    Icon: Sparkles,
    title: "Smart splitting",
    desc: "Equal, custom or percentage splits — the math is always right.",
  },
  {
    Icon: MessageCircle,
    title: "Built-in group chat",
    desc: "Plan the trip and settle the bill in the same conversation.",
  },
  {
    Icon: Bot,
    title: "AI assistant",
    desc: "Ask \"who owes what?\" and get instant answers about your trips.",
  },
  {
    Icon: ReceiptText,
    title: "Scan receipts",
    desc: "Snap a bill and let SplitEase read the amounts for you.",
  },
];

const STEPS = [
  {
    Icon: Users,
    title: "Create a group",
    desc: "Start a trip or house group and invite friends with one link.",
  },
  {
    Icon: ReceiptText,
    title: "Add expenses",
    desc: "Log who paid as you go — everyone sees the same numbers.",
  },
  {
    Icon: Wallet,
    title: "Settle in one tap",
    desc: "SplitEase nets it all out into the fewest payments possible.",
  },
];

export default function HomeScreen() {
  const [isSplashVisible, setSplashVisible] = useState(true);
  const [isMinTimeElapsed, setMinTimeElapsed] = useState(false);
  const { token, loading } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const isDark = theme === "dark";
  const aurora = isDark ? AURORA_DARK : AURORA_LIGHT;
  const glassTint = isDark ? "dark" : "light";
  const glassBorder = isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.75)";
  const glassFill = isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.45)";
  const textMain = isDark ? "#FFFFFF" : "#15102B";
  const textDim = isDark ? "rgba(255,255,255,0.55)" : "rgba(30,20,60,0.55)";
  const accent = isDark ? "#A78BFA" : "#6366F1";
  const cardBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.8)";
  const settledBg = isDark ? "rgba(52,211,153,0.14)" : "rgba(16,185,129,0.12)";
  const settledFg = isDark ? "#34D399" : "#059669";

  const ring = useSharedValue(1);
  const ring2 = useSharedValue(1);
  const float = useSharedValue(0);

  useEffect(() => {
    ring.value = withRepeat(withTiming(1.22, { duration: 2200 }), -1, true);
    ring2.value = withRepeat(withTiming(1.45, { duration: 2200 }), -1, true);
    float.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    const timer = setTimeout(() => setMinTimeElapsed(true), 2200);
    return () => clearTimeout(timer);
  }, [ring, ring2, float]);

  useEffect(() => {
    if (!loading && isMinTimeElapsed) {
      if (token) router.replace("/(tabs)/home");
      else setSplashVisible(false);
    }
  }, [loading, isMinTimeElapsed, token]);

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: ring.value }] }));
  const ring2Style = useAnimatedStyle(() => ({ transform: [{ scale: ring2.value }] }));
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (float.value - 0.5) * -8 }],
  }));
  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value * 6 }],
    opacity: 0.5 + float.value * 0.5,
  }));

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

        <Animated.View style={[styles.ringOuter, { borderColor: glassBorder }, ringStyle]} />
        <Animated.View style={[styles.ringInner, { borderColor: glassBorder }, ring2Style]} />

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

      <SafeAreaView style={styles.fill} edges={["top"]}>
        {/* Wordmark */}
        <Animated.View entering={FadeIn.duration(500)} style={styles.topBar}>
          <Image source={require("../assets/images/icon.png")} style={{ width: 24, height: 24, borderRadius: 6, marginRight: 8 }} resizeMode="contain" />
          <Text style={[styles.wordmark, { color: textMain }]}>SplitEase</Text>
        </Animated.View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
        >
          {/* ── Section 1 · Hero ─────────────────────────────────────────── */}
          <View style={styles.heroSection}>
            <Animated.View entering={ZoomIn.delay(120).duration(600).springify()} style={floatStyle}>
              <LinearGradient colors={BTN_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroIcon}>
                <Image source={require("../assets/images/icon.png")} style={{ width: 46, height: 46, borderRadius: 12 }} resizeMode="contain" />
              </LinearGradient>
            </Animated.View>

            <Animated.Text entering={FadeInDown.delay(220).duration(650)} style={[styles.headline, { color: textMain }]}>
              Split bills,{"\n"}not friendships.
            </Animated.Text>
            <Animated.Text entering={FadeInDown.delay(320).duration(650)} style={[styles.subCopy, { color: textDim }]}>
              Track group expenses, settle up instantly, and travel together — without the math.
            </Animated.Text>

            {/* Product moment — a live split, already settled */}
            <Animated.View
              entering={FadeInUp.delay(400).duration(650)}
              style={[styles.demoCard, { backgroundColor: cardBg, borderColor: glassBorder }]}
            >
              <View style={styles.demoLeft}>
                <Text style={[styles.demoTitle, { color: textMain }]}>Goa Trip</Text>
                <Text style={[styles.demoMeta, { color: textDim }]}>₹12,400 · 4 friends</Text>
                <View style={styles.demoAvatars}>
                  {DEMO_MEMBERS.map((m, i) => (
                    <View key={m.initial} style={[styles.demoAvatar, { backgroundColor: m.bg, marginLeft: i === 0 ? 0 : -8, borderColor: isDark ? "#1B1433" : "#FFFFFF" }]}>
                      <Text style={styles.demoAvatarText}>{m.initial}</Text>
                    </View>
                  ))}
                  <View style={[styles.demoAvatar, styles.demoAvatarMore, { marginLeft: -8, borderColor: isDark ? "#1B1433" : "#FFFFFF" }]}>
                    <Text style={[styles.demoAvatarText, { fontSize: 9 }]}>+1</Text>
                  </View>
                </View>
              </View>
              <View style={[styles.settledChip, { backgroundColor: settledBg }]}>
                <CheckCircle2 size={13} color={settledFg} strokeWidth={2.5} />
                <Text style={[styles.settledText, { color: settledFg }]}>All settled</Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(480).duration(600)} style={styles.heroCta}>
              <TouchableOpacity onPress={() => router.push("/auth/register")} activeOpacity={0.9} style={styles.primaryWrap}>
                <LinearGradient colors={BTN_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>Get Started — it's free</Text>
                  <ArrowRight size={18} color="#fff" strokeWidth={2.4} />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={[styles.scrollHint, bounceStyle]}>
              <Text style={[styles.scrollHintText, { color: textDim }]}>See how it works</Text>
              <ChevronDown size={16} color={textDim} />
            </Animated.View>
          </View>

          {/* ── Section 2 · Features ─────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={[styles.sectionKicker, { color: accent }]}>WHY SPLITEASE</Text>
            <Text style={[styles.sectionTitle, { color: textMain }]}>
              Everything your group needs
            </Text>
            <Text style={[styles.sectionSub, { color: textDim }]}>
              From the first plan to the final payment — it all lives in one place.
            </Text>

            <View style={styles.featureGrid}>
              {FEATURES.map(({ Icon, title, desc }) => (
                <View key={title} style={[styles.featureCard, { backgroundColor: cardBg, borderColor: glassBorder }]}>
                  <View style={[styles.featureIconWrap, { backgroundColor: isDark ? "rgba(167,139,250,0.14)" : "rgba(99,102,241,0.10)" }]}>
                    <Icon size={19} color={accent} strokeWidth={2.2} />
                  </View>
                  <Text style={[styles.featureTitle, { color: textMain }]}>{title}</Text>
                  <Text style={[styles.featureDesc, { color: textDim }]}>{desc}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Section 3 · How it works ─────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={[styles.sectionKicker, { color: accent }]}>HOW IT WORKS</Text>
            <Text style={[styles.sectionTitle, { color: textMain }]}>
              Settled in three steps
            </Text>

            <View style={styles.steps}>
              {STEPS.map(({ Icon, title, desc }, i) => (
                <View key={title} style={styles.stepRow}>
                  <View style={styles.stepRail}>
                    <LinearGradient colors={BTN_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.stepBadge}>
                      <Icon size={17} color="#fff" strokeWidth={2.2} />
                    </LinearGradient>
                    {i < STEPS.length - 1 && (
                      <View style={[styles.stepLine, { backgroundColor: isDark ? "rgba(167,139,250,0.25)" : "rgba(99,102,241,0.2)" }]} />
                    )}
                  </View>
                  <View style={styles.stepBody}>
                    <Text style={[styles.stepNum, { color: accent }]}>STEP {i + 1}</Text>
                    <Text style={[styles.stepTitle, { color: textMain }]}>{title}</Text>
                    <Text style={[styles.stepDesc, { color: textDim }]}>{desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* ── Section 4 · Final CTA ────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.finalShadow}>
              <BlurView intensity={isDark ? 45 : 70} tint={glassTint} experimentalBlurMethod="dimezisBlurView" style={[styles.finalCard, { borderColor: glassBorder }]}>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: glassFill }]} />
                <LinearGradient
                  colors={isDark ? ["rgba(255,255,255,0.10)", "transparent"] : ["rgba(255,255,255,0.6)", "transparent"]}
                  style={styles.sheen}
                  pointerEvents="none"
                />

                <View style={[styles.featureIconWrap, { backgroundColor: isDark ? "rgba(167,139,250,0.14)" : "rgba(99,102,241,0.10)" }]}>
                  <UserPlus size={20} color={accent} strokeWidth={2.2} />
                </View>
                <Text style={[styles.finalTitle, { color: textMain }]}>
                  Start splitting smarter
                </Text>
                <Text style={[styles.finalSub, { color: textDim }]}>
                  Create your first group in under a minute.
                </Text>

                <TouchableOpacity onPress={() => router.push("/auth/register")} activeOpacity={0.9} style={styles.primaryWrap}>
                  <LinearGradient colors={BTN_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryBtn}>
                    <Text style={styles.primaryBtnText}>Get Started — it's free</Text>
                    <ArrowRight size={18} color="#fff" strokeWidth={2.4} />
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push("/auth/login")} activeOpacity={0.8} style={styles.secondaryWrap}>
                  <View style={[styles.secondaryBtn, { borderColor: glassBorder, backgroundColor: cardBg }]}>
                    <Text style={[styles.secondaryBtnText, { color: textMain }]}>I already have an account</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.legalRow}>
                  <ShieldCheck size={13} color={textDim} />
                  <Text style={[styles.legal, { color: textDim }]}>Private & secure · Free to use · No card required</Text>
                </View>
              </BlurView>
            </View>
          </View>
        </ScrollView>
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

  // Top bar
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 28, paddingTop: 14, paddingBottom: 4 },
  wordmark: { fontSize: 17, fontWeight: "800", letterSpacing: -0.4 },

  // Section 1 · Hero
  heroSection: {
    minHeight: height * 0.78,
    justifyContent: "center", alignItems: "center",
    paddingHorizontal: 26, gap: 15, paddingTop: 10,
  },
  heroIcon: {
    width: 74, height: 74, borderRadius: 21, justifyContent: "center", alignItems: "center", marginBottom: 2,
    shadowColor: "#6366F1", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 18, elevation: 10,
  },
  headline: { fontSize: 34, fontWeight: "800", textAlign: "center", letterSpacing: -1.2, lineHeight: 41 },
  subCopy: { fontSize: 14.5, textAlign: "center", lineHeight: 21, fontWeight: "400", maxWidth: width * 0.78 },

  demoCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    width: "100%", borderRadius: 18, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 13, marginTop: 4,
  },
  demoLeft: { gap: 3 },
  demoTitle: { fontSize: 15, fontWeight: "800", letterSpacing: -0.3 },
  demoMeta: { fontSize: 12, fontWeight: "500" },
  demoAvatars: { flexDirection: "row", marginTop: 5, alignItems: "center" },
  demoAvatar: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
    justifyContent: "center", alignItems: "center",
  },
  demoAvatarMore: { backgroundColor: "#64748B" },
  demoAvatarText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  settledChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 100,
  },
  settledText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.1 },

  heroCta: { width: "100%", marginTop: 6 },
  scrollHint: { alignItems: "center", gap: 2, marginTop: 14 },
  scrollHintText: { fontSize: 12, fontWeight: "600", letterSpacing: 0.3 },

  // Shared section chrome
  section: { paddingHorizontal: 24, paddingTop: 44, alignItems: "center" },
  sectionKicker: { fontSize: 11.5, fontWeight: "800", letterSpacing: 2 },
  sectionTitle: { fontSize: 26, fontWeight: "800", letterSpacing: -0.8, textAlign: "center", marginTop: 8 },
  sectionSub: { fontSize: 14, textAlign: "center", lineHeight: 20, marginTop: 8, maxWidth: width * 0.8 },

  // Section 2 · Features
  featureGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 24, justifyContent: "center",
  },
  featureCard: {
    width: (width - 24 * 2 - 12) / 2,
    borderRadius: 20, borderWidth: 1, padding: 16, gap: 8,
  },
  featureIconWrap: {
    width: 40, height: 40, borderRadius: 13, justifyContent: "center", alignItems: "center",
  },
  featureTitle: { fontSize: 14.5, fontWeight: "800", letterSpacing: -0.2 },
  featureDesc: { fontSize: 12, lineHeight: 17, fontWeight: "400" },

  // Section 3 · Steps
  steps: { width: "100%", marginTop: 26, gap: 0 },
  stepRow: { flexDirection: "row", gap: 16 },
  stepRail: { alignItems: "center" },
  stepBadge: {
    width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center",
    shadowColor: "#6366F1", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  stepLine: { width: 2, flex: 1, marginVertical: 6, borderRadius: 1 },
  stepBody: { flex: 1, paddingBottom: 26 },
  stepNum: { fontSize: 10.5, fontWeight: "800", letterSpacing: 1.5 },
  stepTitle: { fontSize: 16.5, fontWeight: "800", letterSpacing: -0.3, marginTop: 3 },
  stepDesc: { fontSize: 13, lineHeight: 19, marginTop: 4 },

  // Section 4 · Final CTA
  finalShadow: {
    width: "100%", borderRadius: 28,
    shadowColor: "#4C1D95", shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.3, shadowRadius: 30, elevation: 12,
  },
  finalCard: {
    borderRadius: 28, borderWidth: 1, overflow: "hidden",
    paddingHorizontal: 24, paddingVertical: 30, alignItems: "center", gap: 12,
  },
  sheen: { position: "absolute", top: 0, left: 0, right: 0, height: 120 },
  finalTitle: { fontSize: 24, fontWeight: "800", letterSpacing: -0.7, textAlign: "center" },
  finalSub: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 6 },

  // Buttons
  primaryWrap: {
    width: "100%", borderRadius: 16, overflow: "hidden",
    shadowColor: "#6366F1", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  primaryBtn: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryBtnText: { color: "#fff", fontSize: 16.5, fontWeight: "800", letterSpacing: 0.2 },
  secondaryWrap: { width: "100%", borderRadius: 16, overflow: "hidden" },
  secondaryBtn: { height: 54, borderWidth: 1, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  secondaryBtnText: { fontSize: 15, fontWeight: "700" },
  legalRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  legal: { fontSize: 12.5, fontWeight: "500" },
});
