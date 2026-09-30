import AI3DLogo from "@/components/icons/AI3DLogo";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

/**
 * Animated 3D "thinking" state for SplitEase AI.
 *
 *  • the black 3D sphere breathes (subtle scale) and floats up and down
 *  • two light particles orbit it on a tilted ring — reads as 3D depth:
 *    they grow + brighten when passing "in front", shrink + fade "behind"
 *  • a soft halo pulses behind the sphere
 *
 * Everything runs on the native driver (transforms/opacity only), so it stays
 * smooth even while the JS thread is busy waiting for the AI response.
 */
export default function AIThinking({ size = 46, color = "#FFFFFF", haloColor = "rgba(120,130,150,0.35)" }) {
    const breathe = useRef(new Animated.Value(0)).current;
    const orbit = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const b = Animated.loop(
            Animated.sequence([
                Animated.timing(breathe, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(breathe, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        );
        const o = Animated.loop(
            Animated.timing(orbit, { toValue: 1, duration: 1600, easing: Easing.linear, useNativeDriver: true })
        );
        b.start();
        o.start();
        return () => {
            b.stop();
            o.stop();
        };
    }, [breathe, orbit]);

    const box = size * 1.5;
    const rx = size * 0.66; // orbit radius (horizontal)
    const ry = size * 0.2; // flattened vertically → tilted ring
    const dot = Math.max(4, size * 0.12);

    // Sample the ellipse so the particle follows it (x = cos, y = sin).
    const STEPS = 24;
    const inputRange = Array.from({ length: STEPS + 1 }, (_, i) => i / STEPS);
    // `layer`: "front" draws the particle only while it's in front of the
    // sphere, "back" only while it's behind — render back layers before the
    // sphere and front layers after it, so the orbit truly wraps around it.
    const particle = (phase, layer) => {
        const at = (fn) => inputRange.map((p) => fn(2 * Math.PI * ((p + phase) % 1)));
        const front = at((a) => (Math.sin(a) + 1) / 2); // 1 = nearest to the viewer
        const visible = at((a) => (layer === "front" ? (Math.sin(a) >= 0 ? 1 : 0) : Math.sin(a) < 0 ? 1 : 0));
        return {
            transform: [
                { translateX: orbit.interpolate({ inputRange, outputRange: at((a) => Math.cos(a) * rx) }) },
                { translateY: orbit.interpolate({ inputRange, outputRange: at((a) => Math.sin(a) * ry) }) },
                { scale: orbit.interpolate({ inputRange, outputRange: front.map((f) => 0.55 + f * 0.65) }) },
            ],
            opacity: orbit.interpolate({ inputRange, outputRange: front.map((f, i) => (0.25 + f * 0.75) * visible[i]) }),
        };
    };

    const float = breathe.interpolate({ inputRange: [0, 1], outputRange: [size * 0.04, -size * 0.04] });
    const scale = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.03] });
    const haloScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] });
    const haloOpacity = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] });

    const dotStyle = { width: dot, height: dot, borderRadius: dot / 2, backgroundColor: color, shadowColor: color, shadowOpacity: 0.9, shadowRadius: dot, shadowOffset: { width: 0, height: 0 } };

    return (
        <View style={[styles.box, { width: box, height: box }]} accessibilityLabel="SplitEase AI is thinking" accessibilityRole="progressbar">
            <Animated.View
                style={[
                    styles.center,
                    { width: size * 1.25, height: size * 1.25, borderRadius: size, backgroundColor: haloColor },
                    { opacity: haloOpacity, transform: [{ scale: haloScale }] },
                ]}
            />
            {/* Particles while behind the sphere */}
            <Animated.View style={[styles.center, dotStyle, particle(0, "back")]} />
            <Animated.View style={[styles.center, dotStyle, particle(0.5, "back")]} />
            <Animated.View style={[styles.center, { transform: [{ translateY: float }, { scale }] }]}>
                <AI3DLogo size={size} shadow={false} />
            </Animated.View>
            {/* Particles while in front of the sphere */}
            <Animated.View style={[styles.center, dotStyle, particle(0, "front")]} />
            <Animated.View style={[styles.center, dotStyle, particle(0.5, "front")]} />
        </View>
    );
}

/** Three bouncing dots — pairs with AIThinking inside the reply bubble. */
export function TypingDots({ color = "#888", size = 7 }) {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }));
        a.start();
        return () => a.stop();
    }, [v]);
    // Each dot hops once per cycle, staggered, then rests.
    const hop = (start) => ({
        transform: [{ translateY: v.interpolate({ inputRange: [0, start, start + 0.15, start + 0.3, 1], outputRange: [0, 0, -size * 0.7, 0, 0] }) }],
        opacity: v.interpolate({ inputRange: [0, start, start + 0.15, start + 0.3, 1], outputRange: [0.35, 0.35, 1, 0.35, 0.35] }),
    });
    const base = { width: size, height: size, borderRadius: size / 2, backgroundColor: color };
    return (
        <View style={styles.dots}>
            {[0, 0.15, 0.3].map((start) => (
                <Animated.View key={start} style={[base, hop(start)]} />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    box: { alignItems: "center", justifyContent: "center" },
    center: { position: "absolute" },
    dots: { flexDirection: "row", alignItems: "center", gap: 5, height: 18 },
});
