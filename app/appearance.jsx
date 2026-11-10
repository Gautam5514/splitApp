import { IconCircle, ListRow, ScreenHeader, SectionLabel, useDesign } from "@/components/ui/Design";
import CoinIcon from "@/components/icons/CoinIcon";
import { Text } from "@/components/ui/Typography";
import { R, TYPE } from "@/constants/design";
import { SCREEN_GUTTER } from "@/constants/layout";
import { useTheme } from "@/context/ThemeContext";
import { useBottomSpacing } from "@/hooks/useSafeSpacing";
import { Alert } from "@/lib/alert";
import { api } from "@/lib/api";
import { router } from "expo-router";
import { Check, Lock, Moon, Sun } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MODES = [
    { id: "light", label: "White", desc: "Clean and bright", Icon: Sun },
    { id: "dark", label: "Black", desc: "True black, easy on the eyes", Icon: Moon },
];

// What the line under a theme's name says, by how the user can get it.
const accessLine = (t) =>
    t.access === "owned" ? "Unlocked"
    : t.access === "tier" ? "Included with your tier"
    : t.access === "free-pick" ? "Free with Bronze · pick one"
    : `${t.price} coins`;

export default function AppearanceScreen() {
    const { setMode, theme, accent, setAccent } = useTheme();
    const { colors, t } = useDesign();
    const bottomSpacing = useBottomSpacing(32);
    const styles = getStyles(colors, t);
    const isDark = theme === "dark";

    // Theme shelf from the server: which themes exist, this user's price / access.
    const [themes, setThemes] = useState(null); // null = loading, [] = none / failed
    const [coins, setCoins] = useState(null);
    const [failed, setFailed] = useState(false);
    const [busy, setBusy] = useState(null); // theme id being unlocked
    const accentRef = useRef(accent);
    accentRef.current = accent;

    const applyStore = (data) => {
        const list = Array.isArray(data?.store?.themes) ? data.store.themes : [];
        setThemes(list);
        if (typeof data?.coins === "number") setCoins(data.coins);
        return list;
    };

    const load = async () => {
        try {
            setFailed(false);
            const { data } = await api.get("/referrals/me");
            const list = applyStore(data);
            // A theme this account can't use (e.g. left over from another login) is dropped.
            const current = accentRef.current;
            if (current && data?.store && !list.some((x) => x.key === current.key && x.usable)) setAccent(null);
        } catch {
            setThemes([]);
            setFailed(true);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const unlock = async (item) => {
        try {
            setBusy(item.id);
            const { data } = await api.post("/referrals/purchase", { itemId: item.id });
            applyStore(data);
            await setAccent(item);
        } catch (e) {
            Alert.alert("Couldn't unlock", e?.response?.data?.message || "Please try again.");
        } finally {
            setBusy(null);
        }
    };

    const onPick = (item) => {
        if (busy) return;
        if (item.usable) return setAccent(item);
        if (item.access === "free-pick") {
            return Alert.alert(
                `Use your free theme on ${item.name}?`,
                "Bronze members get one theme free. You can unlock the others with coins later.",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Unlock free", onPress: () => unlock(item) },
                ]
            );
        }
        const short = item.price - (coins ?? 0);
        if (short > 0) {
            return Alert.alert(
                `${short} more coins needed`,
                `${item.name} costs ${item.price} coins and you have ${coins ?? 0}. Invite friends to earn more.`,
                [
                    { text: "Not now", style: "cancel" },
                    { text: "Invite friends", onPress: () => router.push("/rewards") },
                ]
            );
        }
        Alert.alert(
            `Unlock ${item.name}?`,
            `This uses ${item.price} of your ${coins} coins. It's yours forever.`,
            [
                { text: "Cancel", style: "cancel" },
                { text: `Unlock for ${item.price}`, onPress: () => unlock(item) },
            ]
        );
    };

    const radio = (selected) => (
        <View style={[styles.radio, selected && styles.radioActive]}>
            {selected && <Check size={13} color={t.onInk} strokeWidth={3} />}
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <ScreenHeader flat back title="Appearance" />

            <ScrollView contentContainerStyle={{ paddingBottom: bottomSpacing }} showsVerticalScrollIndicator={false}>
                <SectionLabel line>Mode</SectionLabel>
                <View style={styles.group}>
                    {MODES.map(({ id, label, desc, Icon }) => (
                        <ListRow
                            key={id}
                            style={styles.row}
                            onPress={() => setMode(id)}
                            title={label}
                            subtitle={desc}
                            accessibilityLabel={`${label} mode${theme === id ? ", selected" : ""}`}
                            leading={
                                <IconCircle size={40} tint={t.fillStrong}>
                                    <Icon size={18} color={colors.text} strokeWidth={2} />
                                </IconCircle>
                            }
                            trailing={radio(theme === id)}
                        />
                    ))}
                </View>

                <SectionLabel
                    line
                    right={coins != null ? (
                        <View style={styles.coinsRight}>
                            <CoinIcon size={16} />
                            <Text style={styles.headRight}>{coins} {coins === 1 ? "coin" : "coins"}</Text>
                        </View>
                    ) : null}
                >
                    Accent colour
                </SectionLabel>
                <View style={styles.group}>
                    <ListRow
                        style={styles.row}
                        onPress={() => setAccent(null)}
                        title="Default"
                        subtitle="Classic black and white"
                        accessibilityLabel={`Default accent${!accent ? ", selected" : ""}`}
                        leading={<View style={[styles.swatch, { backgroundColor: isDark ? "#FFFFFF" : "#141414" }]} />}
                        trailing={radio(!accent)}
                    />

                    {(themes || []).map((item) => {
                        const selected = accent?.key === item.key;
                        const locked = !item.usable;
                        return (
                            <ListRow
                                key={item.id}
                                style={styles.row}
                                onPress={() => onPick(item)}
                                title={item.name}
                                subtitle={accessLine(item)}
                                accessibilityLabel={`${item.name}, ${accessLine(item)}${selected ? ", selected" : ""}`}
                                leading={
                                    <View style={[styles.swatch, { backgroundColor: isDark ? item.colors?.dark : item.colors?.light }]} />
                                }
                                trailing={
                                    locked ? (
                                        <View style={styles.chip}>
                                            <Lock size={13} color={colors.text} />
                                            <Text style={styles.chipText}>
                                                {busy === item.id ? "Unlocking…" : item.access === "free-pick" ? "Get free" : "Unlock"}
                                            </Text>
                                        </View>
                                    ) : (
                                        radio(selected)
                                    )
                                }
                            />
                        );
                    })}

                    {themes === null ? (
                        <Text style={styles.note}>Loading themes…</Text>
                    ) : failed ? (
                        <TouchableOpacity onPress={load} activeOpacity={0.7} accessibilityRole="button">
                            <Text style={styles.note}>
                                Couldn&apos;t load the themes. <Text style={styles.link}>Try again</Text>
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={() => router.push("/rewards")} activeOpacity={0.7} accessibilityRole="button">
                            <Text style={styles.note}>
                                Themes unlock with coins or your Elite tier. <Text style={styles.link}>Invite friends to earn coins</Text>
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* What it looks like right now */}
                <SectionLabel line>Preview</SectionLabel>
                <View style={styles.preview}>
                    <View style={styles.pBalance}>
                        <Text style={styles.pBalanceLabel}>You get back</Text>
                        <Text style={styles.pBalanceValue}>₹4,250</Text>
                    </View>
                    <View style={styles.pBtnRow}>
                        <View style={styles.pBtn}>
                            <Text style={styles.pBtnText}>Add Expense</Text>
                        </View>
                        <View style={styles.pBtnOutline}>
                            <Text style={styles.pBtnOutlineText}>Settle up</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (colors, t) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    // Rows sit straight on the canvas under a lined heading (no cards)
    group: { marginBottom: 12 },
    row: { paddingVertical: 8 },
    coinsRight: { flexDirection: "row", alignItems: "center", gap: 5 },
    headRight: { ...TYPE.secondary, color: colors.textSecondary },
    swatch: {
        width: 40, height: 40, borderRadius: 20,
        borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline,
    },
    radio: {
        width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: t.outline,
        alignItems: "center", justifyContent: "center",
    },
    radioActive: { backgroundColor: t.ink, borderColor: t.ink },
    chip: {
        flexDirection: "row", alignItems: "center", gap: 6,
        height: 34, paddingHorizontal: 12, borderRadius: R.pill,
        backgroundColor: t.fillStrong,
    },
    chipText: { ...TYPE.secondary, fontWeight: "600", color: colors.text },
    note: { ...TYPE.secondary, lineHeight: 20, color: colors.textSecondary, paddingHorizontal: SCREEN_GUTTER, marginTop: 8 },
    link: { fontWeight: "600", color: colors.text },

    preview: { paddingHorizontal: SCREEN_GUTTER, gap: 10 },
    pBalance: { borderRadius: R.tile, padding: 16, backgroundColor: t.ink },
    pBalanceLabel: { ...TYPE.secondary, color: t.onInk, opacity: 0.8 },
    pBalanceValue: { fontSize: 26, fontWeight: "700", color: t.onInk, marginTop: 2, letterSpacing: -0.3 },
    pBtnRow: { flexDirection: "row", gap: 10 },
    pBtn: { flex: 1, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: t.ink },
    pBtnText: { fontSize: 15, fontWeight: "600", color: t.onInk },
    pBtnOutline: {
        flex: 1, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center",
        borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline, backgroundColor: t.surface,
    },
    pBtnOutlineText: { fontSize: 15, fontWeight: "600", color: colors.text },
});
