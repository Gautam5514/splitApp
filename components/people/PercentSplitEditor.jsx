import { useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { evenPercents, splitRows } from "@/lib/people";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

const PALETTE = ["#0891B2", "#0D9488", "#7C3AED", "#DB2777", "#EA580C", "#2563EB"];
const tint = (name = "") => PALETTE[(name.charCodeAt(0) || 0) % PALETTE.length];

/** What the editor shows/sends: the user's own numbers, or an even split until they edit. */
export function effectivePercents(people, percents) {
    const keys = splitRows(people).filter((r) => !r.locked).map((r) => r.key);
    return percents ?? evenPercents(keys);
}
export const percentTotal = (people, percents) => {
    const eff = effectivePercents(people, percents);
    const keys = splitRows(people).filter((r) => !r.locked).map((r) => r.key);
    return Math.round(keys.reduce((a, k) => a + (Number(eff[k]) || 0), 0) * 100) / 100;
};

/**
 * "By percent" editor for the create-group flow. `percents` is null until the
 * user types (then it is an even split of 100), or { [rowKey]: number }.
 * Email invites / not-yet-accepted users have no account to weight yet.
 */
export default function PercentSplitEditor({ people, percents, onChange }) {
    const { colors, t } = useDesign();
    const styles = getStyles(colors, t);
    const rows = splitRows(people);
    const eff = effectivePercents(people, percents);
    const total = percentTotal(people, percents);
    const ok = Math.abs(total - 100) < 0.01;

    const edit = (key, text) => {
        const clean = text.replace(/[^0-9.]/g, "");
        onChange({ ...eff, [key]: clean });
    };

    return (
        <View style={styles.wrap}>
            <View style={styles.head}>
                <Text style={styles.title}>Set percent for each person</Text>
                <TouchableOpacity onPress={() => onChange(null)} accessibilityLabel="Split evenly"><Text style={styles.link}>Split evenly</Text></TouchableOpacity>
            </View>
            {rows.map((r) => (
                <View key={r.key} style={styles.row}>
                    <View style={[styles.avatar, { backgroundColor: tint(r.name) }]}>
                        <Text style={styles.avatarText}>{(r.name || "?").charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.name} numberOfLines={1}>{r.name}</Text>
                        {r.locked ? <Text style={styles.hint} numberOfLines={1}>{r.sub}</Text> : null}
                    </View>
                    {!r.locked && (
                        <>
                            <TextInput value={String(eff[r.key] ?? "")} keyboardType="decimal-pad" accessibilityLabel={`Percent for ${r.name}`}
                                onChangeText={(v) => edit(r.key, v)} style={styles.input} placeholder="0" placeholderTextColor={colors.textSecondary} />
                            <Text style={styles.unit}>%</Text>
                        </>
                    )}
                </View>
            ))}
            <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={[styles.totalLabel, !ok && { color: "#D97706" }]}>{`${total}% of 100%`}</Text>
            </View>
        </View>
    );
}

const getStyles = (colors, t) => StyleSheet.create({
    wrap: { marginTop: 10, padding: 10, borderRadius: 22, gap: 6, backgroundColor: t.surfaceAlt },
    head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4, paddingBottom: 2 },
    title: { fontSize: 13, fontWeight: "700", color: colors.text },
    link: { fontSize: 12.5, fontWeight: "700", color: colors.primary },
    hint: { fontSize: 11.5, color: colors.textSecondary },
    row: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, backgroundColor: t.surface },
    avatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
    avatarText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    name: { fontSize: 14.5, fontWeight: "600", color: colors.text },
    input: { width: 68, height: 36, borderRadius: 10, paddingHorizontal: 8, textAlign: "right", fontWeight: "700", color: colors.text, backgroundColor: t.surfaceAlt },
    unit: { fontSize: 13, color: colors.textSecondary },
    totalRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 6, paddingTop: 4 },
    totalLabel: { fontSize: 12.5, fontWeight: "700", color: colors.textSecondary },
});
