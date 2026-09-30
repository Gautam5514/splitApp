import { useTheme } from "@/context/ThemeContext";
import { FONTS } from "@/constants/typography";
import AI3DLogo from "@/components/icons/AI3DLogo";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import Animated, {
    cancelAnimation,
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

/**
 * SplitEase loader — one lightweight loading identity used across the app.
 *
 * Performance-first: a single rotating gradient arc (the arc length is baked
 * into strokeDasharray, so nothing is recomputed per frame — we only rotate
 * the whole ring on the native thread). Larger sizes add the floating 3D
 * SplitEase sphere at the centre; small/tinted sizes stay a clean ring.
 *
 *   <Loader size={18} color="#fff" />           // on a button
 *   <Loader size={48} />                         // centered in a list
 *   <Loader size={48} label="Loading…" />        // with a shimmering caption
 *   <FullScreenLoader label="Gathering data…" /> // whole-screen, branded
 */

function toFullHex(hex) {
    if (typeof hex !== "string") return hex;
    const match = /^#([0-9a-f]{3})$/i.exec(hex);
    if (!match) return hex;
    const [r, g, b] = match[1];
    return `#${r}${r}${g}${g}${b}${b}`;
}

/* Rotating gradient arc. Only a transform:rotate animates → cheap & smooth. */
function GradientRing({ size, tint, single, trackColor }) {
    const spin = useSharedValue(0);
    useEffect(() => {
        spin.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.linear }), -1);
        return () => cancelAnimation(spin);
    }, []);

    const stroke = Math.max(2.5, size * 0.09);
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const arc = c * 0.7; // visible arc = 70% of the ring (static)

    const ringStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
    const gid = `lg-${single ? "s" : "m"}-${Math.round(size)}`;

    return (
        <Animated.View style={[{ width: size, height: size }, ringStyle]}>
            <Svg width={size} height={size}>
                <Defs>
                    <SvgGradient id={gid} x1="0" y1="0" x2="1" y2="1">
                        {single
                            ? [
                                <Stop key="a" offset="0" stopColor={tint} stopOpacity="1" />,
                                <Stop key="b" offset="1" stopColor={tint} stopOpacity="0.35" />,
                            ]
                            : [
                                <Stop key="a" offset="0" stopColor="#22D3EE" />,
                                <Stop key="b" offset="0.5" stopColor="#6366F1" />,
                                <Stop key="c" offset="1" stopColor="#A855F7" />,
                            ]}
                    </SvgGradient>
                </Defs>
                <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke={`url(#${gid})`}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${arc} ${c - arc}`}
                />
            </Svg>
        </Animated.View>
    );
}

export function Loader({ size = 44, color, label, logo }) {
    const { colors } = useTheme();
    const single = !!color; // custom colour (buttons) → single-tone ring
    const tint = toFullHex(color || colors.primary);
    const track = single ? tint + "26" : colors.primary + "1A";
    // Larger, brand-coloured loaders show the floating 3D logo unless a caller
    // opts out. Small / tinted (button) loaders stay a clean ring.
    const showLogo = logo ?? (!single && size >= 46);

    return (
        <View style={styles.center}>
            <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
                <GradientRing size={size} tint={tint} single={single} trackColor={track} />
                {showLogo && (
                    <View style={StyleSheet.absoluteFillObject}>
                        <View style={styles.logoWrap}>
                            <BreathingLogo size={size * 0.52} />
                        </View>
                    </View>
                )}
            </View>
            {label ? <LoaderLabel text={label} color={colors.textSecondary} /> : null}
        </View>
    );
}

/* Gently breathing 3D SplitEase sphere for the branded / full-screen loader. */
function BreathingLogo({ size }) {
    const p = useSharedValue(0);
    useEffect(() => {
        p.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }), -1, true);
        return () => cancelAnimation(p);
    }, []);
    const style = useAnimatedStyle(() => ({ transform: [{ scale: 0.94 + p.value * 0.1 }] }));
    return (
        <Animated.View style={style}>
            <AI3DLogo size={size} shadow={false} />
        </Animated.View>
    );
}

function LoaderLabel({ text, color }) {
    const fade = useSharedValue(0);
    useEffect(() => {
        fade.value = withRepeat(withTiming(1, { duration: 950, easing: Easing.inOut(Easing.quad) }), -1, true);
        return () => cancelAnimation(fade);
    }, []);
    const style = useAnimatedStyle(() => ({ opacity: 0.5 + fade.value * 0.5 }));
    return <Animated.Text style={[styles.label, { color }, style]}>{text}</Animated.Text>;
}

/* Branded loader = rotating ring + centred 3D logo. Use inside cards / sheets. */
export function BrandLoader({ size = 72, label }) {
    return <Loader size={size} label={label} logo />;
}

export function FullScreenLoader({ label }) {
    const { colors } = useTheme();
    return (
        <View style={[styles.full, { backgroundColor: colors.background }]}>
            <BrandLoader size={84} label={label} />
        </View>
    );
}

const styles = StyleSheet.create({
    center: { alignItems: "center", justifyContent: "center", gap: 14 },
    full: { flex: 1, alignItems: "center", justifyContent: "center" },
    logoWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
    // Reanimated Text (not the app <Text>), so set the app font explicitly.
    label: { fontSize: 14, fontFamily: FONTS.semibold, letterSpacing: 0.2 },
});

export default Loader;
