import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/context/ThemeContext";
import { Tabs, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Home, MessageCircle, Plus, Sparkles, User } from "lucide-react-native";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useRef } from "react";

const ONBOARDING_KEY = "onboarding_seen_v1";

function CustomTabBar({ state, navigation }) {
    const insets = useSafeAreaInsets();
    const { colors, theme } = useTheme();
    const isDark = theme === "dark";

    const currentRoute = state.routes[state.index]?.name;
    const isTripsActive = currentRoute === "trips";

    const pillTabs = [
        { name: "home", Icon: Home },
        { name: "chat", Icon: MessageCircle },
        { name: "profile", Icon: User },
    ];

    // Apple-style Glassmorphism pill background
    const pillBg = isDark
        ? "rgba(28, 28, 32, 0.45)"
        : "rgba(255, 255, 255, 0.65)";
    const pillBorder = isDark
        ? "rgba(255,255,255,0.15)"
        : "rgba(0,0,0,0.08)";

    // Active oval inside the pill
    const activeOvalBg = isDark
        ? "rgba(255,255,255,0.15)"
        : "rgba(0,0,0,0.08)";

    const inactiveIcon = isDark ? "rgba(255,255,255,0.40)" : "rgba(0,0,0,0.45)";

    return (
        <View
            pointerEvents="box-none"
            style={[styles.barWrapper, { bottom: Math.max(insets.bottom, 8) + 14 }]}
        >
            {/* ── Apple-style Glassmorphism Pill ──────────────────────────────── */}
            <View style={styles.pillShadowWrapper}>
                <BlurView
                    intensity={isDark ? 60 : 80}
                    tint={isDark ? "dark" : "light"}
                    style={[styles.pill, { backgroundColor: pillBg, borderColor: pillBorder }]}
                >
                    {pillTabs.map(({ name, Icon }) => {
                        const active = currentRoute === name;
                        return (
                            <TouchableOpacity
                                key={name}
                                style={[
                                    styles.tabItem,
                                    active && [
                                        styles.tabItemActive,
                                        { backgroundColor: activeOvalBg }
                                    ],
                                ]}
                                onPress={() => navigation.navigate(name)}
                                activeOpacity={0.7}
                            >
                                <Icon
                                    size={28}
                                    color={active ? colors.primary : inactiveIcon}
                                    strokeWidth={active ? 2.5 : 2}
                                />
                            </TouchableOpacity>
                        );
                    })}
                </BlurView>
            </View>

            {/* ── Holographic circle — Trips ──────────────────────── */}
            <TouchableOpacity
                onPress={() => navigation.navigate("trips")}
                activeOpacity={0.8}
                style={[styles.circleWrap, isTripsActive && styles.circleWrapActive]}
            >
                {/* Outer iridescent ring (matches reference pearl/glass edge) */}
                <LinearGradient
                    colors={["#5EFCE8", "#736EFE", "#C3CEFF", "#67E8F9"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.circleOuter}
                >
                    {/* Inner face — slightly inset, same gradient shifted */}
                    <LinearGradient
                        colors={["#A5F3FC", "#818CF8", "#C084FC"]}
                        start={{ x: 0.2, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.circleInner}
                    >
                        <Plus size={28} color="white" strokeWidth={2.8} />
                    </LinearGradient>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

export default function TabsLayout() {
    const insets = useSafeAreaInsets();
    const hasNavigatedRef = useRef(false);

    useEffect(() => {
        const checkOnboarding = async () => {
            try {
                const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
                if (!seen && !hasNavigatedRef.current) {
                    hasNavigatedRef.current = true;
                    router.push("/onboarding");
                }
            } catch {}
        };
        checkOnboarding();
    }, []);

    return (
        <View style={{ flex: 1 }}>
            <Tabs
                tabBar={(props) => <CustomTabBar {...props} />}
                screenOptions={{ headerShown: false }}
            >
                <Tabs.Screen name="home" />
                <Tabs.Screen name="trips" />
                <Tabs.Screen name="chat" />
                <Tabs.Screen name="profile" />
            </Tabs>

            {/* AI Sparkles FAB */}
            <TouchableOpacity
                style={[styles.fab, { bottom: insets.bottom + 108 }]}
                onPress={() => router.push("/ai-chat")}
                activeOpacity={0.82}
            >
                <Sparkles size={20} color="white" />
            </TouchableOpacity>
        </View>
    );
}

const CIRCLE_SIZE = 60;

const styles = StyleSheet.create({
    barWrapper: {
        position: "absolute",
        left: 12,
        right: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 8,
        zIndex: 100,
    },

    /* ── Glass pill ─────────────────────────────────────────── */
    pillShadowWrapper: {
        flex: 1,
        borderRadius: 40,
        // Depth shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: Platform.OS === "ios" ? 0.14 : 0.22,
        shadowRadius: 28,
        elevation: 14,
    },
    pill: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 40,
        minHeight: 70,
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderWidth: 0.5,
        gap: 3,
        overflow: "hidden", // Required for blur to stay within borders
    },
    tabItem: {
        flex: 1,
        minWidth: 0,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderRadius: 30,
    },
    tabItemActive: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.10,
        shadowRadius: 6,
        elevation: 3,
    },
    /* ── Holographic circle ─────────────────────────────────── */
    circleWrap: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: CIRCLE_SIZE / 2,
        flexShrink: 0,
        shadowColor: "#818CF8",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.36,
        shadowRadius: 14,
        elevation: 10,
    },
    circleWrapActive: {
        shadowOpacity: 0.54,
        shadowRadius: 18,
    },
    circleOuter: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: CIRCLE_SIZE / 2,
        padding: 2,
        justifyContent: "center",
        alignItems: "center",
    },
    circleInner: {
        flex: 1,
        width: "100%",
        borderRadius: (CIRCLE_SIZE - 6) / 2,
        justifyContent: "center",
        alignItems: "center",
    },

    /* ── AI FAB ─────────────────────────────────────────────── */
    fab: {
        position: "absolute",
        right: 18,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#10B981",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#10B981",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.38,
        shadowRadius: 10,
        elevation: 8,
        zIndex: 200,
    },
});
