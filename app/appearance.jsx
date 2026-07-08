import { useTheme } from "@/context/ThemeContext";
import { Colors } from "@/constants/theme";
import { router } from "expo-router";
import { ArrowLeft, Check, Monitor, Moon, Smartphone, Sun } from "lucide-react-native";
import { useColorScheme, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const OPTIONS = [
    { id: "light", label: "Light", desc: "Clean and bright", Icon: Sun, iconBg: "#FEF3C7", iconColor: "#F59E0B" },
    { id: "dark", label: "Dark", desc: "Easy on the eyes", Icon: Moon, iconBg: "#1E293B", iconColor: "#FBBF24" },
    { id: "system", label: "System", desc: "Match your device", Icon: Smartphone, iconBg: "#E0E7FF", iconColor: "#6366F1" },
];

export default function AppearanceScreen() {
    const { mode, setMode, colors, theme } = useTheme();
    const systemScheme = useColorScheme();
    const styles = getStyles(colors);

    // Resolve which palette the live preview should show.
    const previewScheme = mode === "system" ? systemScheme || "light" : mode;
    const p = Colors[previewScheme];

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <ArrowLeft size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Appearance</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.intro}>Choose how SplitEase looks for you. Changes apply instantly.</Text>

                {/* Mode selector */}
                <Text style={styles.sectionLabel}>Theme Mode</Text>
                <View style={styles.modeList}>
                    {OPTIONS.map(({ id, label, desc, Icon, iconBg, iconColor }) => {
                        const selected = mode === id;
                        return (
                            <TouchableOpacity
                                key={id}
                                style={[styles.modeCard, selected && styles.modeCardActive]}
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
                                    {selected && <Check size={13} color="#fff" strokeWidth={3} />}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Live preview */}
                <View style={styles.previewHead}>
                    <Monitor size={15} color={colors.primary} />
                    <Text style={styles.sectionLabel2}>Live Preview</Text>
                    <Text style={styles.previewTag}>{previewScheme === "dark" ? "DARK" : "LIGHT"}</Text>
                </View>

                <View style={[styles.preview, { backgroundColor: p.background, borderColor: p.border }]}>
                    {/* mini navbar */}
                    <View style={[styles.pNav, { backgroundColor: p.card, borderColor: p.border }]}>
                        <Text style={[styles.pBrand, { color: p.text }]}>SplitEase</Text>
                        <View style={[styles.pDot, { backgroundColor: p.primary }]} />
                    </View>
                    {/* balance card */}
                    <View style={[styles.pBalance, { backgroundColor: p.primary }]}>
                        <Text style={styles.pBalanceLabel}>Total balance</Text>
                        <Text style={styles.pBalanceValue}>₹4,250</Text>
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
                            <Text style={styles.pBtnText}>Settle up</Text>
                        </View>
                        <View style={[styles.pBtnOutline, { borderColor: p.border }]}>
                            <Text style={[styles.pBtnOutlineText, { color: p.textSecondary }]}>Remind</Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.note}>More accent colors and fonts are coming soon.</Text>
            </ScrollView>
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
    scroll: { padding: 16, paddingBottom: 50 },
    intro: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 19, marginBottom: 20 },

    sectionLabel: {
        fontSize: 12, fontWeight: "700", color: colors.textSecondary,
        textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, marginLeft: 2,
    },
    modeList: { gap: 10 },
    modeCard: {
        flexDirection: "row", alignItems: "center", gap: 14,
        backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border,
        borderRadius: 8, padding: 14,
    },
    modeCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
    modeIcon: { width: 42, height: 42, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    modeLabel: { fontSize: 15.5, fontWeight: "700", color: colors.text },
    modeDesc: { fontSize: 12.5, color: colors.textSecondary, marginTop: 2 },
    radio: {
        width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border,
        alignItems: "center", justifyContent: "center",
    },
    radioActive: { backgroundColor: colors.primary, borderColor: colors.primary },

    previewHead: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 28, marginBottom: 10, marginLeft: 2 },
    sectionLabel2: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, flex: 1 },
    previewTag: { fontSize: 10, fontWeight: "800", color: colors.textSecondary, letterSpacing: 1 },

    preview: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 },
    pNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
    pBrand: { fontSize: 15, fontWeight: "800" },
    pDot: { width: 22, height: 22, borderRadius: 11 },
    pBalance: { borderRadius: 8, padding: 12 },
    pBalanceLabel: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.85)" },
    pBalanceValue: { fontSize: 22, fontWeight: "800", color: "#fff", marginTop: 2 },
    pRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
    pRowName: { fontSize: 13.5, fontWeight: "600" },
    pRowAmt: { fontSize: 13.5, fontWeight: "800" },
    pBtnRow: { flexDirection: "row", gap: 8, marginTop: 2 },
    pBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
    pBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
    pBtnOutline: { flex: 1, borderRadius: 8, borderWidth: 1, paddingVertical: 10, alignItems: "center" },
    pBtnOutlineText: { fontWeight: "700", fontSize: 13 },

    note: { textAlign: "center", fontSize: 12, color: colors.textSecondary, marginTop: 24 },
});
