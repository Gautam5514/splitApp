import { PillButton } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  ImageBackground,
  LayoutAnimation,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SLIDES = [
  {
    key: "together",
    card: { title: "Dinner at Toit", meta: "Gautam paid · 4 people", amount: "₹2,400", status: "You owe ₹600", owed: false },
    image: require("../assets/images/onboarding-earth.webp"),
    eyebrow: "BETTER TOGETHER",
    title: "Share moments.",
    accent: "Split the rest.",
    description: "Keep every trip, dinner, and shared bill simple with the people who matter.",
    social: "Made for your circle",
  },
  {
    key: "roommates",
    card: { title: "Wi-Fi & electricity", meta: "Ravi paid · 3 people", amount: "₹3,200", status: "You owe ₹1,067", owed: false },
    image: require("../assets/images/onboarding-roommates.webp"),
    eyebrow: "ROOMMATES",
    title: "Share the home.",
    accent: "Split every bill.",
    description: "Rent, groceries, Wi-Fi, and every little shared expense—clear, fair, and settled together.",
    social: "One home. Zero awkward math.",
  },
  {
    key: "trips",
    card: { title: "Goa villa stay", meta: "You paid · 4 people", amount: "₹18,000", status: "You get ₹13,500", owed: true },
    image: require("../assets/images/onboarding-trips.webp"),
    eyebrow: "TRIPS TOGETHER",
    title: "Chase memories.",
    accent: "Not repayments.",
    description: "Track every stay, meal, and adventure while SplitEase keeps the group balance effortless.",
    social: "Travel light. Settle smarter.",
  },
  {
    key: "business",
    card: { title: "Client lunch", meta: "Sagar paid · 5 people", amount: "₹5,600", status: "You owe ₹1,120", owed: false },
    image: require("../assets/images/onboarding-business.webp"),
    eyebrow: "BUSINESS READY",
    title: "Work smarter.",
    accent: "Costs clear.",
    description: "Team, event and trip expenses in one clear place.",
    social: "Built for fast teams.",
  },
];

const LAST = SLIDES.length - 1;
const NAV_H = 54;
const CTA_H = 112;
const SIDE_PAD = 26;
const PARALLAX = 0.12;

const settleDots = () => {
  try { LayoutAnimation.configureNext(LayoutAnimation.create(180, "easeInEaseOut", "opacity")); } catch { /* cosmetic */ }
};

const tap = () => {
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch { /* haptics are optional */ }
};

const Slide = memo(function Slide({ item, index, width, scrollX, bottomSpace, compact }) {
  const input = [(index - 1) * width, index * width, (index + 1) * width];
  const imageX = scrollX.interpolate({ inputRange: input, outputRange: [width * PARALLAX, 0, -width * PARALLAX], extrapolate: "clamp" });
  const textOpacity = scrollX.interpolate({
    inputRange: [(index - 0.6) * width, index * width, (index + 0.6) * width], outputRange: [0, 1, 0], extrapolate: "clamp",
  });
  const textX = scrollX.interpolate({ inputRange: input, outputRange: [44, 0, -44], extrapolate: "clamp" });
  const { card } = item;

  return (
    <View style={[styles.slide, { width }]}>
      <Animated.View style={[styles.imageWrap, { width: width * (1 + PARALLAX * 2.5), left: -width * PARALLAX * 1.25, transform: [{ translateX: imageX }] }]}>
        <ImageBackground source={item.image} resizeMode="cover" style={StyleSheet.absoluteFill} fadeDuration={0} />
      </Animated.View>
      <LinearGradient
        colors={["rgba(3,7,20,0.16)", "rgba(3,7,20,0)", "rgba(5,8,18,0.88)", "#050812"]}
        locations={[0, 0.36, 0.62, 0.78]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <Animated.View
        style={[styles.bottomContent, { paddingBottom: bottomSpace, opacity: textOpacity, transform: [{ translateX: textX }] }]}
        accessible
        accessibilityLabel={`${item.eyebrow}. ${item.title} ${item.accent}. ${item.description}`}
      >
        {!compact && (
          <View style={styles.card}>
            <View style={styles.cardAvatar}><Text style={styles.cardInitial}>{card.title.charAt(0)}</Text></View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle} numberOfLines={1}>{card.title}</Text>
              <Text style={styles.cardMeta} numberOfLines={1}>{card.meta}</Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.cardAmount}>{card.amount}</Text>
              <Text style={[styles.cardStatus, card.owed && styles.cardStatusOwed]}>{card.status}</Text>
            </View>
          </View>
        )}

        <Text style={styles.eyebrow}>{item.eyebrow}</Text>
        <Text style={[styles.title, compact && styles.titleCompact]}>
          {item.title}{"\n"}
          <Text style={styles.titleAccent}>{item.accent}</Text>
        </Text>
        <Text style={styles.description}>{item.description}</Text>

        <View style={styles.socialRow}>
          <View style={styles.socialDot} />
          <Text style={styles.socialText}>{item.social}</Text>
        </View>
      </Animated.View>
    </View>
  );
});

