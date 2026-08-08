import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Dimensions, Image, StatusBar, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from "react-native-svg";

const { width, height } = Dimensions.get("window");

const RING_COLORS = ["#6366F1", "#8B5CF6", "#22D3EE"];
const RING_R = 80;
const RING_CIRC = 2 * Math.PI * RING_R;
const RING_ARC = RING_CIRC / 3 - 34;

export default function HomeScreen() {
  const [isMinTimeElapsed, setMinTimeElapsed] = useState(false);
  const { token, loading } = useAuth();

  // Splash keeps a fixed black brand look, independent of the user's
  // in-app theme preference (which only applies once logged in).
  const textMain = "#FFFFFF";
  const textDim = "rgba(255,255,255,0.55)";
  const accent = "#A78BFA";

  const spin = useSharedValue(0);
  const pulse = useSharedValue(0.5);

  useEffect(() => {
    spin.value = withRepeat(withTiming(360, { duration: 14000, easing: Easing.linear }), -1);
    pulse.value = withRepeat(withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.quad) }), -1, true);
    const timer = setTimeout(() => setMinTimeElapsed(true), 2200);
    return () => clearTimeout(timer);
  }, [spin, pulse]);

  useEffect(() => {
    if (!loading && isMinTimeElapsed) {
      router.replace(token ? "/(tabs)/home" : "/auth/register");
    }
  }, [loading, isMinTimeElapsed, token]);

  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

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

const styles = StyleSheet.create({
  fill: { flex: 1 },
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
});
