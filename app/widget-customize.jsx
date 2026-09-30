import { SCREEN_GUTTER } from "@/constants/layout";
import { PillButton, PillInput, ScreenHeader, SectionLabel } from "@/components/ui/Design";
import { useTheme } from "@/context/ThemeContext";
import { useBottomSpacing } from "@/hooks/useSafeSpacing";
import { getWidgetCustomization, promptAddBalanceWidget, saveWidgetCustomization } from "@/lib/homeScreenWidget";
import { WIDGET_STYLES } from "@/widgets/SplitEaseBalanceWidget";
import { Check } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient";
import { Alert } from "@/lib/alert";
import { ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ui/Typography";
import { SafeAreaView } from "react-native-safe-area-context";

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

// Sample balance used only for the on-screen previews.
const SAMPLE = { totalOwe: 1250, totalOwed: 3800 };

export default function WidgetCustomizeScreen() {
    const { colors, theme } = useTheme();
    const isDark = theme === "dark";
    const styles = getStyles(colors, isDark);
    const bottomSpacing = useBottomSpacing(32);

    const [style, setStyle] = useState("balance");
    const [amount, setAmount] = useState("");
    const [label, setLabel] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            const c = await getWidgetCustomization();
            setStyle(c.style);
            setAmount(c.amount != null ? String(c.amount) : "");
            setLabel(c.label || "");
        })();
    }, []);

    const previewData = useMemo(() => ({
        amount: amount === "" ? null : Number(amount),
        label: label.trim(),
    }), [amount, label]);

    const save = async () => {
        try {
            setSaving(true);
            await saveWidgetCustomization({ style, amount, label: label.trim(), showBalance: true });
            const added = await promptAddBalanceWidget();
            if (!added) {
                Alert.alert(
                    "Saved",
                    "Your widget style is saved. To place it: long-press the home screen → Widgets → SplitEase, or it updates automatically if already added."
                );
            }
        } catch {
            Alert.alert("Widget unavailable", "Install a new Android app build first. Home-screen widgets aren't available in Expo Go.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <ScreenHeader title="Home Widget" back />

            <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomSpacing }]} showsVerticalScrollIndicator={false}>
                <Text style={styles.intro}>
                    Add your own amount and a short label, pick a design you love, then add it to your home screen.
                </Text>

                {/* Custom inputs */}
                <SectionLabel>Your details</SectionLabel>
                <View style={styles.inputs}>
                    <PillInput
                        placeholder="Amount (e.g. 50000)"
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ""))}
                    />
                    <PillInput
                        placeholder="Label (e.g. Vacation fund)"
                        value={label}
                        onChangeText={setLabel}
                        maxLength={26}
                    />
                </View>

                {/* Design picker with live previews */}
                <SectionLabel>Choose a design</SectionLabel>
                <View style={styles.designList}>
                    {WIDGET_STYLES.map((d) => {
                        const selected = style === d.id;
                        return (
                            <TouchableOpacity
                                key={d.id}
                                activeOpacity={0.9}
                                onPress={() => setStyle(d.id)}
                                style={[styles.designCard, selected && styles.designCardActive]}
                            >
                                <View style={styles.designHead}>
                                    <Text style={styles.designLabel}>{d.label}</Text>
                                    <View style={[styles.radio, selected && styles.radioActive]}>
                                        {selected && <Check size={13} color={colors.onPrimary} strokeWidth={3} />}
                                    </View>
                                </View>
                                <WidgetPreview style={d.id} custom={previewData} colors={colors} isDark={isDark} />
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <PillButton label="Save & add to home screen" onPress={save} loading={saving} disabled={saving} style={styles.saveBtn} />
                <Text style={styles.note}>Widgets are available on Android. The balance updates automatically as you add expenses.</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

/* ── On-screen previews that mirror each home-screen widget design ──────── */
function WidgetPreview({ style, custom, colors, isDark }) {
    const c = isDark
        ? { bg: "#090D18", panel: "#131927", text: "#F8FAFC", muted: "#94A3B8", line: "#283244" }
        : { bg: "#F8FAFC", panel: "#FFFFFF", text: "#0F172A", muted: "#64748B", line: "#E2E8F0" };
    const net = SAMPLE.totalOwed - SAMPLE.totalOwe;
    const amount = custom?.amount != null ? custom.amount : net;
    const label = custom?.label || "Net balance";
    const s = previewStyles(c);

    if (style === "gradient") {
        return (
            <ExpoLinearGradient colors={["#6366F1", "#22D3EE"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.shellGrad}>
                <View style={s.rowBetween}>
                    <Text style={s.brandWhite}>SplitEase</Text>
                    <Text style={s.tapWhite}>Tap ›</Text>
                </View>
                <View>
                    <Text style={s.gradLabel}>{label.toUpperCase()}</Text>
                    <Text style={s.gradAmount}>{inr(amount)}</Text>
                </View>
            </ExpoLinearGradient>
        );
    }
    if (style === "minimal") {
        return (
            <View style={[s.shell, { alignItems: "center", justifyContent: "center" }]}>
                <Text style={s.miniLabel}>{label.toUpperCase()}</Text>
                <Text style={[s.miniAmount, { color: c.text }]}>{inr(amount)}</Text>
                <View style={s.pill}><Text style={s.pillText}>SplitEase · Tap to open</Text></View>
            </View>
        );
    }
    if (style === "goal") {
        const target = custom?.amount != null ? custom.amount : 10000;
        const saved = Math.max(0, net);
        const pct = target > 0 ? Math.max(0, Math.min(100, Math.round((saved / target) * 100))) : 0;
        return (
            <View style={s.shell}>
                <View style={s.rowBetween}>
                    <Text style={[s.brand, { color: c.text }]}>SplitEase</Text>
                    <Text style={s.tap}>{pct}%</Text>
                </View>
                <Text style={[s.smallLabel, { marginTop: 10 }]}>{(custom?.label || "Savings goal").toUpperCase()}</Text>
                <View style={s.rowEnd}>
                    <Text style={[s.goalAmount, { color: c.text }]}>{inr(saved)}</Text>
                    <Text style={[s.goalTarget]}>/ {inr(target)}</Text>
                </View>
                <View style={s.track}>
                    <View style={[s.trackFill, { width: `${pct}%` }]} />
                </View>
            </View>
        );
    }
    if (style === "split") {
        return (
            <View style={s.shell}>
                <View style={s.rowBetween}>
                    <Text style={[s.brand, { color: c.text }]}>SplitEase</Text>
                    <Text style={s.tap}>Tap ›</Text>
                </View>
                <Text style={[s.note2, { color: c.text }]}>{custom?.label || "Shared expenses"}</Text>
                <View style={s.chipRow}>
                    <View style={[s.chip, { backgroundColor: c.panel, borderColor: c.line }]}>
                        <Text style={s.chipLabel}>YOU OWE</Text>
                        <Text style={[s.chipVal, { color: "#F43F5E" }]}>{inr(SAMPLE.totalOwe)}</Text>
                    </View>
                    <View style={[s.chip, { backgroundColor: c.panel, borderColor: c.line }]}>
                        <Text style={s.chipLabel}>{"YOU'RE OWED"}</Text>
                        <Text style={[s.chipVal, { color: "#10B981" }]}>{inr(SAMPLE.totalOwed)}</Text>
                    </View>
                </View>
            </View>
        );
    }
    // balance (default)
    return (
        <View style={s.shell}>
            <View style={s.rowBetween}>
                <Text style={[s.brand, { color: c.text }]}>SplitEase</Text>
                <Text style={s.tap}>Tap to open ›</Text>
            </View>
            <View style={[s.rowBetween, { alignItems: "flex-end", marginTop: 14 }]}>
                <View>
                    <Text style={s.smallLabel}>YOUR NET BALANCE</Text>
                    <Text style={[s.balAmount, { color: net >= 0 ? "#10B981" : "#F43F5E" }]}>
                        {net >= 0 ? "+" : "−"}{inr(Math.abs(net))}
                    </Text>
                </View>
                <View style={[s.chip, { backgroundColor: c.panel, borderColor: c.line }]}>
                    <Text style={s.chipLabel}>TO RECEIVE</Text>
                    <Text style={[s.chipVal, { color: "#10B981" }]}>{inr(SAMPLE.totalOwed)}</Text>
                </View>
            </View>
        </View>
    );
}

const previewStyles = (c) => StyleSheet.create({
    shell: { borderRadius: 18, backgroundColor: c.bg, borderWidth: 1, borderColor: c.line, padding: 14, minHeight: 110, justifyContent: "space-between" },
    shellGrad: { borderRadius: 18, padding: 16, minHeight: 110, justifyContent: "space-between" },
    rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    rowEnd: { flexDirection: "row", alignItems: "flex-end", gap: 6, marginTop: 2 },
    brand: { fontSize: 14, fontWeight: "800" },
    brandWhite: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
    tap: { fontSize: 11, fontWeight: "700", color: "#0891B2" },
    tapWhite: { fontSize: 11, fontWeight: "700", color: "#E0F2FE" },
    smallLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1, color: c.muted },
    balAmount: { fontSize: 24, fontWeight: "800", marginTop: 3 },
    chip: { minWidth: 92, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
    chipLabel: { fontSize: 8, fontWeight: "800", color: c.muted, letterSpacing: 0.5 },
    chipVal: { fontSize: 14, fontWeight: "800", marginTop: 2 },
    chipRow: { flexDirection: "row", gap: 8, marginTop: 8 },
    gradLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1, color: "#E0E7FF" },
    gradAmount: { fontSize: 28, fontWeight: "800", color: "#FFFFFF", marginTop: 2 },
    miniLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5, color: c.muted },
    miniAmount: { fontSize: 30, fontWeight: "800", marginTop: 4 },
    pill: { marginTop: 8, backgroundColor: c.panel, borderRadius: 999, borderWidth: 1, borderColor: c.line, paddingHorizontal: 12, paddingVertical: 5 },
    pillText: { fontSize: 10, fontWeight: "700", color: "#0891B2" },
    goalAmount: { fontSize: 22, fontWeight: "800" },
    goalTarget: { fontSize: 12, fontWeight: "700", color: c.muted, marginBottom: 3 },
    track: { width: "100%", height: 10, borderRadius: 999, backgroundColor: c.panel, borderWidth: 1, borderColor: c.line, marginTop: 8, overflow: "hidden" },
    trackFill: { height: "100%", borderRadius: 999, backgroundColor: "#22D3EE" },
    note2: { fontSize: 13, fontWeight: "800", marginTop: 8 },
});

const getStyles = (colors, isDark) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingBottom: 40 },
    intro: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, paddingHorizontal: SCREEN_GUTTER, marginTop: 4, marginBottom: 8 },
    inputs: { paddingHorizontal: SCREEN_GUTTER, gap: 10 },
    designList: { paddingHorizontal: SCREEN_GUTTER, gap: 12 },
    designCard: {
        borderRadius: 22, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border,
        padding: 12, gap: 10,
    },
    designCardActive: { borderColor: colors.primary },
    designHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    designLabel: { fontSize: 14.5, fontWeight: "700", color: colors.text },
    radio: {
        width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border,
        alignItems: "center", justifyContent: "center",
    },
    radioActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    saveBtn: { marginHorizontal: SCREEN_GUTTER, marginTop: 22 },
    note: { fontSize: 12, color: colors.textSecondary, textAlign: "center", paddingHorizontal: SCREEN_GUTTER, marginTop: 12, lineHeight: 17 },
});
