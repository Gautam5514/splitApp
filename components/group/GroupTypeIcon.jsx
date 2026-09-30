import { groupTypeMeta } from "@/lib/groupPresets";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

/**
 * Glossy 3D tile for a group type (same look as web): light-to-dark
 * gradient body, a soft highlight across the top, a darker bottom edge for
 * depth, and a coloured drop shadow.
 *
 * muted: greyed out (e.g. types you can't switch to).
 */
export default function GroupTypeIcon({ type, size = 48, muted = false, style }) {
    const meta = groupTypeMeta(type);
    const [light, mid, dark] = muted ? ["#D4D4D8", "#A1A1AA", "#71717A"] : meta.palette;
    const radius = Math.round(size * 0.3);
    const Icon = meta.Icon;

    return (
        <View
            style={[
                {
                    width: size,
                    height: size,
                    borderRadius: radius,
                    shadowColor: muted ? "#000" : mid,
                    shadowOffset: { width: 0, height: Math.round(size * 0.14) },
                    shadowOpacity: muted ? 0 : 0.45,
                    shadowRadius: Math.round(size * 0.18),
                    elevation: muted ? 0 : 6,
                    opacity: muted ? 0.5 : 1,
                },
                style,
            ]}
        >
            <LinearGradient
                colors={[light, mid, dark]}
                locations={[0, 0.5, 1]}
                start={{ x: 0.15, y: 0 }}
                end={{ x: 0.85, y: 1 }}
                style={[styles.fill, { borderRadius: radius }]}
            >
                {/* Darker bottom edge = thickness */}
                <LinearGradient
                    colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.22)"]}
                    start={{ x: 0, y: 0.55 }}
                    end={{ x: 0, y: 1 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
                />
                {/* Glossy highlight across the top */}
                <LinearGradient
                    colors={["rgba(255,255,255,0.6)", "rgba(255,255,255,0)"]}
                    style={{
                        position: "absolute",
                        top: size * 0.05,
                        left: size * 0.07,
                        right: size * 0.07,
                        height: size * 0.46,
                        borderRadius: Math.round(radius * 0.85),
                    }}
                />
                {/* Top rim light */}
                <View style={[StyleSheet.absoluteFill, { borderRadius: radius, borderTopWidth: 1.2, borderColor: "rgba(255,255,255,0.45)" }]} />
                <Icon size={Math.round(size * 0.46)} color="#fff" strokeWidth={2.3} />
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    fill: { flex: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
