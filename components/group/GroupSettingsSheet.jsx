import BottomSheet from "@/components/ui/BottomSheet";
import { PillButton, PillInput, useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { api } from "@/lib/api";
import { Alert } from "@/lib/alert";
import { CURRENCIES, GROUP_TYPES } from "@/lib/groupPresets";
import GroupTypeIcon from "@/components/group/GroupTypeIcon";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";
import { Platform, ScrollView, StyleSheet, Switch, TextInput as RNTextInput, TouchableOpacity, View } from "react-native";

const toYmd = (d) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : null);
const fmtDay = (d) => (d ? d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) : null);

// Creator-only group settings (same fields as web).
export default function GroupSettingsSheet({ visible, group, hasExpenses, onClose, onSaved }) {
    const { colors, t, isDark } = useDesign();
    const styles = getStyles(colors, t);
    const members = group.members || [];

    const init = () => {
        const ds = group.settings?.defaultSplit || { type: "equal", weights: [] };
        const saved = Object.fromEntries((ds.weights || []).map((w) => [String(w.userId), String(w.value)]));
        return {
            groupType: group.groupType || "general",
            startDate: group.trip?.startDate ? new Date(group.trip.startDate) : null,
            endDate: group.trip?.endDate ? new Date(group.trip.endDate) : null,
            budget: group.trip?.budget != null ? String(group.trip.budget) : "",
            currency: group.settings?.currency || "INR",
            receiptRequired: !!group.settings?.receiptRequired,
            joinApproval: !!group.settings?.joinApproval,
            splitType: ds.type || "equal",
            weights: Object.fromEntries(members.map((m) => [String(m._id), saved[String(m._id)] ?? (ds.type === "percent" ? "" : "1")])),
        };
    };
    const [f, setF] = useState(init);
    const [datePicker, setDatePicker] = useState(null);
    const [saving, setSaving] = useState(false);
    useEffect(() => { if (visible) setF(init()); }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

    const set = (patch) => setF((p) => ({ ...p, ...patch }));
    const weightTotal = members.reduce((a, m) => a + (Number(f.weights[String(m._id)]) || 0), 0);

    const save = async () => {
        if (f.splitType === "percent" && Math.abs(weightTotal - 100) > 0.01) return Alert.alert("Check the split", "Default percentages must add up to 100.");
        if (f.splitType === "shares" && !(weightTotal > 0)) return Alert.alert("Check the split", "Give at least one member a share.");
        const body = {
            groupType: f.groupType,
            settings: {
                receiptRequired: f.receiptRequired,
                joinApproval: f.joinApproval,
                defaultSplit: {
                    type: f.splitType,
                    weights: f.splitType === "equal" ? [] : members.map((m) => ({ userId: String(m._id), value: Number(f.weights[String(m._id)]) || 0 })),
                },
            },
        };
        if (!hasExpenses) body.settings.currency = f.currency;
        if (f.groupType === "trip") body.trip = { startDate: toYmd(f.startDate), endDate: toYmd(f.endDate), budget: f.budget === "" ? null : f.budget };
        try {
            setSaving(true);
            const res = await api.patch(`/groups/${group._id}/settings`, body);
            onSaved?.(res.data);
            onClose?.();
        } catch (err) {
            Alert.alert("Couldn't save", err?.response?.data?.message || "Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const chip = (label, on, onPress, key) => (
        <TouchableOpacity key={key || label} onPress={onPress} style={[styles.chip, on && { backgroundColor: t.ink, borderColor: t.ink }]}>
            <Text style={[styles.chipText, on && { color: t.onInk }]}>{label}</Text>
        </TouchableOpacity>
    );
    const toggle = (label, hint, value, onChange) => (
        <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.hint}>{hint}</Text>
            </View>
            <Switch value={value} onValueChange={onChange} trackColor={{ false: "#E5E7EB", true: colors.primary }} thumbColor="#fff" ios_backgroundColor="#E5E7EB" />
        </View>
    );

    return (
        <BottomSheet visible={visible} onClose={onClose} backgroundColor={colors.background}
            header={<Text style={styles.title}>Group settings</Text>}>
            <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 18, paddingBottom: 8 }}>
                <View>
                    <Text style={styles.label}>Group type</Text>
                    <View style={styles.typeRow}>
                        {Object.values(GROUP_TYPES).map((g) => {
                            const on = f.groupType === g.key;
                            return (
                                <View key={g.key} style={[styles.typeTile, on && { backgroundColor: t.surface, borderColor: colors.text }]}
                                    accessibilityState={{ selected: on }}>
                                    <GroupTypeIcon type={g.key} size={38} muted={!on} />
                                    <Text style={[styles.typeText, !on && { color: colors.textSecondary }]} numberOfLines={1}>{g.label}</Text>
                                </View>
                            );
                        })}
                    </View>
                    <Text style={[styles.hint, { marginTop: 6 }]}>Set when the group is created and can&apos;t be changed later.</Text>
                </View>

                {f.groupType === "trip" && (
                    <View style={{ gap: 8 }}>
                        <Text style={styles.label}>Dates</Text>
                        <View style={styles.twoCol}>
                            <TouchableOpacity style={styles.dateBtn} onPress={() => setDatePicker("start")}><Text style={styles.dateText}>{fmtDay(f.startDate) || "Start"}</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.dateBtn} onPress={() => setDatePicker("end")}><Text style={styles.dateText}>{fmtDay(f.endDate) || "End"}</Text></TouchableOpacity>
                        </View>
                        {datePicker && (
                            <DateTimePicker
                                value={(datePicker === "start" ? f.startDate : f.endDate) || f.startDate || new Date()}
                                minimumDate={datePicker === "end" && f.startDate ? f.startDate : undefined}
                                mode="date" display="default" themeVariant={isDark ? "dark" : "light"}
                                onChange={(e, d) => {
                                    const which = datePicker;
                                    if (Platform.OS === "android") setDatePicker(null);
                                    if (e?.type === "dismissed" || !d) return;
                                    set(which === "start" ? { startDate: d } : { endDate: d });
                                }} />
                        )}
                        {Platform.OS === "ios" && datePicker ? <TouchableOpacity onPress={() => setDatePicker(null)}><Text style={styles.link}>Done</Text></TouchableOpacity> : null}
                        <Text style={styles.label}>Budget</Text>
                        <PillInput value={f.budget} onChangeText={(v) => set({ budget: v.replace(/[^0-9.]/g, "") })} placeholder="No budget" keyboardType="decimal-pad" />
                    </View>
                )}

                {toggle("Receipt required", "Every expense must have a bill photo", f.receiptRequired, (v) => set({ receiptRequired: v }))}
                {toggle("Approve people who join by link", "Link joins wait for your OK", f.joinApproval, (v) => set({ joinApproval: v }))}

                <View>
                    <Text style={styles.label}>Currency</Text>
                    {hasExpenses ? (
                        <Text style={styles.hint}>{f.currency} - locked once expenses exist. Use &quot;Other currency&quot; on an expense for foreign spends.</Text>
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                            {CURRENCIES.map((c) => chip(c, f.currency === c, () => set({ currency: c })))}
                        </ScrollView>
                    )}
                </View>

                <View style={{ gap: 8 }}>
                    <Text style={styles.label}>Default split for new expenses</Text>
                    <View style={styles.chips}>
                        {[["equal", "Equal"], ["shares", "Shares"], ["percent", "Percent"]].map(([k, l]) => chip(l, f.splitType === k, () => set({ splitType: k }), k))}
                    </View>
                    {f.splitType !== "equal" && (
                        <View style={styles.weights}>
                            {members.map((m) => (
                                <View key={m._id} style={styles.weightRow}>
                                    <Text style={styles.weightName} numberOfLines={1}>{m.name || m.email}</Text>
                                    <RNTextInput value={f.weights[String(m._id)] ?? ""} keyboardType="decimal-pad"
                                        onChangeText={(v) => set({ weights: { ...f.weights, [String(m._id)]: v.replace(/[^0-9.]/g, "") } })}
                                        style={styles.weightInput} placeholder="0" placeholderTextColor={colors.textSecondary} />
                                    <Text style={styles.hint}>{f.splitType === "percent" ? "%" : "share"}</Text>
                                </View>
                            ))}
                            <Text style={[styles.hint, f.splitType === "percent" && Math.abs(weightTotal - 100) > 0.01 && { color: "#D97706" }]}>
                                Total: {weightTotal}{f.splitType === "percent" ? "%" : " shares"}
                            </Text>
                        </View>
                    )}
                    <Text style={styles.hint}>E.g. the bigger room pays 2 shares of rent. You can still change it per expense.</Text>
                </View>
            </ScrollView>
            <PillButton variant="primary" label="Save settings" onPress={save} loading={saving} style={{ marginTop: 12 }} />
        </BottomSheet>
    );
}

