import { useTheme } from "@/context/ThemeContext";
import { TAB_BAR_HEIGHT, useTabBarLayout } from "@/hooks/useSafeSpacing";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Tabs, router } from "expo-router";
import AI3DLogo from "@/components/icons/AI3DLogo";
import { House, MessageCircle, Plus, UserRound } from "lucide-react-native";
import { useState } from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";

// ── Geometry ────────────────────────────────────────────────────────────────
// TAB_BAR_HEIGHT (58) = one button (48) + the pill's inner padding (5 top/bottom).
const BTN = 48;
const PILL_PAD = (TAB_BAR_HEIGHT - BTN) / 2;
const PLUS = TAB_BAR_HEIGHT; // the separate "+" circle is as tall as the pill

// Order inside the pill: Home → Chats → AI → Profile. Groups ("+") sits last,
// in its own circle. Every button shares the same look; AI is not a tab (it
// opens as a pushed screen), so it is never shown as "selected".
const ITEMS = [
    { key: "home", Icon: House, label: "Home", tab: "home" },
    { key: "chat", Icon: MessageCircle, label: "Chats", tab: "chat" },
    { key: "ai", label: "SplitEase AI assistant", href: "/ai-chat", logo: true },
    { key: "profile", Icon: UserRound, label: "Profile", tab: "profile" },
];

// Light and dark are designed separately rather than just inverted.
const palette = (isDark) =>
    isDark
        ? {
              pillBg: "rgba(22,22,26,0.72)",
              pillBorder: "rgba(255,255,255,0.10)",
              btnBg: "rgba(255,255,255,0.08)",
              icon: "rgba(255,255,255,0.92)",
              activeBg: "#FFFFFF",
              activeIcon: "#0B0B0F",
              blurTint: "dark",
              shadowOpacity: 0.45,
          }
        : {
              pillBg: "rgba(255,255,255,0.78)",
              pillBorder: "rgba(15,23,42,0.08)",
              btnBg: "rgba(15,23,42,0.05)",
              icon: "#1F2430",
              activeBg: "#12141A",
              activeIcon: "#FFFFFF",
              blurTint: "light",
              shadowOpacity: 0.16,
          };

const tap = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
};

function CircleButton({ active, onPress, label, children, c, style }) {
    return (
        <TouchableOpacity
            onPress={() => { tap(); onPress(); }}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: !!active }}
            style={[styles.btn, { backgroundColor: active ? c.activeBg : c.btnBg }, style]}
        >
            {children}
        </TouchableOpacity>
    );
}

// The AI button matches its neighbours: a normal theme-coloured circle that
// only turns black (its "active" look) while pressed. The 3D sphere swaps to
// the matching variant so it stays in sync with the circle behind it.
function AiTabButton({ c, label, onPress }) {
    const [pressed, setPressed] = useState(false);
    // On the light theme the resting circle is light → light sphere; pressed
    // circle is black → dark sphere. On dark theme it's mirrored.
    const dark = c.activeBg === "#FFFFFF" ? !pressed : pressed;
    return (
        <TouchableOpacity
            onPress={onPress}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: false }}
            style={[styles.btn, { backgroundColor: pressed ? c.activeBg : c.btnBg }]}
        >
            <AI3DLogo size={30} shadow={false} variant={dark ? "dark" : "light"} />
        </TouchableOpacity>
    );
}

export function CustomTabBar({ state, navigation }) {
    const { barBottom } = useTabBarLayout();
    const { theme } = useTheme();
    const c = palette(theme === "dark");
    const current = state.routes[state.index]?.name;

    return (
        <View pointerEvents="box-none" style={[styles.wrapper, { bottom: barBottom }]}>
            {/* ── Glass pill: Home · Chats · AI · Profile ───────────────── */}
            <View style={[styles.pillShadow, { shadowOpacity: c.shadowOpacity }]}>
                <BlurView
                    intensity={Platform.OS === "ios" ? 60 : 90}
                    tint={c.blurTint}
                    style={[styles.pill, { backgroundColor: c.pillBg, borderColor: c.pillBorder }]}
                >
                    {ITEMS.map(({ key, Icon, label, tab, href, logo }) => {
                        const active = !!tab && current === tab;
                        if (logo) {
                            // AI opens as a pushed screen (not a tab), so it is never
                            // "selected". It now matches its neighbours: a normal
                            // circle in the theme colour, turning black only while
                            // pressed — so it no longer looks permanently active.
                            return (
                                <AiTabButton
                                    key={key}
                                    c={c}
                                    label={label}
                                    onPress={() => { tap(); router.push(href); }}
                                />
                            );
                        }
                        return (
                            <CircleButton
                                key={key}
                                c={c}
                                active={active}
                                label={label}
                                onPress={() => (tab ? navigation.navigate(tab) : router.push(href))}
                            >
                                <Icon size={21} color={active ? c.activeIcon : c.icon} strokeWidth={active ? 2.5 : 2.1} />
                            </CircleButton>
                        );
                    })}
                </BlurView>
            </View>

            {/* ── Separate "+" circle → Trips (create / join groups) ───────── */}
            <View style={[styles.pillShadow, { shadowOpacity: c.shadowOpacity }]}>
                <BlurView
                    intensity={Platform.OS === "ios" ? 60 : 90}
                    tint={c.blurTint}
                    style={[styles.plusWrap, { backgroundColor: c.pillBg, borderColor: c.pillBorder }]}
                >
                    <CircleButton
                        c={c}
                        active={current === "trips"}
                        label="Trips and groups"
                        onPress={() => navigation.navigate("trips")}
                        style={styles.plusBtn}
                    >
                        <Plus size={24} color={current === "trips" ? c.activeIcon : c.icon} strokeWidth={2.4} />
                    </CircleButton>
                </BlurView>
            </View>
        </View>
    );
}

export default function TabsLayout() {
    return (
        <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
            <Tabs.Screen name="home" />
            <Tabs.Screen name="trips" />
            <Tabs.Screen name="chat" />
            <Tabs.Screen name="profile" />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: "absolute",
        left: 0,
        right: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        zIndex: 100,
    },
    pillShadow: {
        borderRadius: TAB_BAR_HEIGHT / 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 24,
        elevation: 12,
    },
    pill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: TAB_BAR_HEIGHT,
        padding: PILL_PAD,
        borderRadius: TAB_BAR_HEIGHT / 2,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: "hidden", // keeps the blur inside the rounded shape
    },
    btn: {
        width: BTN,
        height: BTN,
        borderRadius: BTN / 2,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    plusWrap: {
        width: PLUS,
        height: PLUS,
        borderRadius: PLUS / 2,
        padding: PILL_PAD,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: "hidden",
    },
    plusBtn: { width: BTN, height: BTN, borderRadius: BTN / 2 },
});
