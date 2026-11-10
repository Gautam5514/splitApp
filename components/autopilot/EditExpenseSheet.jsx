/**
 * Change an expense in a waiting plan without retyping it: title, amount and who
 * shares it. The server rebuilds and re-checks the plan from these edits.
 */
import BottomSheet from "@/components/ui/BottomSheet";
import { PillButton, PillInput, useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { R } from "@/constants/design";
import { editChanges } from "@/lib/autopilot";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

export default function EditExpenseSheet({ step, onClose, onSave }) {
    const { colors, t } = useDesign();
    const s = getStyles(colors, t);
    const p = step?.payload;
    const [title, setTitle] = useState("");
    const [amount, setAmount] = useState("");
    const [chosen, setChosen] = useState(new Set());
    useEffect(() => {
        if (!p) return;
        setTitle(p.name || ""); setAmount(String(p.amountMinor / 100)); setChosen(new Set(p.splits.map((x) => x.memberId)));
    }, [p]);
    if (!p) return <BottomSheet visible={false} onClose={onClose} />;
    const exact = p.splitType === "exact";
    const roster = p.roster || p.splits.map((x) => ({ memberId: x.memberId, name: x.name }));
    const { changes, valid } = editChanges(step, { title, amount, chosen });
    const toggle = (id) => setChosen((c) => { const n = new Set(c); if (n.has(id)) { if (n.size > 1) n.delete(id); } else n.add(id); return n; });
    return (
        <BottomSheet visible={!!step} onClose={onClose} backgroundColor={colors.background}>
            <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
                <Text style={s.heading}>Edit this expense</Text>
                <Text style={s.label}>What</Text>
                <PillInput value={title} onChangeText={setTitle} maxLength={200} placeholder="Dinner" accessibilityLabel="Expense title" />
                <Text style={s.label}>Amount ({p.currency})</Text>
                <PillInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" editable={!exact} placeholder="0" accessibilityLabel="Amount" />
                {!valid && <Text style={[s.hint, { color: colors.error }]}>Enter an amount above zero, with up to 2 decimals.</Text>}
                {exact ? (
                    <Text style={s.hint}>This bill has exact shares. Type the new shares in the chat, like &quot;me 300, Aman 600&quot;.</Text>
                ) : (
                    <>
                        <Text style={s.label}>Split between</Text>
                        <View style={s.chips}>
                            {roster.map((r) => {
                                const on = chosen.has(r.memberId);
                                return (
                                    <TouchableOpacity key={r.memberId} onPress={() => toggle(r.memberId)} activeOpacity={0.8} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={r.name}
                                        style={[s.chip, on ? { backgroundColor: t.ink, borderColor: t.ink } : null]}>
                                        <Text style={[s.chipText, { color: on ? t.onInk : colors.textSecondary }, !on && { textDecorationLine: "line-through" }]}>{r.name}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </>
                )}
                <PillButton label="Update plan" disabled={!valid || !Object.keys(changes).length} onPress={() => onSave(changes)} style={{ marginTop: 18 }} />
                <PillButton label="Cancel" variant="secondary" onPress={onClose} style={{ marginTop: 10, backgroundColor: t.fillStrong, borderWidth: 0, shadowOpacity: 0, elevation: 0 }} />
            </ScrollView>
        </BottomSheet>
    );
}

const getStyles = (colors, t) => StyleSheet.create({
    body: { paddingHorizontal: 20, paddingBottom: 24 },
    heading: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 6 },
    label: { fontSize: 12.5, fontWeight: "600", color: colors.textSecondary, marginTop: 14, marginBottom: 6 },
    hint: { fontSize: 12.5, color: colors.textSecondary, marginTop: 8, lineHeight: 18 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { backgroundColor: t.fillStrong, borderWidth: 1, borderColor: "transparent", borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 8 },
    chipText: { fontSize: 13.5, fontWeight: "600" },
});