const getStyles = (colors, t) => StyleSheet.create({
    title: { fontSize: 17, fontWeight: "700", color: colors.text, marginBottom: 12 },
    label: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 6 },
    hint: { fontSize: 12, color: colors.textSecondary },
    link: { fontSize: 13, fontWeight: "700", color: colors.primary },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, backgroundColor: t.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline },
    chipText: { fontSize: 12.5, fontWeight: "600", color: colors.text },
    typeRow: { flexDirection: "row", gap: 8 },
    typeTile: { flex: 1, alignItems: "center", gap: 8, paddingTop: 12, paddingBottom: 10, borderRadius: 18, borderWidth: 1.5, borderColor: "transparent" },
    typeText: { fontSize: 11.5, fontWeight: "700", color: colors.text },
    switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    twoCol: { flexDirection: "row", gap: 10 },
    dateBtn: { flex: 1, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: t.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline },
    dateText: { fontSize: 14.5, fontWeight: "600", color: colors.text },
    weights: { gap: 6, padding: 10, borderRadius: 16, backgroundColor: t.surface },
    weightRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    weightName: { flex: 1, fontSize: 14, color: colors.text },
    weightInput: { width: 70, height: 36, borderRadius: 10, paddingHorizontal: 8, textAlign: "right", color: colors.text, backgroundColor: t.surfaceAlt },
});
