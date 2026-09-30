import { Block, SectionLabel, useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { categoryMeta, formatMoney } from "@/lib/groupPresets";
import { StyleSheet, View } from "react-native";

// Spend per category: one measure, one hue, value + share printed per bar.
export default function CategoryBreakdown({ rows = [], currency = "INR", total }) {
    const { colors, t } = useDesign();
    if (!rows.length) return null;
    const sum = total || rows.reduce((a, r) => a + r.amount, 0);
    const max = rows[0]?.amount || 1;
    return (
        <>
            <SectionLabel>Where the money went</SectionLabel>
            <Block>
                <View style={{ gap: 12 }}>
                    {rows.map((r) => {
                        const { label, Icon } = categoryMeta(r.category);
                        const pct = sum ? Math.round((r.amount / sum) * 100) : 0;
                        return (
                            <View key={r.category} accessible accessibilityLabel={`${label}: ${formatMoney(r.amount, currency)}, ${pct} percent`}>
                                <View style={styles.row}>
                                    <View style={styles.inline}>
                                        <Icon size={13} color={colors.textSecondary} />
                                        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
                                    </View>
                                    <Text style={[styles.value, { color: colors.textSecondary }]}>
                                        <Text style={{ color: colors.text, fontWeight: "700" }}>{formatMoney(r.amount, currency)}</Text> · {pct}%
                                    </Text>
                                </View>
                                <View style={[styles.track, { backgroundColor: t.surfaceAlt }]}>
                                    <View style={[styles.fill, { width: `${Math.max(2, (r.amount / max) * 100)}%`, backgroundColor: colors.primary }]} />
                                </View>
                            </View>
                        );
                    })}
                </View>
            </Block>
        </>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
    inline: { flexDirection: "row", alignItems: "center", gap: 6 },
    label: { fontSize: 13.5, fontWeight: "600" },
    value: { fontSize: 12.5 },
    track: { height: 8, borderRadius: 4, overflow: "hidden" },
    fill: { height: "100%", borderRadius: 4 },
});
