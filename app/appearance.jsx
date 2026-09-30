import { useBottomSpacing } from "@/hooks/useSafeSpacing";
import { SCREEN_GUTTER } from "@/constants/layout";
import { Block, ScreenHeader, SectionLabel, useDesign } from "@/components/ui/Design";
import { useTheme } from "@/context/ThemeContext";
import { Colors } from "@/constants/theme";
import { R } from "@/constants/design";
import { Check, Moon, Sun } from "lucide-react-native";
import { ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ui/Typography";
import { SafeAreaView } from "react-native-safe-area-context";

const OPTIONS = [
    { id: "light", label: "White", desc: "Clean and bright", Icon: Sun, iconBg: "#FEF3C7", iconColor: "#F59E0B" },
    { id: "dark", label: "Black", desc: "Sleek all-black theme", Icon: Moon, iconBg: "#111111", iconColor: "#FFFFFF" },
];

export default function AppearanceScreen() {
    const { setMode, colors, theme } = useTheme();
    const { t } = useDesign();
    const bottomSpacing = useBottomSpacing(32);
    const styles = getStyles(colors, t);

    // Only two themes now: light or black(dark).
    const previewScheme = theme === "dark" ? "dark" : "light";
    const p = Colors[previewScheme];

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />
            <ScreenHeader title="Appearance" back />

            <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomSpacing }]} showsVerticalScrollIndicator={false}>
                <Text style={styles.intro}>Choose how SplitEase looks for you. Changes apply instantly.</Text>

                {/* Mode selector */}
                <SectionLabel>Theme Mode</SectionLabel>
                <View style={styles.modeList}>
                    {OPTIONS.map(({ id, label, desc, Icon, iconBg, iconColor }) => {
                        const selected = theme === id;
                        return (
                            <TouchableOpacity
                                key={id}
                                style={[styles.modeTile, selected && styles.modeTileActive]}
                                onPress={() => setMode(id)}
                                activeOpacity={0.85}
                            >
                                <View style={[styles.modeIcon, { backgroundColor: iconBg }]}>
                                    <Icon size={20} color={iconColor} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.modeLabel}>{label}</Text>
                                    <Text style={styles.modeDesc}>{desc}</Text>
                                </View>
                                <View style={[styles.radio, selected && styles.radioActive]}>
                                    {selected && <Check size={13} color={t.onInk} strokeWidth={3} />}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Live preview */}
                <SectionLabel right={<Text style={styles.previewTag}>{previewScheme === "dark" ? "DARK" : "LIGHT"}</Text>}>Live Preview</SectionLabel>

                <Block style={[styles.preview, { backgroundColor: p.background }]}>
                    {/* mini navbar */}
                    <View style={[styles.pNav, { backgroundColor: p.card, borderColor: p.border }]}>
                        <Text style={[styles.pBrand, { color: p.text }]}>SplitEase</Text>
                        <View style={[styles.pDot, { backgroundColor: p.primary }]} />
                    </View>
                    {/* balance card */}
                    <View style={[styles.pBalance, { backgroundColor: p.primary }]}>
                        <Text style={[styles.pBalanceLabel, { color: p.onPrimary, opacity: 0.8 }]}>Total balance</Text>
                        <Text style={[styles.pBalanceValue, { color: p.onPrimary }]}>₹4,250</Text>
                    </View>
                    {/* rows */}
                    {[["Beach Dinner", "₹2,400"], ["Taxi Airport", "₹1,200"]].map(([n, a]) => (
                        <View key={n} style={[styles.pRow, { backgroundColor: p.card, borderColor: p.border }]}>
                            <Text style={[styles.pRowName, { color: p.text }]}>{n}</Text>
                            <Text style={[styles.pRowAmt, { color: p.primary }]}>{a}</Text>
                        </View>
                    ))}
                    {/* buttons */}
                    <View style={styles.pBtnRow}>
                        <View style={[styles.pBtn, { backgroundColor: p.primary }]}>
                            <Text style={[styles.pBtnText, { color: p.onPrimary }]}>Settle up</Text>
                        </View>
                        <View style={[styles.pBtnOutline, { borderColor: p.border }]}>
                            <Text style={[styles.pBtnOutlineText, { color: p.textSecondary }]}>Remind</Text>
                        </View>
                    </View>
                </Block>

            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (colors, t) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingTop: 4, paddingBottom: 50 },
    intro: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 19, marginBottom: 20, paddingHorizontal: SCREEN_GUTTER },

    previewTag: { fontSize: 10, fontWeight: "800", color: colors.textSecondary, letterSpacing: 1 },

    modeList: { gap: 10, paddingHorizontal: SCREEN_GUTTER, marginBottom: 24 },
    modeTile: {
        flexDirection: "row", alignItems: "center", gap: 14,
        backgroundColor: t.surface, borderWidth: 1.5, borderColor: t.outline,
        borderRadius: R.tile, padding: 14,
    },
    modeTileActive: { borderColor: t.ink },
    modeIcon: { width: 42, height: 42, borderRadius: R.tile, alignItems: "center", justifyContent: "center" },
    modeLabel: { fontSize: 15.5, fontWeight: "600", color: colors.text },
    modeDesc: { fontSize: 12.5, color: colors.textSecondary, marginTop: 2 },
    radio: {
        width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: t.outline,
        alignItems: "center", justifyContent: "center",
    },
    radioActive: { backgroundColor: t.ink, borderColor: t.ink },

    preview: { gap: 10 },
    pNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
    pBrand: { fontSize: 15, fontWeight: "800" },
    pDot: { width: 22, height: 22, borderRadius: 11 },
    pBalance: { borderRadius: 12, padding: 12 },
    pBalanceLabel: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.85)" },
    pBalanceValue: { fontSize: 22, fontWeight: "800", color: "#fff", marginTop: 2 },
    pRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
    pRowName: { fontSize: 13.5, fontWeight: "600" },
    pRowAmt: { fontSize: 13.5, fontWeight: "800" },
    pBtnRow: { flexDirection: "row", gap: 8, marginTop: 2 },
    pBtn: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
    pBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
    pBtnOutline: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 10, alignItems: "center" },
    pBtnOutlineText: { fontWeight: "700", fontSize: 13 },

});