const Dot = memo(function Dot({ active }) {
  return <View style={[styles.dot, active && styles.dotActive]} />;
});

export default function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const indexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const compact = height < 720;
  const isLast = activeIndex === LAST;
  const barBottom = Math.max(insets.bottom, 12) + 10;

  const goTo = useCallback((i) => {
    indexRef.current = i;
    settleDots();
    setActiveIndex(i);
    listRef.current?.scrollToOffset({ offset: i * width, animated: true });
  }, [width]);

  const goNext = useCallback(() => { tap(); goTo(Math.min(indexRef.current + 1, LAST)); }, [goTo]);
  const skip = useCallback(() => { tap(); goTo(LAST); }, [goTo]);

  const openAuth = useCallback((path) => {
    if (leaving) return;
    tap();
    setLeaving(true);
    router.replace(path);
  }, [leaving]);

  const onMomentumEnd = useCallback((e) => {
    const i = Math.max(0, Math.min(Math.round(e.nativeEvent.contentOffset.x / width), LAST));
    if (i !== indexRef.current) settleDots();
    indexRef.current = i;
    setActiveIndex(i);
  }, [width]);

  const onScroll = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true }),
    [scrollX],
  );

  const bottomSpaceBase = barBottom + NAV_H + 14;
  const renderSlide = useCallback(({ item, index }) => (
    <Slide
      item={item} index={index} width={width} scrollX={scrollX} compact={compact}
      bottomSpace={bottomSpaceBase + (index === LAST ? CTA_H : 0)}
    />
  ), [width, scrollX, compact, bottomSpaceBase]);

  const lastRange = [(LAST - 1) * width, LAST * width];
  const navLift = scrollX.interpolate({ inputRange: lastRange, outputRange: [0, -CTA_H], extrapolate: "clamp" });
  const nextOpacity = scrollX.interpolate({ inputRange: lastRange, outputRange: [1, 0], extrapolate: "clamp" });
  const ctaOpacity = scrollX.interpolate({ inputRange: lastRange, outputRange: [0, 1], extrapolate: "clamp" });
  const ctaLift = scrollX.interpolate({ inputRange: lastRange, outputRange: [24, 0], extrapolate: "clamp" });

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Animated.FlatList
        ref={listRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        bounces={false}
        overScrollMode="never"
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews
      />

      <View style={[styles.topRow, { paddingTop: insets.top + 12 }]} pointerEvents="box-none">
        <View style={styles.brand}>
          <Image source={require("../assets/images/favicon-dark.png")} style={styles.brandIcon} />
          <Text style={styles.brandName}>SplitEase</Text>
        </View>
        <Animated.View style={{ opacity: nextOpacity }} pointerEvents={isLast ? "none" : "auto"}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding and show account options"
            onPress={skip}
            hitSlop={12}
            style={({ pressed }) => [styles.skipButton, pressed && styles.skipButtonPressed]}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </Animated.View>
      </View>

      <View style={[styles.bar, { bottom: barBottom, height: NAV_H + CTA_H }]} pointerEvents="box-none">
        <Animated.View style={[styles.navigationRow, { transform: [{ translateY: navLift }] }]} pointerEvents="box-none">
          <View style={styles.dots} accessibilityLabel={`Page ${activeIndex + 1} of ${SLIDES.length}`}>
            {SLIDES.map((slide, i) => <Dot key={slide.key} active={i === activeIndex} />)}
          </View>
          <Animated.View style={{ opacity: nextOpacity }} pointerEvents={isLast ? "none" : "auto"}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show next onboarding page"
              onPress={goNext}
              style={({ pressed }) => [styles.nextButton, pressed && styles.buttonPressed]}
            >
              <ArrowRight size={22} color="#061225" strokeWidth={2.6} />
            </Pressable>
          </Animated.View>
        </Animated.View>

        <Animated.View
          style={[styles.finalActions, { opacity: ctaOpacity, transform: [{ translateY: ctaLift }] }]}
          pointerEvents={isLast ? "auto" : "none"}
        >
          <PillButton
            variant="primary"
            label="Get started"
            accessibilityLabel="Get started and register"
            onPress={() => openAuth("/auth/register")}
            disabled={leaving}
            icon={<ArrowRight size={20} color="#061225" strokeWidth={2.5} />}
            style={styles.primaryButton}
            textStyle={styles.primaryButtonText}
          />
          <PillButton
            variant="secondary"
            label="Already have an account? Log in"
            accessibilityLabel="Log in to your account"
            onPress={() => openAuth("/auth/login")}
            disabled={leaving}
            style={styles.loginButton}
            textStyle={styles.loginButtonText}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#050812" },
  slide: { flex: 1, backgroundColor: "#050812", overflow: "hidden" },
  imageWrap: { ...StyleSheet.absoluteFillObject, right: undefined },
  topRow: {
    position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: SIDE_PAD,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandIcon: { width: 32, height: 32, borderRadius: 9 },
  brandName: { color: "#FFFFFF", fontSize: 23, fontWeight: "700", letterSpacing: -0.8 },
  skipButton: {
    height: 30, paddingHorizontal: 14, borderRadius: 15, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  skipButtonPressed: { opacity: 0.72 },
  skipText: { color: "#FFFFFF", fontSize: 12.5, fontWeight: "600", letterSpacing: 0.1 },
  bottomContent: { flex: 1, justifyContent: "flex-end", paddingHorizontal: SIDE_PAD },
  card: {
    flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 16, marginBottom: 18, alignSelf: "flex-start", maxWidth: 330,
    backgroundColor: "rgba(8,13,28,0.62)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.14)",
  },
  cardAvatar: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(112,218,243,0.14)" },
  cardInitial: { color: "#70DAF3", fontSize: 15, fontWeight: "800" },
  cardText: { flexShrink: 1 },
  cardTitle: { color: "#FFFFFF", fontSize: 13.5, fontWeight: "700" },
  cardMeta: { color: "#9AA8BF", fontSize: 11, marginTop: 1 },
  cardRight: { alignItems: "flex-end", marginLeft: 6 },
  cardAmount: { color: "#FFFFFF", fontSize: 14, fontWeight: "800", letterSpacing: -0.3 },
  cardStatus: { color: "#FFB4A8", fontSize: 11, fontWeight: "700", marginTop: 2 },
  cardStatusOwed: { color: "#7CE3B0" },
  eyebrow: { color: "#A7CAE2", fontSize: 11, fontWeight: "800", letterSpacing: 2.2, marginBottom: 14 },
  title: { color: "#FFFFFF", fontSize: 40, lineHeight: 45, fontWeight: "800", letterSpacing: -1.9 },
  titleCompact: { fontSize: 34, lineHeight: 39 },
  titleAccent: { color: "#70DAF3" },
  description: { color: "#B1BDD1", fontSize: 14, lineHeight: 21, marginTop: 13, maxWidth: 345 },
  socialRow: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 18 },
  socialDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#70DAF3" },
  socialText: { color: "#B9C9D9", fontSize: 12, fontWeight: "600", flexShrink: 1 },
  bar: { position: "absolute", left: SIDE_PAD, right: SIDE_PAD },
  navigationRow: {
    position: "absolute", left: 0, right: 0, bottom: 0, height: NAV_H,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  dots: { flexDirection: "row", alignItems: "center", gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(177,189,209,0.35)" },
  dotActive: { width: 28, backgroundColor: "#70DAF3" },
  nextButton: {
    width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center",
    backgroundColor: "#F7FAFF", shadowColor: "#65DDF5", shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.22, shadowRadius: 12, elevation: 5,
  },
  buttonPressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
  finalActions: { position: "absolute", left: 0, right: 0, bottom: 0, height: CTA_H - 8 },
  primaryButton: { backgroundColor: "#F7FAFF" },
  primaryButtonText: { color: "#081329", fontWeight: "800" },
  loginButton: { marginTop: 10, backgroundColor: "transparent", borderWidth: 0 },
  loginButtonText: { color: "#80E2F7", fontWeight: "700" },
});
