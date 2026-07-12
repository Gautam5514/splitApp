import { ACCENT_PRESETS, PREMIUM_THEMES, STORE_FONTS } from "@/constants/appearance";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import { router } from "expo-router";
import { ArrowLeft, Check, Coins, Crown, Lock, Palette, RotateCcw, Sparkles, Type } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ThemeStoreScreen() {
    const { colors, theme, accentId, premiumThemeId, setAccent, setPremiumTheme, resetAppearance } = useTheme();
    const styles = getStyles(colors);

    // Spendable balance + everything already purchased (owned forever).
    const [coins, setCoins] = useState(null);
    const [unlockedItems, setUnlockedItems] = useState([]);
    const [buying, setBuying] = useState(null); // itemId of in-flight purchase
    const [pendingPurchase, setPendingPurchase] = useState(null); // { itemId, name, cost }

    useEffect(() => {
        api.get("/referrals/me")
            .then((res) => {
                setCoins(res.data?.coins ?? 0);
                setUnlockedItems(res.data?.unlockedItems ?? []);
            })
            .catch(() => setCoins(0));
    }, []);

    const owns = (itemId) => unlockedItems.includes(itemId);

    const requestPurchase = (purchase) => {
        if (buying) return;
        const balance = coins ?? 0;
        if (balance < purchase.cost) {
            Alert.alert(
                "Not enough coins",
                `You need ${purchase.cost - balance} more coins to unlock ${purchase.name}. Earn coins via Referrals & Rewards on your profile.`
            );
            return;
        }
        setPendingPurchase(purchase);
    };

    const confirmPurchase = async () => {
        if (!pendingPurchase || buying) return;
        const { itemId, name, onApply } = pendingPurchase;
        setBuying(itemId);
        try {
            const res = await api.post("/referrals/purchase", { itemId });
            setCoins(res.data?.coins ?? coins);
            setUnlockedItems(res.data?.unlockedItems ?? [...unlockedItems, itemId]);
            setPendingPurchase(null);
            if (onApply) {
                onApply();
            } else {
                Alert.alert("Unlocked", `${name} is yours forever.`);
            }
        } catch (err) {
            Alert.alert("Purchase failed", err?.response?.data?.message || "Please try again.");
        } finally {
            setBuying(null);
        }
    };

    const applyPremium = (t) => {
        setPremiumTheme(t.id);
    };

    const handlePremiumPress = (t) => {
        const itemId = `theme:${t.id}`;
        if (premiumThemeId === t.id) return;
        if (owns(itemId)) {
            applyPremium(t);
            return;
        }
        requestPurchase({ itemId, name: t.name, cost: t.cost, onApply: () => applyPremium(t) });
    };

    const handleFontPress = (f) => {
        const itemId = `font:${f.id}`;
        if (owns(itemId)) return;
        requestPurchase({ itemId, name: f.name, cost: f.cost });
    };

    const handleReset = () => {
        resetAppearance();
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <ArrowLeft size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Theme Store</Text>
                <View style={styles.coinPill}>
                    {coins == null ? (
                        <ActivityIndicator size="small" color="#B45309" />
                    ) : (
                        <>
                            <Coins size={14} color="#B45309" />
                            <Text style={styles.coinText}>{coins}</Text>
                        </>
                    )}
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.intro}>
                    Personalize SplitEase with accent colors and premium themes. Unlocks are one-time coin purchases — yours forever.
                </Text>

                {/* Free accent colors */}
                <View style={styles.sectionHead}>
                    <Sparkles size={15} color={colors.primary} />
                    <Text style={styles.sectionLabel}>Accent color</Text>
                    <Text style={styles.sectionTag}>FREE</Text>
                </View>
                <View style={styles.accentGrid}>
                    {ACCENT_PRESETS.map((a) => {
                        const active = !premiumThemeId && accentId === a.id;
                        const swatch = theme === "dark" ? a.primaryDark : a.primary;
                        return (
                            <TouchableOpacity
                                key={a.id}
                                style={[styles.accentCard, active && { borderColor: colors.primary }]}
                                onPress={() => setAccent(a.id)}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.accentDot, { backgroundColor: swatch }]}>
                                    {active && <Check size={14} color="#fff" strokeWidth={3} />}
                                </View>
                                <Text style={styles.accentName} numberOfLines={2}>{a.name}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Premium themes */}
                <View style={styles.sectionHead}>
                    <Crown size={15} color={colors.primary} />
                    <Text style={styles.sectionLabel}>Premium themes</Text>
                </View>
                <View style={styles.premiumList}>
                    {PREMIUM_THEMES.map((t) => {
                        const itemId = `theme:${t.id}`;
                        const owned = owns(itemId);
                        const active = premiumThemeId === t.id;
                        const busy = buying === itemId;
                        return (
                            <TouchableOpacity
                                key={t.id}
                                style={[styles.premiumCard, active && { borderColor: colors.primary }]}
                                onPress={() => handlePremiumPress(t)}
                                activeOpacity={0.85}
                            >
                                {/* Mini theme mock */}
                                <View style={[styles.mock, { backgroundColor: t.bg }]}>
                                    <View style={styles.mockRow}>
                                        <Text style={styles.mockBrand}>splitease</Text>
                                        <View style={[styles.mockDot, { backgroundColor: t.primary }]} />
                                    </View>
                                    <View style={[styles.mockLine, { width: "60%" }]} />
                                    <View style={[styles.mockLine, { width: "40%" }]} />
                                    <View style={[styles.mockCard, { backgroundColor: t.card, borderColor: t.border }]} />
                                </View>

                                <View style={styles.premiumMeta}>
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                        <Text style={styles.premiumName} numberOfLines={1}>{t.name}</Text>
                                        <Text style={styles.premiumDesc} numberOfLines={1}>{t.desc}</Text>
                                    </View>
                                    {active ? (
                                        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                                            <Check size={11} color="#fff" strokeWidth={3} />
                                            <Text style={styles.badgeTextOn}>Active</Text>
                                        </View>
                                    ) : owned ? (
                                        <View style={[styles.badge, styles.badgeOwned]}>
                                            <Text style={styles.badgeTextOwned}>Apply</Text>
                                        </View>
                                    ) : (
                                        <View style={[styles.badge, styles.badgeLocked]}>
                                            {busy ? (
                                                <ActivityIndicator size="small" color="#92400E" />
                                            ) : (
                                                <>
                                                    <Lock size={10} color="#92400E" />
                                                    <Text style={styles.badgeTextLocked}>{t.cost}</Text>
                                                </>
                                            )}
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                <Text style={styles.hint}>
                    Premium themes are dark designs — applying one switches the app to dark mode.
                </Text>

                {/* Fonts */}
                <View style={styles.sectionHead}>
                    <Type size={15} color={colors.primary} />
                    <Text style={styles.sectionLabel}>Fonts</Text>
                </View>
                <View style={styles.fontList}>
                    {STORE_FONTS.map((f) => {
                        const itemId = `font:${f.id}`;
                        const owned = owns(itemId);
                        const busy = buying === itemId;
                        return (
                            <TouchableOpacity
                                key={f.id}
                                style={styles.fontRow}
                                onPress={() => handleFontPress(f)}
                                activeOpacity={owned ? 1 : 0.8}
                            >
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text style={styles.fontName}>{f.name}</Text>
                                    <Text style={styles.fontDesc}>{f.desc}</Text>
                                </View>
                                {owned ? (
                                    <View style={[styles.badge, styles.badgeOwned]}>
                                        <Check size={10} color="#059669" strokeWidth={3} />
                                        <Text style={styles.badgeTextOwned}>Owned</Text>
                                    </View>
                                ) : (
                                    <View style={[styles.badge, styles.badgeLocked]}>
                                        {busy ? (
                                            <ActivityIndicator size="small" color="#92400E" />
                                        ) : (
                                            <>
                                                <Coins size={10} color="#92400E" />
                                                <Text style={styles.badgeTextLocked}>{f.cost}</Text>
                                            </>
                                        )}
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
                <Text style={styles.hint}>
                    Font unlocks are account-wide and currently render on the SplitEase web app.
                </Text>

                {/* Reset */}
                <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.8}>
                    <RotateCcw size={14} color={colors.textSecondary} />
                    <Text style={styles.resetText}>Reset to default appearance</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Purchase confirmation */}
            <Modal visible={!!pendingPurchase} transparent animationType="fade" onRequestClose={() => setPendingPurchase(null)}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalIcon}>
                            <Palette size={22} color={colors.primary} />
                        </View>
                        <Text style={styles.modalTitle}>Unlock {pendingPurchase?.name}?</Text>
                        <Text style={styles.modalDesc}>
                            This spends {pendingPurchase?.cost} coins once — after that it is yours forever.
                        </Text>
                        <View style={styles.modalMath}>
                            <Text style={styles.modalMathText}>
                                Balance after: {(coins ?? 0) - (pendingPurchase?.cost ?? 0)} coins
                            </Text>
                        </View>
                        <View style={styles.modalBtns}>
                            <TouchableOpacity
                                style={styles.modalCancel}
                                onPress={() => setPendingPurchase(null)}
                                disabled={!!buying}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalConfirm, { backgroundColor: colors.primary }]}
                                onPress={confirmPurchase}
                                disabled={!!buying}
                                activeOpacity={0.8}
                            >
                                {buying ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.modalConfirmText}>Unlock</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
    coinPill: {
        flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, height: 30,
        borderRadius: 15, backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: "#FCD34D", minWidth: 52, justifyContent: "center",
    },
    coinText: { fontSize: 12.5, fontWeight: "800", color: "#92400E" },

    scroll: { padding: 16, paddingBottom: 50 },
    intro: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 19, marginBottom: 20 },

    sectionHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, marginTop: 6, marginLeft: 2 },
    sectionLabel: {
        fontSize: 12, fontWeight: "700", color: colors.textSecondary,
        textTransform: "uppercase", letterSpacing: 0.5, flex: 1,
    },
    sectionTag: { fontSize: 10, fontWeight: "800", color: "#059669", letterSpacing: 1 },

    accentGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 22 },
    accentCard: {
        width: "30.5%", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 6,
        backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10,
    },
    accentDot: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    accentName: { fontSize: 10.5, fontWeight: "700", color: colors.textSecondary, textAlign: "center", lineHeight: 14 },

    premiumList: { gap: 12, marginBottom: 10 },
    premiumCard: {
        borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, overflow: "hidden",
        backgroundColor: colors.card,
    },
    mock: { padding: 14, gap: 6 },
    mockRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
    mockBrand: { color: "#fff", fontSize: 13, fontWeight: "700", textTransform: "lowercase" },
    mockDot: { width: 14, height: 14, borderRadius: 7 },
    mockLine: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.14)" },
    mockCard: { height: 20, width: 64, borderRadius: 6, borderWidth: 1, marginTop: 4 },
    premiumMeta: {
        flexDirection: "row", alignItems: "center", gap: 10,
        paddingHorizontal: 12, paddingVertical: 10,
    },
    premiumName: { fontSize: 14, fontWeight: "800", color: colors.text },
    premiumDesc: { fontSize: 11.5, color: colors.textSecondary, marginTop: 1 },

    badge: {
        flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, height: 26,
        borderRadius: 13, justifyContent: "center", minWidth: 52,
    },
    badgeTextOn: { fontSize: 11, fontWeight: "800", color: "#fff" },
    badgeOwned: { backgroundColor: "rgba(16,185,129,0.12)", borderWidth: 1, borderColor: "rgba(16,185,129,0.35)" },
    badgeTextOwned: { fontSize: 11, fontWeight: "800", color: "#059669" },
    badgeLocked: { backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: "#FCD34D" },
    badgeTextLocked: { fontSize: 11, fontWeight: "800", color: "#92400E" },

    fontList: { gap: 8, marginBottom: 10 },
    fontRow: {
        flexDirection: "row", alignItems: "center", gap: 10,
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
    },
    fontName: { fontSize: 13.5, fontWeight: "700", color: colors.text },
    fontDesc: { fontSize: 11.5, color: colors.textSecondary, marginTop: 1 },

    hint: { fontSize: 11.5, color: colors.textSecondary, lineHeight: 16, marginBottom: 22, marginLeft: 2 },

    resetBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
        borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 12, marginTop: 4,
    },
    resetText: { fontSize: 12.5, fontWeight: "700", color: colors.textSecondary },

    modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 28 },
    modalCard: {
        width: "100%", maxWidth: 340, backgroundColor: colors.card, borderRadius: 16,
        padding: 20, alignItems: "center", borderWidth: 1, borderColor: colors.border,
    },
    modalIcon: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight,
        alignItems: "center", justifyContent: "center", marginBottom: 12,
    },
    modalTitle: { fontSize: 16.5, fontWeight: "800", color: colors.text, textAlign: "center" },
    modalDesc: { fontSize: 12.5, color: colors.textSecondary, textAlign: "center", lineHeight: 18, marginTop: 6 },
    modalMath: {
        marginTop: 12, backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: "#FCD34D",
        borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    },
    modalMathText: { fontSize: 12, fontWeight: "700", color: "#92400E" },
    modalBtns: { flexDirection: "row", gap: 10, marginTop: 16, alignSelf: "stretch" },
    modalCancel: {
        flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
        paddingVertical: 11, alignItems: "center",
    },
    modalCancelText: { fontSize: 13.5, fontWeight: "700", color: colors.textSecondary },
    modalConfirm: { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: "center", justifyContent: "center" },
    modalConfirmText: { fontSize: 13.5, fontWeight: "800", color: "#fff" },
});
