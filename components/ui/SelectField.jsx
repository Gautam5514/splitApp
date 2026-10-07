import { useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import * as Haptics from "expo-haptics";
import { Check, ChevronDown, ChevronUp } from "lucide-react-native";
import { useState } from "react";
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

const tap = () => { if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {}); };
const LIST_MAX = 260;

/**
 * A dropdown that opens in place: a row showing the current value; tapping it
 * expands the options right below it (no pop-up), and picking one collapses it.
 * options: [{ key, label, hint? }]
 */
export default function SelectField({ label, value, options, onChange, testID }) {
    const { colors, t } = useDesign();
    const styles = getStyles(colors, t);
    const [open, setOpen] = useState(false);
    const current = options.find((o) => o.key === value);
    const Chevron = open ? ChevronUp : ChevronDown;

    const pick = (key) => { tap(); onChange(key); setOpen(false); };

    return (
        <View style={styles.wrap}>
            <TouchableOpacity style={styles.row} onPress={() => { tap(); setOpen((v) => !v); }} activeOpacity={0.8} testID={testID}
                accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${label}: ${current?.label ?? ""}`}>
                <Text style={styles.label}>{label}</Text>
                <View style={styles.valueWrap}>
                    <Text style={styles.value} numberOfLines={1}>{current?.label ?? "-"}</Text>
                    <Chevron size={16} color={colors.textSecondary} />
                </View>
            </TouchableOpacity>

            {open && (
                <View style={styles.list}>
                    <ScrollView style={{ maxHeight: LIST_MAX }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                        {options.map((o, i) => {
                            const on = o.key === value;
                            return (
                                <TouchableOpacity key={o.key} onPress={() => pick(o.key)} activeOpacity={0.8}
                                    style={[styles.option, i < options.length - 1 && styles.divider]}
                                    accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`Option ${o.label}`}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.optionLabel, on && { color: colors.primary }]}>{o.label}</Text>
                                        {o.hint ? <Text style={styles.hint}>{o.hint}</Text> : null}
                                    </View>
                                    {on ? <Check size={17} color={colors.primary} /> : null}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}
        </View>
    );
}

const getStyles = (colors, t) => StyleSheet.create({
    wrap: { borderRadius: 18, backgroundColor: t.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline, overflow: "hidden" },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 16, height: 52 },
    label: { fontSize: 14.5, fontWeight: "600", color: colors.text },
    valueWrap: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
    value: { fontSize: 14.5, fontWeight: "700", color: colors.textSecondary },
    list: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.outline, backgroundColor: t.surfaceAlt },
    option: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
    divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.outline },
    optionLabel: { fontSize: 15, fontWeight: "600", color: colors.text },
    hint: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
