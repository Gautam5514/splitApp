import { useAuth } from "@/context/AuthContext";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
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
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from "react-native-svg";

const { width, height } = Dimensions.get("window");

const BTN_GRADIENT = ["#6366F1", "#8B5CF6"];
const FEATURE_GRADIENTS = [
  ["#6366F1", "#8B5CF6"],
  ["#0EA5E9", "#6366F1"],
  ["#F59E0B", "#F97316"],
  ["#10B981", "#0EA5E9"],
];
const RING_COLORS = ["#6366F1", "#8B5CF6", "#22D3EE"];
const RING_R = 80;
const RING_CIRC = 2 * Math.PI * RING_R;
const RING_ARC = RING_CIRC / 3 - 34;

const DEMO_MEMBERS = [
  { initial: "A", bg: "#6366F1", share: "₹3,100" },
  { initial: "R", bg: "#0EA5E9", share: "₹3,100" },
  { initial: "K", bg: "#F59E0B", share: "₹3,100" },
];

const FEATURES = [
  {
    Icon: Sparkles,
    title: "Smart splitting",
    desc: "Equal, custom or percentage splits — the math is always right.",
  },
  {
    Icon: MessageCircle,
    title: "Group chat",
    desc: "Plan and settle up in the same thread.",
  },
  {
    Icon: Bot,
    title: "AI assistant",
    desc: "Ask who owes what and get instant answers.",
  },
  {
    Icon: ReceiptText,
    title: "Scan receipts",
    desc: "Snap a bill and let it read the amounts.",
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
  const insets = useSafeAreaInsets();

  // First-open screen keeps a fixed black brand look, independent of the
  // user's in-app theme preference (which only applies once logged in).
  const glassTint = "dark";
  const glassBorder = "rgba(255,255,255,0.12)";
  const glassFill = "rgba(255,255,255,0.05)";
  const textMain = "#FFFFFF";
  const textDim = "rgba(255,255,255,0.55)";
  const accent = "#A78BFA";
  const cardBg = "rgba(255,255,255,0.06)";
  const settledBg = "rgba(52,211,153,0.14)";
  const settledFg = "#34D399";

  const spin = useSharedValue(0);
  const pulse = useSharedValue(0.5);
  const float = useSharedValue(0);

  useEffect(() => {
    spin.value = withRepeat(withTiming(360, { duration: 14000, easing: Easing.linear }), -1);
    pulse.value = withRepeat(withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.quad) }), -1, true);
    float.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    const timer = setTimeout(() => setMinTimeElapsed(true), 2200);
    return () => clearTimeout(timer);
  }, [spin, pulse, float]);

  useEffect(() => {
    if (!loading && isMinTimeElapsed) {
      if (token) router.replace("/(tabs)/home");
      else setSplashVisible(false);
    }
  }, [loading, isMinTimeElapsed, token]);

  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (float.value - 0.5) * -8 }],
  }));
  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value * 6 }],
    opacity: 0.5 + float.value * 0.5,
  }));

  const handlePrimaryPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/auth/register");
  };
  const handleSecondaryPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/auth/login");
  };

  // Painterly mesh-gradient background on pure black — one breathing blob
  // for a subtle sense of life without ever leaving "simple and dark".
  const Background = () => (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="blobA" cx="18%" cy="10%" r="55%">
            <Stop offset="0%" stopColor="#4F46E5" stopOpacity="0.5" />
            <Stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="blobC" cx="80%" cy="92%" r="60%">
            <Stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.22" />
            <Stop offset="100%" stopColor="#0EA5E9" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="#000000" />
        <Rect x="0" y="0" width={width} height={height} fill="url(#blobA)" />
        <Rect x="0" y="0" width={width} height={height} fill="url(#blobC)" />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, pulseStyle]}>
        <Svg width={width} height={height}>
          <Defs>
            <RadialGradient id="blobB" cx="85%" cy="26%" r="48%">
              <Stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
              <Stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width={width} height={height} fill="url(#blobB)" />
        </Svg>
      </Animated.View>
    </View>
  );

  // ─── Splash ───────────────────────────────────────────────────────────────
  if (isSplashVisible) {
    return (
      <View style={styles.fill}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <Background />

        <View style={styles.splashCenter}>
          <View style={styles.splashMark}>
            <Animated.View style={spinStyle}>
              <Svg width={180} height={180} viewBox="0 0 180 180">
                {RING_COLORS.map((color, i) => (
                  <Circle
                    key={color}
                    cx="90"
                    cy="90"
                    r={RING_R}
                    stroke={color}
                    strokeWidth={7}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${RING_ARC} ${RING_CIRC}`}
                    strokeDashoffset={-i * (RING_CIRC / 3)}
                  />
                ))}
              </Svg>
            </Animated.View>

            <Animated.View entering={ZoomIn.duration(700).springify()} style={styles.splashIconWrap}>
              <Image source={require("../assets/images/icon.png")} style={{ width: 62, height: 62, borderRadius: 16 }} resizeMode="contain" />
            </Animated.View>
          </View>

          <Animated.Text entering={FadeInDown.delay(280).duration(700)} style={[styles.splashName, { color: textMain }]}>
            SplitEase
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(450).duration(700)} style={[styles.splashTagline, { color: textDim }]}>
            Split expenses effortlessly
          </Animated.Text>
        </View>

        <Animated.View entering={FadeIn.delay(900)} style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, i === 1 ? { backgroundColor: accent, transform: [{ scale: 1.35 }] } : { backgroundColor: "rgba(255,255,255,0.25)" }]} />
          ))}
        </Animated.View>
      </View>
    );
  }

  // ─── Landing ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.fill}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
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
            <Animated.View entering={FadeInDown.delay(80).duration(500)} style={[styles.kickerPill, { backgroundColor: cardBg, borderColor: glassBorder }]}>
              <View style={[styles.kickerDot, { backgroundColor: accent }]} />
              <Text style={[styles.kickerPillText, { color: textDim }]}>Built for trips & shared homes</Text>
            </Animated.View>

            <Animated.Text entering={FadeInDown.delay(200).duration(650)} style={[styles.headline, { color: textMain }]}>
              Split bills,{"\n"}not <Text style={{ color: accent }}>friendships</Text>.
            </Animated.Text>
            <Animated.Text entering={FadeInDown.delay(320).duration(650)} style={[styles.subCopy, { color: textDim }]}>
              Track group expenses, settle up instantly, and travel together — without the math.
            </Animated.Text>

            {/* Product moment — a real split, broken down per person */}
            <Animated.View
              entering={FadeInUp.delay(400).duration(650)}
              style={[styles.demoCard, { backgroundColor: cardBg, borderColor: glassBorder }, floatStyle]}
            >
              <View style={styles.demoHeaderRow}>
                <View style={[styles.demoIconWrap, { backgroundColor: "rgba(167,139,250,0.16)" }]}>
                  <ReceiptText size={18} color={accent} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.demoTitle, { color: textMain }]}>Goa Trip</Text>
                  <Text style={[styles.demoMeta, { color: textDim }]}>4 friends · ₹12,400 total</Text>
                </View>
                <View style={[styles.settledChip, { backgroundColor: settledBg }]}>
                  <CheckCircle2 size={12} color={settledFg} strokeWidth={2.5} />
                  <Text style={[styles.settledText, { color: settledFg }]}>Settled</Text>
                </View>
              </View>

              <View style={[styles.demoDivider, { backgroundColor: glassBorder }]} />

              <View style={styles.demoSharesRow}>
                {DEMO_MEMBERS.map((m) => (
                  <View key={m.initial} style={styles.demoShareCol}>
                    <View style={[styles.demoAvatar, { backgroundColor: m.bg }]}>
                      <Text style={styles.demoAvatarText}>{m.initial}</Text>
                    </View>
                    <Text style={[styles.demoShareAmt, { color: textDim }]}>{m.share}</Text>
                  </View>
                ))}
                <View style={styles.demoShareCol}>
                  <View style={[styles.demoAvatar, styles.demoAvatarMore]}>
                    <Text style={[styles.demoAvatarText, { fontSize: 10 }]}>+1</Text>
                  </View>
                  <Text style={[styles.demoShareAmt, { color: textDim }]}>₹3,100</Text>
                </View>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(480).duration(600)} style={styles.heroCta}>
              <TouchableOpacity onPress={handlePrimaryPress} activeOpacity={0.9} style={styles.primaryWrap}>
                <LinearGradient colors={BTN_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryBtn}>
                  <LinearGradient colors={["rgba(255,255,255,0.22)", "rgba(255,255,255,0)"]} style={styles.btnSheen} pointerEvents="none" />
                  <Text style={styles.primaryBtnText}>Get Started — it&rsquo;s free</Text>
                  <ArrowRight size={18} color="#fff" strokeWidth={2.4} />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={[styles.scrollHint, bounceStyle]}>
              <Text style={[styles.scrollHintText, { color: textDim }]}>See how it works</Text>
              <ChevronDown size={16} color={textDim} />
            </Animated.View>
          </View>

          {/* ── Section 2 · Features (bento) ─────────────────────────────── */}
          <View style={styles.section}>
            <Text style={[styles.sectionKicker, { color: accent }]}>WHY SPLITEASE</Text>
            <Text style={[styles.sectionTitle, { color: textMain }]}>
              Everything your group needs
            </Text>

            <View style={styles.featureGrid}>
              {FEATURES.map(({ Icon, title, desc }, i) => (
                <View key={title} style={[styles.featureCard, { backgroundColor: cardBg, borderColor: glassBorder }]}>
                  <LinearGradient
                    colors={FEATURE_GRADIENTS[i % FEATURE_GRADIENTS.length]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.featureIconWrap}
                  >
                    <Icon size={20} color="#fff" strokeWidth={2.2} />
                  </LinearGradient>
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
                      <View style={[styles.stepLine, { backgroundColor: "rgba(167,139,250,0.25)" }]} />
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
              <BlurView intensity={45} tint={glassTint} experimentalBlurMethod="dimezisBlurView" style={[styles.finalCard, { borderColor: glassBorder }]}>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: glassFill }]} />
                <LinearGradient
                  colors={["rgba(255,255,255,0.10)", "transparent"]}
                  style={styles.sheen}
                  pointerEvents="none"
                />

                <View style={[styles.finalIconWrap, { backgroundColor: "rgba(167,139,250,0.14)" }]}>
                  <UserPlus size={20} color={accent} strokeWidth={2.2} />
                </View>
                <Text style={[styles.finalTitle, { color: textMain }]}>
                  Start splitting smarter
                </Text>
                <Text style={[styles.finalSub, { color: textDim }]}>
                  Create your first group in under a minute.
                </Text>

                <TouchableOpacity onPress={handlePrimaryPress} activeOpacity={0.9} style={styles.primaryWrap}>
                  <LinearGradient colors={BTN_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryBtn}>
                    <LinearGradient colors={["rgba(255,255,255,0.22)", "rgba(255,255,255,0)"]} style={styles.btnSheen} pointerEvents="none" />
                    <Text style={styles.primaryBtnText}>Get Started — it&rsquo;s free</Text>
                    <ArrowRight size={18} color="#fff" strokeWidth={2.4} />
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleSecondaryPress} activeOpacity={0.8} style={styles.secondaryWrap}>
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

  // Splash
  splashCenter: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  splashMark: { width: 180, height: 180, justifyContent: "center", alignItems: "center" },
  splashIconWrap: {
    position: "absolute", width: 96, height: 96, borderRadius: 26,
    justifyContent: "center", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  splashName: { fontSize: 34, fontWeight: "800", letterSpacing: -1, marginTop: 6 },
  splashTagline: { fontSize: 14, fontWeight: "500", letterSpacing: 0.3 },
  dots: { flexDirection: "row", gap: 7, paddingBottom: 54, alignSelf: "center" },
  dot: { width: 7, height: 7, borderRadius: 4 },

  // Top bar
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 28, paddingTop: 14, paddingBottom: 4 },
  wordmark: { fontSize: 17, fontWeight: "800", letterSpacing: -0.4 },

  // Section 1 · Hero
  heroSection: {
    minHeight: height * 0.82,
    justifyContent: "center", alignItems: "center",
    paddingHorizontal: 26, gap: 16, paddingTop: 10,
  },
  kickerPill: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 100, borderWidth: 1,
  },
  kickerDot: { width: 6, height: 6, borderRadius: 3 },
  kickerPillText: { fontSize: 12, fontWeight: "600", letterSpacing: 0.1 },

  headline: { fontSize: 36, fontWeight: "800", textAlign: "center", letterSpacing: -1.3, lineHeight: 43 },
  subCopy: { fontSize: 14.5, textAlign: "center", lineHeight: 21, fontWeight: "400", maxWidth: width * 0.8 },

  demoCard: {
    width: "100%", borderRadius: 20, borderWidth: 1, padding: 16, marginTop: 6, gap: 14,
  },
  demoHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  demoIconWrap: { width: 38, height: 38, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  demoTitle: { fontSize: 15, fontWeight: "800", letterSpacing: -0.3 },
  demoMeta: { fontSize: 11.5, fontWeight: "500", marginTop: 1 },
  demoDivider: { height: 1, width: "100%" },
  demoSharesRow: { flexDirection: "row", justifyContent: "space-between" },
  demoShareCol: { alignItems: "center", gap: 6 },
  demoAvatar: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: "center", alignItems: "center",
  },
  demoAvatarMore: { backgroundColor: "#64748B" },
  demoAvatarText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  demoShareAmt: { fontSize: 11, fontWeight: "700" },
  settledChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100,
  },
  settledText: { fontSize: 11.5, fontWeight: "700", letterSpacing: 0.1 },

  heroCta: { width: "100%", marginTop: 6 },
  scrollHint: { alignItems: "center", gap: 2, marginTop: 8 },
  scrollHintText: { fontSize: 12, fontWeight: "600", letterSpacing: 0.3 },

  // Shared section chrome
  section: { paddingHorizontal: 24, paddingTop: 44, alignItems: "center" },
  sectionKicker: { fontSize: 11.5, fontWeight: "800", letterSpacing: 2 },
  sectionTitle: { fontSize: 26, fontWeight: "800", letterSpacing: -0.8, textAlign: "center", marginTop: 8 },

  // Section 2 · Features
  featureGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 22, width: "100%",
  },
  featureCard: {
    width: (width - 24 * 2 - 12) / 2,
    minHeight: 158,
    borderRadius: 20, borderWidth: 1, padding: 17, gap: 10,
  },
  featureIconWrap: {
    width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center",
  },
  featureTitle: { fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  featureDesc: { fontSize: 12.5, lineHeight: 18, fontWeight: "400" },

  finalIconWrap: {
    width: 38, height: 38, borderRadius: 12, justifyContent: "center", alignItems: "center",
  },

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
  btnSheen: { position: "absolute", top: 0, left: 0, right: 0, height: "55%" },
  primaryBtnText: { color: "#fff", fontSize: 16.5, fontWeight: "800", letterSpacing: 0.2 },
  secondaryWrap: { width: "100%", borderRadius: 16, overflow: "hidden" },
  secondaryBtn: { height: 54, borderWidth: 1, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  secondaryBtnText: { fontSize: 15, fontWeight: "700" },
  legalRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  legal: { fontSize: 12.5, fontWeight: "500" },
});
