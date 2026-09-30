import { useTheme } from "@/context/ThemeContext";
import { SCREEN_GUTTER } from "@/constants/layout";
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
 * Lightweight skeleton placeholders.
 *
 * One shared shimmer animation drives a whole screen (a single opacity pulse,
 * no per-block timers, no gradients) so it stays smooth and never laggy even
 * with many blocks on screen.
 *
 *   <Skeleton width={120} height={16} />
 *   <SkeletonCircle size={44} />
 *   <StatCardsSkeleton />        // matches the home stat grid
 *   <GroupListSkeleton count={4} />
 *   <ChartSkeleton />
 */

// A single, app-wide shimmer clock. Reused via a hook so every skeleton on a
// screen pulses in sync from ONE animation instead of dozens.
function useShimmer() {
    const v = useSharedValue(0);
    useEffect(() => {
        v.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true);
        return () => cancelAnimation(v);
    }, []);
    return v;
}

export function Skeleton({ width, height = 14, radius = 8, style, shimmer }) {
    const { colors, theme } = useTheme();
    const isDark = theme === "dark";
    const local = useShimmer();
    const v = shimmer || local;
    const base = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)";

    const anim = useAnimatedStyle(() => ({ opacity: 0.45 + v.value * 0.4 }));

    return (
        <Animated.View
            style={[
                { width, height, borderRadius: radius, backgroundColor: base },
                anim,
                style,
            ]}
        />
    );
}

export function SkeletonCircle({ size = 44, style, shimmer }) {
    return <Skeleton width={size} height={size} radius={size / 2} style={style} shimmer={shimmer} />;
}

/* ── Presets that mirror real layouts ───────────────────────────────────── */

/** Home: 2×2 stat tiles. */
export function StatCardsSkeleton() {
    const shimmer = useShimmer();
    const styles = usePresetStyles();
    const Tile = () => (
        <View style={styles.statTile}>
            <View style={styles.rowBetween}>
                <Skeleton width={70} height={10} shimmer={shimmer} />
                <SkeletonCircle size={30} shimmer={shimmer} />
            </View>
            <Skeleton width={90} height={22} radius={6} style={{ marginTop: 10 }} shimmer={shimmer} />
            <Skeleton width={60} height={9} style={{ marginTop: 10 }} shimmer={shimmer} />
        </View>
    );
    return (
        <View style={styles.statBlock}>
            <View style={styles.statRow}><Tile /><Tile /></View>
            <View style={styles.statRow}><Tile /><Tile /></View>
        </View>
    );
}

/** Trips / home / chats: rounded list rows. */
export function GroupListSkeleton({ count = 4 }) {
    const shimmer = useShimmer();
    const styles = usePresetStyles();
    return (
        <View style={styles.list}>
            {Array.from({ length: count }).map((_, i) => (
                <View key={i} style={styles.card}>
                    <View style={styles.rowStart}>
                        <SkeletonCircle size={44} shimmer={shimmer} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Skeleton width="60%" height={14} shimmer={shimmer} />
                            <Skeleton width="40%" height={10} style={{ marginTop: 8 }} shimmer={shimmer} />
                        </View>
                        <Skeleton width={54} height={22} radius={11} shimmer={shimmer} />
                    </View>
                </View>
            ))}
        </View>
    );
}

/** Simple contact / row list (chats, members). */
export function RowListSkeleton({ count = 6 }) {
    const shimmer = useShimmer();
    const styles = usePresetStyles();
    return (
        <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
            {Array.from({ length: count }).map((_, i) => (
                <View key={i} style={styles.rowStart}>
                    <SkeletonCircle size={48} shimmer={shimmer} />
                    <View style={{ flex: 1, marginLeft: 12, paddingVertical: 14 }}>
                        <Skeleton width="55%" height={13} shimmer={shimmer} />
                        <Skeleton width="75%" height={10} style={{ marginTop: 8 }} shimmer={shimmer} />
                    </View>
                    <Skeleton width={34} height={10} shimmer={shimmer} />
                </View>
            ))}
        </View>
    );
}

/** Chart block placeholder. */
export function ChartSkeleton({ height = 200 }) {
    const shimmer = useShimmer();
    const styles = usePresetStyles();
    return (
        <View style={styles.card}>
            <View style={styles.rowStart}>
                <SkeletonCircle size={16} shimmer={shimmer} />
                <Skeleton width="55%" height={11} style={{ marginLeft: 8 }} shimmer={shimmer} />
            </View>
            <Skeleton width="100%" height={height} radius={14} style={{ marginTop: 14 }} shimmer={shimmer} />
        </View>
    );
}

/** Whole-screen home skeleton (stats + a couple of group rows). */
export function HomeSkeleton() {
    return (
        <View style={{ paddingTop: 8 }}>
            <StatCardsSkeleton />
            <View style={{ height: 8 }} />
            <GroupListSkeleton count={3} />
        </View>
    );
}

function usePresetStyles() {
    const { colors, theme } = useTheme();
    const isDark = theme === "dark";
    return StyleSheet.create({
        statBlock: { paddingHorizontal: SCREEN_GUTTER, marginBottom: 24 },
        statRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
        statTile: {
            flex: 1, borderRadius: 18, padding: 15,
            backgroundColor: colors.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)",
        },
        list: { paddingHorizontal: SCREEN_GUTTER, gap: 12 },
        card: {
            borderRadius: 22, padding: 16,
            backgroundColor: colors.card,
            borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
        },
        rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
        rowStart: { flexDirection: "row", alignItems: "center" },
    });
}

export default Skeleton;
