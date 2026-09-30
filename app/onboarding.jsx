import { PillButton } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { useRef, useState } from "react";
import {
  FlatList,
  Image,
  ImageBackground,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SLIDES = [
  {
    key: "together",
    image: require("../assets/images/onboarding-earth.webp"),
    eyebrow: "BETTER TOGETHER",
    title: "Share moments.",
    accent: "Split the rest.",
    description: "Keep every trip, dinner, and shared bill simple with the people who matter.",
    social: "Made for your circle",
  },
  {
    key: "roommates",
    image: require("../assets/images/onboarding-roommates.webp"),
    eyebrow: "ROOMMATES",
    title: "Share the home.",
    accent: "Split every bill.",
    description: "Rent, groceries, Wi-Fi, and every little shared expense—clear, fair, and settled together.",
    social: "One home. Zero awkward math.",
  },
  {
    key: "trips",
    image: require("../assets/images/onboarding-trips.webp"),
    eyebrow: "TRIPS TOGETHER",
    title: "Chase memories.",
    accent: "Not repayments.",
    description: "Track every stay, meal, and adventure while SplitEase keeps the group balance effortless.",
    social: "Travel light. Settle smarter.",
  },
  {
    key: "business",
    image: require("../assets/images/onboarding-business.webp"),
    eyebrow: "BUSINESS READY",
    title: "Move work forward.",
    accent: "Keep costs clear.",
    description: "Organize team, event, and business-trip expenses in one transparent shared place.",
    social: "Built for teams that move fast.",
  },
];

const FRIENDS = [
  require("../public/group/gautam.webp"),
  require("../public/group/ravi.webp"),
  require("../public/group/sagar.webp"),
  require("../public/group/rahul.webp"),
];

export default function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const listRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const compact = height < 720;

  const openAuth = (path) => {
    if (leaving) return;
    setLeaving(true);
    router.replace(path);
  };

  const goNext = () => {
    const nextIndex = Math.min(activeIndex + 1, SLIDES.length - 1);
    listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    setActiveIndex(nextIndex);
  };

  const skipToFinalSlide = () => {
    const finalIndex = SLIDES.length - 1;
    listRef.current?.scrollToIndex({ index: finalIndex, animated: true });
    setActiveIndex(finalIndex);
  };

  const handleScrollEnd = (event) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(Math.max(0, Math.min(nextIndex, SLIDES.length - 1)));
  };

  const renderSlide = ({ item, index }) => {
    const isLast = index === SLIDES.length - 1;

    return (
      <View style={[styles.slide, { width }]}>
        <ImageBackground source={item.image} resizeMode="cover" style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={["rgba(3,7,20,0.16)", "rgba(3,7,20,0)", "rgba(5,8,18,0.88)", "#050812"]}
          locations={[0, 0.36, 0.62, 0.78]}
          style={StyleSheet.absoluteFill}
        />

        <SafeAreaView style={styles.safeArea}>
          <View style={styles.topRow}>
            <View style={styles.brand}>
              <Image source={require("../assets/images/favicon.png")} style={styles.brandIcon} />
              <Text style={styles.brandName}>SplitEase</Text>
            </View>
            <View style={styles.topActions}>
              <Text style={styles.counter}>{String(index + 1).padStart(2, "0")} / 04</Text>
              {!isLast && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Skip onboarding and show account options"
                  onPress={skipToFinalSlide}
                  hitSlop={10}
                  style={({ pressed }) => [styles.skipButton, pressed && styles.skipButtonPressed]}
                >
                  <Text style={styles.skipText}>Skip</Text>
                </Pressable>
              )}
            </View>
          </View>

          <View style={[styles.bottomContent, compact && styles.bottomContentCompact]}>
            <View style={styles.eyebrowRow}>
              <View style={styles.eyebrowLine} />
              <Text style={styles.eyebrow}>{item.eyebrow}</Text>
            </View>

            <Text style={[styles.title, compact && styles.titleCompact]}>
              {item.title}{"\n"}
              <Text style={styles.titleAccent}>{item.accent}</Text>
            </Text>
            <Text style={styles.description}>{item.description}</Text>

            <View style={styles.socialRow}>
              <View style={styles.avatarStack}>
                {FRIENDS.map((source, friendIndex) => (
                  <Image key={friendIndex} source={source} style={styles.avatar} />
                ))}
              </View>
              <Text style={styles.socialText}>{item.social}</Text>
            </View>

            <View style={styles.navigationRow}>
              <View style={styles.dots} accessibilityLabel={`Slide ${index + 1} of ${SLIDES.length}`}>
                {SLIDES.map((slide, dotIndex) => (
                  <View key={slide.key} style={[styles.dot, dotIndex === index && styles.dotActive]} />
                ))}
              </View>

              {!isLast && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Show next onboarding page"
                  onPress={goNext}
                  style={({ pressed }) => [styles.nextButton, pressed && styles.buttonPressed]}
                >
                  <ArrowRight size={22} color="#061225" strokeWidth={2.6} />
                </Pressable>
              )}
            </View>

            {isLast && (
              <View style={styles.finalActions}>
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
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <FlatList
        ref={listRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        initialNumToRender={1}
        windowSize={3}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#050812" },
  slide: { flex: 1, backgroundColor: "#050812" },
  safeArea: { flex: 1, width: "100%", paddingHorizontal: 26 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12 },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandIcon: { width: 32, height: 32, borderRadius: 9 },
  brandName: { color: "#FFFFFF", fontSize: 23, fontWeight: "700", letterSpacing: -0.8 },
  topActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  counter: { color: "rgba(224,240,255,0.72)", fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  skipButton: {
    minHeight: 34, paddingHorizontal: 14, borderRadius: 17, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(7,16,36,0.48)", borderWidth: 1, borderColor: "rgba(128,226,247,0.36)",
  },
  skipButtonPressed: { opacity: 0.72 },
  skipText: { color: "#DDF8FF", fontSize: 12, fontWeight: "800", letterSpacing: 0.3 },
  bottomContent: { marginTop: "auto", paddingBottom: 18 },
  bottomContentCompact: { paddingBottom: 6 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  eyebrowLine: { width: 60, height: 2, borderRadius: 2, backgroundColor: "#65DDF5" },
  eyebrow: { color: "#A7CAE2", fontSize: 11, fontWeight: "800", letterSpacing: 2.2 },
  title: { color: "#FFFFFF", fontSize: 40, lineHeight: 45, fontWeight: "800", letterSpacing: -1.9 },
  titleCompact: { fontSize: 34, lineHeight: 39 },
  titleAccent: { color: "#70DAF3" },
  description: { color: "#B1BDD1", fontSize: 14, lineHeight: 21, marginTop: 13, maxWidth: 345 },
  socialRow: { flexDirection: "row", alignItems: "center", gap: 13, marginTop: 19, marginBottom: 18 },
  avatarStack: { flexDirection: "row", paddingLeft: 1 },
  avatar: {
    width: 31, height: 31, borderRadius: 16, borderWidth: 2, borderColor: "#050812",
    marginLeft: -3, backgroundColor: "#1A2233",
  },
  socialText: { color: "#B9C9D9", fontSize: 12, fontWeight: "600", flexShrink: 1 },
  navigationRow: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dots: { flexDirection: "row", alignItems: "center", gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(177,189,209,0.35)" },
  dotActive: { width: 28, backgroundColor: "#70DAF3" },
  nextButton: {
    width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center",
    backgroundColor: "#F7FAFF", shadowColor: "#65DDF5", shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.22, shadowRadius: 12, elevation: 5,
  },
  buttonPressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
  finalActions: { marginTop: 4 },
  primaryButton: { backgroundColor: "#F7FAFF" },
  primaryButtonText: { color: "#081329", fontWeight: "800" },
  loginButton: { marginTop: 10, backgroundColor: "transparent", borderWidth: 0 },
  loginButtonText: { color: "#80E2F7", fontWeight: "700" },
});
