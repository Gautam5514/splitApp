import { useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import * as Haptics from "expo-haptics";
import { Minus, Plus } from "lucide-react-native";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";

export const MAX_SHARES = 20;
const PALETTE = ["#0891B2", "#0D9488", "#7C3AED", "#DB2777", "#EA580C", "#2563EB"];
const tint = (name = "") => PALETTE[(name.charCodeAt(0) || 0) % PALETTE.length];
const tap = () => { if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {}); };

/**
 * "By shares" editor for the create-group flow: one row per person with a
 * stepper. `shares` is { [rowKey]: number } (missing = 1); the creator's row
 * key is "me". Invite-by-email rows have no account yet, so they stay at
 * 1 share until they join.
 */
export default function ShareSplitEditor({ people, shares, onChange }) {
    const { colors, t } = useDesign();
    const styles = getStyles(colors, t);
    const rows = [
        { key: "me", name: "You", sub: "Group creator", locked: false },
        ...people.map((p) => ({ key: p.key, name: p.name, sub: p.kind === "email" ? "Gets 1 share once they join" : !p.direct ? "Gets 1 share once they accept" : p.sub, locked: p.kind === "email" || !p.direct })),
    ];
    const get = (k) => shares[k] ?? 1;
    const total = rows.reduce((a, r) => a + (r.locked ? 1 : get(r.key)), 0);
    const set = (k, v) => { tap(); onChange({ ...shares, [k]: Math.min(MAX_SHARES, Math.max(1, v)) }); };

    return (
        <View style={styles.wrap}>
            <View style={styles.head}>
                <Text style={styles.title}>Set shares for each person</Text>
                <Text style={styles.hint}>{`${total} ${total === 1 ? "share" : "shares"} total`}</Text>
            </View>
            {rows.map((r) => {
                const n = r.locked ? 1 : get(r.key);
                const pct = Math.round((n / total) * 100);
                return (
                    <View key={r.key} style={styles.row}>
                        <View style={[styles.avatar, { backgroundColor: tint(r.name) }]}>
                            <Text style={styles.avatarText}>{(r.name || "?").charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.name} numberOfLines={1}>{r.name}</Text>
                            <Text style={styles.hint} numberOfLines={1}>{r.locked ? r.sub : `${pct}% of every bill`}</Text>
                        </View>
                        {!r.locked && (
                            <View style={styles.stepper}>
                                <TouchableOpacity style={[styles.btn, n <= 1 && styles.off]} disabled={n <= 1} onPress={() => set(r.key, n - 1)}
                                    accessibilityLabel={`Fewer shares for ${r.name}`}>
                                    <Minus size={15} color={colors.text} />
                                </TouchableOpacity>
                                <Text style={styles.count}>{n}</Text>
                                <TouchableOpacity style={[styles.btn, n >= MAX_SHARES && styles.off]} disabled={n >= MAX_SHARES} onPress={() => set(r.key, n + 1)}
                                    accessibilityLabel={`More shares for ${r.name}`}>
                                    <Plus size={15} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                );
            })}
            <Text style={[styles.hint, { paddingHorizontal: 4, paddingTop: 4 }]}>
                Example: 2 shares pays double of 1 share. You can change this later in Group settings.
            </Text>
        </View>
    );
}

const getStyles = (colors, t) => StyleSheet.create({
    wrap: { marginTop: 10, padding: 10, borderRadius: 22, gap: 6, backgroundColor: t.surfaceAlt },
    head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4, paddingBottom: 2 },
    title: { fontSize: 13, fontWeight: "700", color: colors.text },
    hint: { fontSize: 11.5, color: colors.textSecondary },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, backgroundColor: t.surface },
    avatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
    avatarText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    name: { fontSize: 14.5, fontWeight: "600", color: colors.text },
    stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
    btn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: t.surfaceAlt },
    off: { opacity: 0.35 },
    count: { minWidth: 22, textAlign: "center", fontSize: 15, fontWeight: "700", color: colors.text },
});
