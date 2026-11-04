import { SCREEN_GUTTER } from "@/constants/layout";
import { PillButton, PillInput, ScreenHeader, SectionLabel } from "@/components/ui/Design";
import { useTheme } from "@/context/ThemeContext";
import { useBottomSpacing } from "@/hooks/useSafeSpacing";
import { getWidgetCustomization, promptAddBalanceWidget, saveWidgetCustomization } from "@/lib/homeScreenWidget";
import { readData } from "@/widgets/widgetData";
import { WIDGET_STYLES } from "@/widgets/SplitEaseBalanceWidget";
import { Check } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient";
import { Alert } from "@/lib/alert";
import { Platform, ScrollView, StatusBar, StyleSheet, Switch, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ui/Typography";
import { SafeAreaView } from "react-native-safe-area-context";

const inr = (n) => `₹${Math.round(Math.abs(Number(n) || 0)).toLocaleString("en-IN")}`;
const signed = (n) => `${Number(n) < -0.5 ? "-" : Number(n) > 0.5 ? "+" : ""}${inr(n)}`;
const first = (name) => String(name || "").trim().split(/\s+/)[0] || "Someone";

// Shown in the previews until the person's own numbers are cached.
const SAMPLE = {
    totalOwe: 1250, totalOwed: 3800, net: 2550,
    people: [{ userId: "a", name: "Rahul", amount: 2400, direction: "owed" }, { userId: "b", name: "Priya", amount: 1250, direction: "owe" }],
    month: { spend: 6420, count: 9 }, latest: { description: "Dinner", amount: 1800, group: "Flat 302" }, groups: 3,
};

/*
 * Home-screen widget setup: pick a design, choose what it shows, add your own amount and
 * label for the custom designs, then place it. The widget updates itself every 30 minutes,
 * whenever the app refreshes balances, and when you tap its "Updated" line.
 */
export default function WidgetCustomizeScreen() {
    const { colors, theme } = useTheme();
    const isDark = theme === "dark";
    const styles = getStyles(colors, isDark);
    const bottomSpacing = useBottomSpacing(32);

    const [style, setStyle] = useState("balance");
    const [amount, setAmount] = useState("");
    const [label, setLabel] = useState("");
    const [showPeople, setShowPeople] = useState(true);
    const [quickActions, setQuickActions] = useState(true);
    const [saving, setSaving] = useState(false);
    const [live, setLive] = useState(null);

    useEffect(() => {
        (async () => {
            const c = await getWidgetCustomization();
            setStyle(c.style);
            setAmount(c.amount != null ? String(c.amount) : "");
            setLabel(c.label || "");
            setShowPeople(c.showPeople !== false);
            setQuickActions(c.quickActions !== false);
            const d = await readData();
            if (d && (d.groups || d.people?.length || d.totalOwe || d.totalOwed)) setLive(d);
        })();
    }, []);

    const data = live || SAMPLE;
    const custom = useMemo(() => ({ amount: amount === "" ? null : Number(amount), label: label.trim(), showPeople, quickActions }), [amount, label, showPeople, quickActions]);
    const usesCustomAmount = ["gradient", "minimal", "goal"].includes(style);

    const save = async () => {
        try {
            setSaving(true);
            await saveWidgetCustomization({ style, amount, label: label.trim(), showBalance: true, showPeople, quickActions });
            const added = await promptAddBalanceWidget();
            if (!added) {
                Alert.alert(
                    "Saved",
                    Platform.OS === "android"
                        ? "Your widget is saved. To place it: long-press the home screen, choose Widgets, then SplitEase. Widgets already on the screen update on their own."
                        : "Saved. Home-screen widgets are available on Android today; the iOS widget is coming."
                );
            }
        } catch {
            Alert.alert("Widget unavailable", "Install the latest app build first. Home-screen widgets are not available in Expo Go.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <ScreenHeader title="Home widget" back />

            <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomSpacing }]} showsVerticalScrollIndicator={false}>
                <Text style={styles.intro}>
                    Your balance on the home screen, always current. Pick a design, choose what it shows, then place it. Make it taller to see who owes whom and the quick actions.
                </Text>

                <SectionLabel>Choose a design</SectionLabel>
                <View style={styles.designList}>
                    {WIDGET_STYLES.map((d) => {
                        const selected = style === d.id;
                        return (
                            <TouchableOpacity key={d.id} activeOpacity={0.9} onPress={() => setStyle(d.id)} style={[styles.designCard, selected && styles.designCardActive]}>
                                <View style={styles.designHead}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.designLabel}>{d.label}</Text>
                                        <Text style={styles.designHint}>{d.hint}</Text>
                                    </View>
                                    <View style={[styles.radio, selected && styles.radioActive]}>
                                        {selected && <Check size={13} color={colors.onPrimary} strokeWidth={3} />}
                                    </View>
                                </View>
                                <WidgetPreview style={d.id} data={data} custom={custom} isDark={isDark} />
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <SectionLabel>What it shows</SectionLabel>
                <View style={styles.options}>
                    <OptionRow styles={styles} colors={colors} label="People to settle with" hint="Who owes whom, largest first (taller widgets)" value={showPeople} onChange={setShowPeople} />
                    <OptionRow styles={styles} colors={colors} label="Quick actions" hint="Add expense and Scan bill buttons (taller widgets)" value={quickActions} onChange={setQuickActions} />
                </View>

                {usesCustomAmount && (
                    <>
                        <SectionLabel>Your own amount</SectionLabel>
                        <Text style={styles.help}>Leave the amount empty to show your live net balance instead.</Text>
                        <View style={styles.inputs}>
                            <PillInput placeholder="Amount (e.g. 50000)" keyboardType="numeric" value={amount} onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ""))} />
                            <PillInput placeholder={style === "goal" ? "Label (e.g. Goa fund)" : "Label (e.g. Vacation fund)"} value={label} onChangeText={setLabel} maxLength={26} />
                        </View>
                    </>
                )}

                <PillButton label="Save and add to home screen" onPress={save} loading={saving} disabled={saving} style={styles.saveBtn} />
                <Text style={styles.note}>Updates every 30 minutes, whenever the app refreshes your balances, and when you tap the Updated line on the widget. Android only for now.</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

function OptionRow({ styles, colors, label, hint, value, onChange }) {
    return (
        <View style={styles.optionRow}>
            <View style={{ flex: 1 }}>
                <Text style={styles.optionLabel}>{label}</Text>
                <Text style={styles.optionHint}>{hint}</Text>
            </View>
            <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#FFFFFF" />
        </View>
    );
}

/* On-screen previews that mirror each home-screen widget design (medium size). */
function WidgetPreview({ style, data, custom, isDark }) {
    const c = isDark
        ? { bg: "#0B0F1A", panel: "#151B2B", text: "#F8FAFC", muted: "#94A3B8", line: "#263044", accent: "#22D3EE" }
        : { bg: "#FFFFFF", panel: "#F1F5F9", text: "#0F172A", muted: "#64748B", line: "#E2E8F0", accent: "#0891B2" };
    const s = previewStyles(c);
    const net = Number(data.net ?? (data.totalOwed - data.totalOwe));
    const netColor = net > 0.5 ? "#10B981" : net < -0.5 ? "#F43F5E" : c.text;
    const own = custom?.amount != null ? custom.amount : net;
    const brand = (right) => (
        <View style={s.rowBetween}>
            <View style={s.brandRow}><View style={s.logo}><Text style={s.logoText}>S</Text></View><Text style={[s.brand, { color: c.text }]}>SplitEase</Text></View>
            {right}
        </View>
    );
    const updated = <Text style={s.tap}>Updated just now</Text>;
    const person = (p) => (
        <View key={p.userId || p.name} style={s.personRow}>
            <View style={s.personLeft}>
                <View style={[s.avatar, { backgroundColor: p.direction === "owed" ? "#D1FAE5" : "#FFE4E6" }]}><Text style={[s.avatarText, { color: p.direction === "owed" ? "#047857" : "#BE123C" }]}>{first(p.name)[0].toUpperCase()}</Text></View>
                <Text style={[s.personText, { color: c.text }]}>{p.direction === "owed" ? `${first(p.name)} owes you` : `You owe ${first(p.name)}`}</Text>
            </View>
            <Text style={[s.personAmt, { color: p.direction === "owed" ? "#10B981" : "#F43F5E" }]}>{inr(p.amount)}</Text>
        </View>
    );

    if (style === "gradient") {
        return (
            <ExpoLinearGradient colors={["#6366F1", "#22D3EE"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.shellGrad}>
                <View style={s.rowBetween}><Text style={s.brandWhite}>SplitEase</Text><Text style={s.tapWhite}>Updated just now</Text></View>
                <View>
                    <Text style={s.gradLabel}>{(custom?.label || "Net balance").toUpperCase()}</Text>
                    <Text style={s.gradAmount}>{custom?.amount != null ? inr(own) : signed(own)}</Text>
                    <Text style={s.gradSub}>To pay {inr(data.totalOwe)}  ·  To receive {inr(data.totalOwed)}</Text>
                </View>
            </ExpoLinearGradient>
        );
    }
    if (style === "minimal") {
        return (
            <View style={[s.shell, { alignItems: "center", justifyContent: "center" }]}>
                <Text style={s.miniLabel}>{(custom?.label || "Net balance").toUpperCase()}</Text>
                <Text style={[s.miniAmount, { color: c.text }]}>{custom?.amount != null ? inr(own) : signed(own)}</Text>
                <View style={s.pill}><Text style={s.pillText}>SplitEase  ·  Updated just now</Text></View>
            </View>
        );
    }
    if (style === "goal") {
        const target = custom?.amount != null ? custom.amount : 10000;
        const saved = Math.max(0, net);
        const pct = target > 0 ? Math.max(0, Math.min(100, Math.round((saved / target) * 100))) : 0;
        return (
            <View style={s.shell}>
                {brand(<Text style={s.tap}>{pct}%</Text>)}
                <Text style={[s.smallLabel, { marginTop: 8 }]}>{(custom?.label || "Savings goal").toUpperCase()}</Text>
                <View style={s.rowEnd}><Text style={[s.goalAmount, { color: c.text }]}>{inr(saved)}</Text><Text style={s.goalTarget}>/ {inr(target)}</Text></View>
                <View style={s.track}><View style={[s.trackFill, { width: `${Math.max(pct, 2)}%` }]} /></View>
            </View>
        );
    }
    if (style === "people") {
        return (
            <View style={s.shell}>
                {brand(updated)}
                <View style={[s.rowBetween, { marginTop: 6 }]}><Text style={s.smallLabel}>SETTLE UP</Text><Text style={[s.tap, { color: netColor }]}>Net {signed(net)}</Text></View>
                {data.people?.length ? data.people.slice(0, 2).map(person) : <Text style={[s.muted, { marginTop: 6 }]}>All settled. Nice.</Text>}
            </View>
        );
    }
    if (style === "month") {
        const month = new Date().toLocaleString("en-IN", { month: "long" });
        return (
            <View style={s.shell}>
                {brand(updated)}
                <View style={[s.rowBetween, { alignItems: "flex-end", marginTop: 6 }]}>
                    <View><Text style={s.smallLabel}>{month.toUpperCase()} · YOUR SHARE</Text><Text style={[s.balAmount, { color: c.text }]}>{inr(data.month?.spend)}</Text></View>
                    <View style={[s.chip, { backgroundColor: c.panel, borderColor: c.line }]}><Text style={s.chipLabel}>BILLS</Text><Text style={[s.chipVal, { color: c.text }]}>{data.month?.count || 0}</Text></View>
                </View>
                {data.latest && <View style={[s.latest, { backgroundColor: c.panel, borderColor: c.line }]}><Text style={[s.latestText, { color: c.text }]} numberOfLines={1}>Latest: {data.latest.description}{data.latest.group ? ` · ${data.latest.group}` : ""}</Text><Text style={[s.latestAmt, { color: c.text }]}>{inr(data.latest.amount)}</Text></View>}
            </View>
        );
    }
    // balance (default)
    return (
        <View style={s.shell}>
            {brand(updated)}
            <View style={[s.rowBetween, { alignItems: "flex-end", marginTop: 8 }]}>
                <View>
                    <Text style={s.smallLabel}>YOUR NET BALANCE</Text>
                    <Text style={[s.balAmount, { color: netColor }]}>{signed(net)}</Text>
                </View>
                <View style={s.chipRow}>
                    <View style={[s.chip, { backgroundColor: c.panel, borderColor: c.line }]}><Text style={s.chipLabel}>TO PAY</Text><Text style={[s.chipVal, { color: "#F43F5E" }]}>{inr(data.totalOwe)}</Text></View>
                    <View style={[s.chip, { backgroundColor: c.panel, borderColor: c.line }]}><Text style={s.chipLabel}>TO RECEIVE</Text><Text style={[s.chipVal, { color: "#10B981" }]}>{inr(data.totalOwed)}</Text></View>
                </View>
            </View>
            {custom?.showPeople && data.people?.length ? <View style={{ marginTop: 6 }}>{data.people.slice(0, 2).map(person)}</View> : null}
            {custom?.quickActions ? (
                <View style={s.actions}>
                    <ExpoLinearGradient colors={["#22D3EE", "#6366F1"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.actionPrimary}><Text style={s.actionPrimaryText}>Add expense</Text></ExpoLinearGradient>
                    <View style={[s.actionSecondary, { backgroundColor: c.panel, borderColor: c.line }]}><Text style={[s.actionSecondaryText, { color: c.text }]}>Scan bill</Text></View>
                </View>
            ) : null}
        </View>
    );
}

const previewStyles = (c) => StyleSheet.create({
    shell: { borderRadius: 18, backgroundColor: c.bg, borderWidth: 1, borderColor: c.line, padding: 14, minHeight: 110, justifyContent: "space-between" },
    shellGrad: { borderRadius: 18, padding: 16, minHeight: 110, justifyContent: "space-between" },
    rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    rowEnd: { flexDirection: "row", alignItems: "flex-end", gap: 6, marginTop: 2 },
    brandRow: { flexDirection: "row", alignItems: "center", gap: 7 },
    logo: { width: 22, height: 22, borderRadius: 7, backgroundColor: "#6366F1", alignItems: "center", justifyContent: "center" },
    logoText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
    brand: { fontSize: 13, fontWeight: "800" },
    brandWhite: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
    tap: { fontSize: 10, fontWeight: "700", color: c.accent },
    tapWhite: { fontSize: 10, fontWeight: "700", color: "#E0F2FE" },
    muted: { fontSize: 11, color: c.muted },
    smallLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1, color: c.muted },
    balAmount: { fontSize: 24, fontWeight: "800", marginTop: 2 },
    chip: { minWidth: 86, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
    chipLabel: { fontSize: 8, fontWeight: "800", color: c.muted, letterSpacing: 0.5 },
    chipVal: { fontSize: 13, fontWeight: "800", marginTop: 1 },
    chipRow: { flexDirection: "row", gap: 6 },
    personRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
    personLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    avatar: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 11, fontWeight: "800" },
    personText: { fontSize: 12 },
    personAmt: { fontSize: 12, fontWeight: "800" },
    actions: { flexDirection: "row", gap: 8, marginTop: 8 },
    actionPrimary: { flex: 1, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    actionPrimaryText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
    actionSecondary: { flex: 1, height: 32, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
    actionSecondaryText: { fontSize: 11, fontWeight: "800" },
    latest: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7, marginTop: 8, gap: 8 },
    latestText: { fontSize: 11, flex: 1 },
    latestAmt: { fontSize: 11, fontWeight: "800" },
    gradLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1, color: "#E0E7FF" },
    gradAmount: { fontSize: 28, fontWeight: "800", color: "#FFFFFF", marginTop: 2 },
    gradSub: { fontSize: 10, fontWeight: "700", color: "#E0F2FE", marginTop: 5 },
    miniLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5, color: c.muted },
    miniAmount: { fontSize: 30, fontWeight: "800", marginTop: 2 },
    pill: { marginTop: 8, backgroundColor: c.panel, borderRadius: 999, borderWidth: 1, borderColor: c.line, paddingHorizontal: 12, paddingVertical: 5 },
    pillText: { fontSize: 10, fontWeight: "700", color: c.accent },
    goalAmount: { fontSize: 22, fontWeight: "800" },
    goalTarget: { fontSize: 11, fontWeight: "700", color: c.muted, marginBottom: 3 },
    track: { width: "100%", height: 10, borderRadius: 999, backgroundColor: c.panel, borderWidth: 1, borderColor: c.line, marginTop: 6, overflow: "hidden" },
    trackFill: { height: "100%", borderRadius: 999, backgroundColor: "#22D3EE" },
});

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingBottom: 40 },
    intro: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, paddingHorizontal: SCREEN_GUTTER, marginTop: 4, marginBottom: 8 },
    help: { fontSize: 12, color: colors.textSecondary, paddingHorizontal: SCREEN_GUTTER, marginBottom: 8, marginTop: -4 },
    inputs: { paddingHorizontal: SCREEN_GUTTER, gap: 10 },
    designList: { paddingHorizontal: SCREEN_GUTTER, gap: 12 },
    designCard: { borderRadius: 22, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, padding: 12, gap: 10 },
    designCardActive: { borderColor: colors.primary },
    designHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
    designLabel: { fontSize: 14.5, fontWeight: "700", color: colors.text },
    designHint: { fontSize: 11.5, color: colors.textSecondary, marginTop: 1 },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
    radioActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    options: { paddingHorizontal: SCREEN_GUTTER, gap: 8 },
    optionRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10 },
    optionLabel: { fontSize: 14, fontWeight: "700", color: colors.text },
    optionHint: { fontSize: 11.5, color: colors.textSecondary, marginTop: 1 },
    saveBtn: { marginHorizontal: SCREEN_GUTTER, marginTop: 22 },
    note: { fontSize: 12, color: colors.textSecondary, textAlign: "center", paddingHorizontal: SCREEN_GUTTER, marginTop: 12, lineHeight: 17 },
});
