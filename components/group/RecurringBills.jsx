import { Block, IconCircle, ListRow, PillButton, PillInput, RoundButton, SectionLabel, useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { api } from "@/lib/api";
import { Alert } from "@/lib/alert";
import { categoriesForGroup, categoryMeta, formatMoney } from "@/lib/groupPresets";
import { Pause, Play, Plus, Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

const fmtDay = (d) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
const ordinal = (n) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

// Monthly bills (rent, WiFi…) added automatically on their day - Roommates.
export default function RecurringBills({ group, meId, onChanged }) {
    const { colors, t } = useDesign();
    const styles = getStyles(colors, t);
    const currency = group.settings?.currency || "INR";
    const members = group.members || [];
    const categories = categoriesForGroup(group);
    const [rules, setRules] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        description: "", amount: "", dayOfMonth: group.roommate?.billDay || 1,
        category: categories.includes("rent") ? "rent" : categories[0], paidBy: String(meId || members[0]?._id || ""),
    });

    const load = () => api.get(`/groups/${group._id}/recurring`).then((r) => setRules(r.data || [])).catch(() => {});
    useEffect(() => { load(); }, [group._id]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (meId) setForm((f) => ({ ...f, paidBy: f.paidBy || String(meId) })); }, [meId]);

    const create = async () => {
        if (!form.description.trim()) return Alert.alert("Name the bill", "For example: Rent");
        if (!(Number(form.amount) > 0)) return Alert.alert("Enter an amount", "");
        try {
            setSaving(true);
            await api.post(`/groups/${group._id}/recurring`, { ...form, amount: Number(form.amount) });
            setShowForm(false);
            setForm((f) => ({ ...f, description: "", amount: "" }));
            load();
            onChanged?.();
        } catch (err) {
            Alert.alert("Couldn't add bill", err?.response?.data?.message || "Please try again.");
        } finally {
            setSaving(false);
        }
    };
    const toggle = async (r) => {
        try { await api.patch(`/groups/${group._id}/recurring/${r._id}`, { active: !r.active }); load(); onChanged?.(); }
        catch (err) { Alert.alert("Couldn't update", err?.response?.data?.message || "Please try again."); }
    };
    const remove = (r) => Alert.alert(`Delete "${r.description}"?`, "Expenses already added stay.", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
            try { await api.delete(`/groups/${group._id}/recurring/${r._id}`); load(); onChanged?.(); }
            catch (err) { Alert.alert("Couldn't delete", err?.response?.data?.message || "Please try again."); }
        } },
    ]);

    const chip = (label, on, onPress, key) => (
        <TouchableOpacity key={key || label} onPress={onPress} style={[styles.chip, on && { backgroundColor: t.ink, borderColor: t.ink }]}>
            <Text style={[styles.chipText, on && { color: t.onInk }]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <>
            <SectionLabel right={!showForm ? (
                <TouchableOpacity onPress={() => setShowForm(true)} style={styles.inline}><Plus size={15} color={colors.primary} /><Text style={styles.link}>Add bill</Text></TouchableOpacity>
            ) : null}>
                Monthly bills
            </SectionLabel>
            {showForm && (
                <Block>
                    <View style={{ gap: 10 }}>
                        <PillInput placeholder="Rent, WiFi, Maid…" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} maxLength={200} />
                        <PillInput placeholder="Amount" keyboardType="decimal-pad" value={form.amount} onChangeText={(v) => setForm({ ...form, amount: v.replace(/[^0-9.]/g, "") })} />
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => chip(`Every ${ordinal(d)}`, form.dayOfMonth === d, () => setForm({ ...form, dayOfMonth: d }), `d${d}`))}
                        </ScrollView>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                            {categories.map((c) => chip(categoryMeta(c).label, form.category === c, () => setForm({ ...form, category: c }), c))}
                        </ScrollView>
                        <Text style={styles.hint}>You pay it; it&apos;s split among everyone the group&apos;s way.</Text>
                        <View style={{ flexDirection: "row", gap: 10 }}>
                            <PillButton variant="secondary" label="Cancel" onPress={() => setShowForm(false)} style={{ flex: 1 }} />
                            <PillButton variant="primary" label="Save" onPress={create} loading={saving} style={{ flex: 1 }} />
                        </View>
                    </View>
                </Block>
            )}
            <Block padded={false}>
                {rules.length === 0 ? (
                    <View style={{ padding: 16 }}><Text style={styles.hint}>Add rent or WiFi once - it&apos;s split every month on its own.</Text></View>
                ) : rules.map((r) => {
                    const Icon = categoryMeta(r.category).Icon;
                    return (
                        <ListRow key={r._id} style={!r.active && { opacity: 0.55 }}
                            leading={<IconCircle size={40}><Icon size={17} color={colors.primary} /></IconCircle>}
                            title={`${r.description} · ${formatMoney(r.amount, currency)}`}
                            subtitle={`${r.active ? `Next on ${fmtDay(r.nextRunAt)}` : "Paused"} · ${r.paidBy?.name || "Someone"} pays`}
                            trailing={
                                <View style={styles.inline}>
                                    <RoundButton size={34} label={r.active ? "Pause" : "Resume"} onPress={() => toggle(r)}>
                                        {r.active ? <Pause size={14} color={colors.textSecondary} /> : <Play size={14} color={colors.textSecondary} />}
                                    </RoundButton>
                                    <RoundButton size={34} label="Delete" onPress={() => remove(r)}><Trash2 size={14} color={colors.error} /></RoundButton>
                                </View>
                            } />
                    );
                })}
            </Block>
        </>
    );
}

const getStyles = (colors, t) => StyleSheet.create({
    inline: { flexDirection: "row", alignItems: "center", gap: 6 },
    link: { fontSize: 13.5, fontWeight: "700", color: colors.primary },
    hint: { fontSize: 12.5, color: colors.textSecondary },
    chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, backgroundColor: t.surfaceAlt, borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline },
    chipText: { fontSize: 12.5, fontWeight: "600", color: colors.text },
});
