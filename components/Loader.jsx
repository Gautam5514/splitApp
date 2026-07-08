import { useTheme } from "@/context/ThemeContext";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    cancelAnimation,
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

/**
 * Premium app loader — dual counter-rotating gradient arcs around a
 * breathing brand dot. Use <Loader /> inline (buttons, lists) or
 * <FullScreenLoader /> for whole-screen loading states.
 *
 *   <Loader size={20} color="#fff" />      // inline / on a button
 *   <Loader size={48} label="Loading…" />  // centered with caption
 *   <FullScreenLoader label="Gathering your insights…" />
 */
export function Loader({ size = 44, color, label }) {
    const { colors } = useTheme();
    const tint = color || colors.primary;

    const spin = useSharedValue(0);
    const spinBack = useSharedValue(0);
    const pulse = useSharedValue(0);

    useEffect(() => {
        spin.value = withRepeat(
            withTiming(1, { duration: 1100, easing: Easing.linear }),
            -1
        );
        spinBack.value = withRepeat(
            withTiming(1, { duration: 1700, easing: Easing.linear }),
            -1
        );
        pulse.value = withRepeat(
            withTiming(1, { duration: 820, easing: Easing.inOut(Easing.quad) }),
            -1,
            true
        );
        return () => {
            cancelAnimation(spin);
            cancelAnimation(spinBack);
            cancelAnimation(pulse);
        };
    }, []);

    const outerStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${spin.value * 360}deg` }],
    }));
    const innerStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${-spinBack.value * 360}deg` }],
    }));
    const dotStyle = useAnimatedStyle(() => ({
        transform: [{ scale: 0.55 + pulse.value * 0.5 }],
        opacity: 0.45 + pulse.value * 0.55,
    }));

    const stroke = Math.max(2.5, size * 0.085);
    const inner = size * 0.6;
    const dot = size * 0.2;

    return (
        <View style={styles.center}>
            <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
                {/* Outer arc */}
                <Animated.View
                    style={[
                        {
                            position: "absolute",
                            width: size,
                            height: size,
                            borderRadius: size / 2,
                            borderWidth: stroke,
                            borderColor: tint + "22",
                            borderTopColor: tint,
                            borderRightColor: tint,
                        },
                        outerStyle,
                    ]}
                />
                {/* Inner arc — counter rotation */}
                <Animated.View
                    style={[
                        {
                            position: "absolute",
                            width: inner,
                            height: inner,
                            borderRadius: inner / 2,
                            borderWidth: stroke * 0.85,
                            borderColor: "transparent",
                            borderBottomColor: tint,
                            borderLeftColor: tint + "88",
                        },
                        innerStyle,
                    ]}
                />
                {/* Breathing core */}
                <Animated.View
                    style={[
                        {
                            width: dot,
                            height: dot,
                            borderRadius: dot / 2,
                            backgroundColor: tint,
                        },
                        dotStyle,
                    ]}
                />
            </View>
            {label ? <LoaderLabel text={label} color={colors.textSecondary} /> : null}
        </View>
    );
}

function LoaderLabel({ text, color }) {
    const fade = useSharedValue(0);
    useEffect(() => {
        fade.value = withRepeat(
            withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
            -1,
            true
        );
        return () => cancelAnimation(fade);
    }, []);
    const style = useAnimatedStyle(() => ({ opacity: 0.5 + fade.value * 0.5 }));
    return (
        <Animated.Text style={[styles.label, { color }, style]}>{text}</Animated.Text>
    );
}

export function FullScreenLoader({ label }) {
    const { colors } = useTheme();
    return (
        <View style={[styles.full, { backgroundColor: colors.background }]}>
            <Loader size={56} label={label} />
        </View>
    );
}

const styles = StyleSheet.create({
    center: { alignItems: "center", justifyContent: "center", gap: 14 },
    full: { flex: 1, alignItems: "center", justifyContent: "center" },
    label: { fontSize: 14, fontWeight: "600", letterSpacing: 0.2 },
});

export default Loader;
