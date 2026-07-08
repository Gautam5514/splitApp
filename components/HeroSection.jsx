import { useTheme } from "@/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ArrowRight, Globe, Plane, Sparkles, Wallet } from "lucide-react-native";
import { useEffect } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useScrollViewOffset,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

export default function HeroSection() {
  const { colors, theme } = useTheme();
  const isDark = theme === "dark";
  
  // 1. Scroll Parallax Logic
  const scrollOffset = useScrollViewOffset(); // Pass the ref from parent ScrollView if needed, or use context
  
  // 2. Continuous Floating Animation Logic
  const floatValue = useSharedValue(0);

  useEffect(() => {
    floatValue.value = withRepeat(
      withSequence(
        withTiming(15, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.quad) })
      ),
      -1, // Infinite
      true // Reverse
    );
  }, []);

  // Animated Styles for Icons (Combining Scroll + Float)
  const planeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollOffset.value || 0, [0, 200], [0, -50]) + floatValue.value },
      { rotate: "-15deg" }
    ],
  }));

  const walletStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollOffset.value || 0, [0, 200], [0, 40]) - floatValue.value },
      { rotate: "15deg" }
    ],
  }));

  const styles = getStyles(colors, isDark);

  return (
    <View style={styles.container}>
      
      {/* 🌟 Background Aura/Glow for Depth */}
      <View style={styles.auraContainer}>
        <View style={styles.auraBlob} />
      </View>

      {/* ✈️ Floating 3D Icons */}
      <Animated.View style={[styles.floatingIconLeft, planeStyle]}>
        <View style={styles.iconGlassCircle}>
            <Plane size={32} color="white" fill={colors.primary} />
        </View>
      </Animated.View>

      <Animated.View style={[styles.floatingIconRight, walletStyle]}>
         <View style={[styles.iconGlassCircle, styles.walletCircle]}>
            <Wallet size={32} color="white" fill="#A855F7" />
        </View>
      </Animated.View>

      {/* 🏷️ Glass Pill Tag */}
      <View style={styles.tagWrapper}>
        <View style={styles.tag}>
            <Sparkles size={14} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.tagText}>#1 Travel Expense Tracker</Text>
        </View>
      </View>

      {/* 👑 Hero Title */}
      <View style={styles.textContainer}>
        <Text style={styles.title}>
          Travel More.
        </Text>
        <Text style={styles.titleAccent}>
            Worry Less.
        </Text>
      </View>

      {/* 📝 Subtitle */}
      <Text style={styles.subtitle}>
        SplitEase handles the math, the awkward money talks, and the balances. 
        You just focus on the adventure.
      </Text>

      {/* 🚀 CTA Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          onPress={() => router.push("/auth/register")}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.primary, "#4F46E5"]} // Gradient from Primary to Indigo
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Get Started</Text>
            <ArrowRight size={20} color="white" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/auth/login")}
          style={styles.secondaryBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryBtnText}>I have an account</Text>
        </TouchableOpacity>
      </View>
      
      {/* Optional: Trust Indicator */}
      <View style={styles.trustRow}>
        <Globe size={14} color={colors.textSecondary} />
        <Text style={styles.trustText}>Trusted by 10,000+ travelers</Text>
      </View>

    </View>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    width: "100%",
    alignItems: "center",
    position: 'relative',
    overflow: 'hidden', // Clips the aura
  },
  
  // 🌟 Background Aura
  auraContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auraBlob: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width,
    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)',
    transform: [{ scale: 1.2 }],
  },

  // ✈️ Floating Icons
  floatingIconLeft: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 1,
  },
  floatingIconRight: {
    position: "absolute",
    top: 100,
    right: 20,
    zIndex: 1,
  },
  iconGlassCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  walletCircle: {
    shadowColor: "#A855F7",
  },

  // 🏷️ Tag
  tagWrapper: {
    marginBottom: 24,
    borderRadius: 100,
    overflow: 'hidden',
  },
  tag: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)',
    alignItems: "center",
  },
  tagText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.5,
  },

  // 👑 Typography
  textContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 42,
    fontWeight: "900",
    textAlign: "center",
    color: colors.text,
    lineHeight: 48,
    letterSpacing: -1.5,
  },
  titleAccent: {
    fontSize: 42,
    fontWeight: "900",
    textAlign: "center",
    color: colors.primary, // Or use a gradient text component if available
    lineHeight: 52,
    letterSpacing: -1.5,
    textDecorationLine: 'underline',
    textDecorationColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)',
  },
  subtitle: {
    textAlign: "center",
    fontSize: 17,
    color: colors.textSecondary,
    maxWidth: width * 0.85,
    lineHeight: 26,
    fontWeight: "500",
    marginBottom: 40,
  },

  // 🚀 Buttons
  buttonRow: {
    flexDirection: "column", // Stacked on mobile looks more premium often, or row
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  primaryBtn: {
    width: width * 0.8,
    paddingVertical: 18,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  primaryBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 18,
    marginRight: 8,
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    paddingVertical: 12,
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: 16,
  },

  // 🌍 Trust
  trustRow: {
    marginTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.6,
    gap: 6
  },
  trustText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500'
  }
});