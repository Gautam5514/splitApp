import BottomSheet from "@/components/ui/BottomSheet";
import { PillButton, PillInput, useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { api } from "@/lib/api";
import { Alert } from "@/lib/alert";
import { CURRENCIES, GROUP_TYPES } from "@/lib/groupPresets";
import GroupTypeIcon from "@/components/group/GroupTypeIcon";
import { buildSettingsPayload, validateDefaultSplit, isLockedError } from "@/lib/groupSettingsPayload";
import { X } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";
import { Platform, ScrollView, StyleSheet, Switch, TextInput as RNTextInput, TouchableOpacity, View } from "react-native";

const toYmd = (d) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : null);
const fmtDay = (d) => (d ? d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) : null);

// Creator-only group settings (same fields as web).
export default function GroupSettingsSheet({ visible, group, hasExpenses: hasExpensesProp, onClose, onSaved }) {
    const { colors, t, isDark } = useDesign();
    const styles = getStyles(colors, t);
    const members = group.members || [];
    // Server flag wins; the list length covers an expense added this session.
    const [serverLocked, setServerLocked] = useState(false);
    const hasExpenses = !!(hasExpensesProp || group.hasExpenses || serverLocked);

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
    useEffect(() => { if (visible) { setF(init()); setServerLocked(false); } }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

    const set = (patch) => setF((p) => ({ ...p, ...patch }));
    const weightTotal = members.reduce((a, m) => a + (Number(f.weights[String(m._id)]) || 0), 0);

    const save = async () => {
        if (!hasExpenses) {
            const problem = validateDefaultSplit({ splitType: f.splitType, weights: f.weights, members });
            if (problem) return Alert.alert("Check the split", problem);
        }
        const body = buildSettingsPayload({
            locked: hasExpenses, receiptRequired: f.receiptRequired, joinApproval: f.joinApproval, currency: f.currency,
            splitType: f.splitType, weights: f.weights, members, groupType: f.groupType,
            trip: { startDate: toYmd(f.startDate), endDate: toYmd(f.endDate), budget: f.budget },
        });
        try {
            setSaving(true);
            const res = await api.patch(`/groups/${group._id}/settings`, body);
            onSaved?.(res.data);
            onClose?.();
        } catch (err) {
            if (isLockedError(err)) setServerLocked(true); // an expense was added meanwhile
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
    const unit = f.splitType === "percent" ? "%" : f.splitType === "shares" ? "shares" : "";
    const splitName = { equal: "Equal", shares: "By shares", percent: "By percent" }[f.splitType] || "Equal";
    const splitHint = {
        equal: "Everyone pays the same amount.",
        shares: "Bigger share, bigger part of the bill.",
        percent: "Each person pays a fixed percent.",
    }[f.splitType] || "";
    const sharePct = (m) => Math.round(((Number(f.weights[String(m._id)]) || 0) / (weightTotal || 1)) * 100);

    const section = (title, children) => (
        <View>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
        </View>
    );
    const avatar = (name) => (
        <View style={styles.avatar}><Text style={styles.avatarText}>{(name || "?").charAt(0).toUpperCase()}</Text></View>
    );
    // Plain read-only line: label left, value right. No controls.
    const infoRow = (name, value, last) => (
        <View key={name} style={[styles.infoRow, !last && styles.rowDivider]}>
            <Text style={styles.infoLabel}>{name}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    );
    const toggle = (label, hint, value, onChange, last) => (
        <View style={[styles.switchRow, !last && styles.rowDivider]}>
            <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{label}</Text>
                <Text style={styles.hint}>{hint}</Text>
            </View>
            <Switch value={value} onValueChange={onChange} trackColor={{ false: "#E5E7EB", true: colors.primary }} thumbColor="#fff" ios_backgroundColor="#E5E7EB" />
        </View>
    );

    return (
        <BottomSheet visible={visible} onClose={onClose} backgroundColor={colors.background}
            header={(
                <View style={styles.headerRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title}>Group settings</Text>
                        {group.name ? <Text style={styles.hint} numberOfLines={1}>{group.name}</Text> : null}
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close"
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <X size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            )}>
            <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 22, paddingBottom: 8 }}>
                {section("Group type", (
                    <View style={styles.card}>
                        <View style={styles.typeRow}>
                            {Object.values(GROUP_TYPES).map((g) => {
                                const on = f.groupType === g.key;
                                return (
                                    <View key={g.key} style={[styles.typeTile, on && styles.typeTileOn]} accessibilityState={{ selected: on }}>
                                        <GroupTypeIcon type={g.key} size={34} muted={!on} />
                                        <Text style={[styles.typeText, !on && { color: colors.textSecondary, opacity: 0.6 }]} numberOfLines={1}>{g.label}</Text>
                                    </View>
                                );
                            })}
                        </View>
                        {!hasExpenses ? <Text style={[styles.hint, styles.cardPad]}>Set when the group is created and can&apos;t be changed later.</Text> : null}
                    </View>
                ))}

                {section("Rules", (
                    <View style={styles.card}>
                        {toggle("Receipt required", "Every expense must have a bill photo", f.receiptRequired, (v) => set({ receiptRequired: v }))}
                        {toggle("Approve people who join by link", "Link joins wait for your OK", f.joinApproval, (v) => set({ joinApproval: v }), true)}
                    </View>
                ))}

                {f.groupType === "trip" && section("Trip", hasExpenses ? (
                    <View style={styles.card}>
                        {infoRow("Start date", fmtDay(f.startDate) || "-")}
                        {infoRow("End date", fmtDay(f.endDate) || "-")}
                        {infoRow("Budget", f.budget === "" ? "-" : `${f.currency} ${f.budget}`, true)}
                    </View>
                ) : (
                    <View style={[styles.card, styles.cardPad, { gap: 10 }]}>
                        <View style={styles.twoCol}>
                            <TouchableOpacity style={styles.dateBtn} onPress={() => setDatePicker("start")}>
                                <Text style={styles.dateText}>{fmtDay(f.startDate) || "Start"}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.dateBtn} onPress={() => setDatePicker("end")}>
                                <Text style={styles.dateText}>{fmtDay(f.endDate) || "End"}</Text>
                            </TouchableOpacity>
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
                        <PillInput value={f.budget} onChangeText={(v) => set({ budget: v.replace(/[^0-9.]/g, "") })} placeholder="No budget" keyboardType="decimal-pad" />
                    </View>
                ))}

                {section("Money", hasExpenses ? (
                    <View style={styles.card} testID="split-locked">
                        {infoRow("Currency", f.currency)}
                        {infoRow("Default split", splitName, f.splitType === "equal")}
                        {f.splitType !== "equal" && members.map((m, i) => (
                            <View key={m._id} style={[styles.innerRow, i < members.length - 1 && styles.rowDivider]}>
                                {avatar(m.name || m.email)}
                                <Text style={[styles.weightName, { flex: 1 }]} numberOfLines={1}>{m.name || m.email}</Text>
                                <Text style={styles.weightValue}>{String(f.weights[String(m._id)] || 0)}</Text>
                                <Text style={styles.unit}>{unit}</Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={[styles.card, styles.cardPad, { gap: 18 }]}>
                        <View>
                            <Text style={styles.rowTitle}>Currency</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 8 }}>
                                {CURRENCIES.map((c) => chip(c, f.currency === c, () => set({ currency: c })))}
                            </ScrollView>
                        </View>

                        <View>
                            <Text style={styles.rowTitle}>Default split for new expenses</Text>
                            <View style={styles.segment}>
                                {[["equal", "Equal"], ["shares", "Shares"], ["percent", "Percent"]].map(([k, l]) => {
                                    const on = f.splitType === k;
                                    return (
                                        <TouchableOpacity key={k} onPress={() => set({ splitType: k })} activeOpacity={0.85}
                                            style={[styles.segBtn, on && { backgroundColor: t.ink }]} accessibilityState={{ selected: on }}>
                                            <Text style={[styles.segText, on && { color: t.onInk }]}>{l}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            <Text style={[styles.hint, { marginTop: 8 }]}>{splitHint}</Text>

                            {f.splitType !== "equal" && (
                                <View style={[styles.inner, { marginTop: 12 }]}>
                                    {members.map((m) => (
                                        <View key={m._id} style={[styles.innerRow, styles.rowDivider]}>
                                            {avatar(m.name || m.email)}
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.weightName} numberOfLines={1}>{m.name || m.email}</Text>
                                                {f.splitType === "shares" ? <Text style={styles.hint}>{`${sharePct(m)}% of each bill`}</Text> : null}
                                            </View>
                                            <RNTextInput value={f.weights[String(m._id)] ?? ""} keyboardType="decimal-pad"
                                                onChangeText={(v) => set({ weights: { ...f.weights, [String(m._id)]: v.replace(/[^0-9.]/g, "") } })}
                                                style={styles.weightInput} placeholder="0" placeholderTextColor={colors.textSecondary} />
                                            <Text style={styles.unit}>{unit}</Text>
                                        </View>
                                    ))}
                                    <View style={styles.innerRow}>
                                        <Text style={[styles.hint, { flex: 1, fontWeight: "700" }]}>Total</Text>
                                        <Text style={[styles.hint, { fontWeight: "700" }, f.splitType === "percent" && Math.abs(weightTotal - 100) > 0.01 && { color: "#D97706" }]}>
                                            {f.splitType === "percent" ? `${weightTotal}% of 100%` : `${weightTotal} shares`}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                ))}
            </ScrollView>
            <PillButton variant="primary" label="Save settings" onPress={save} loading={saving} style={{ marginTop: 12 }} />
        </BottomSheet>
    );
}

const getStyles = (colors, t) => StyleSheet.create({
    headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
    closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: t.surfaceAlt },
    title: { fontSize: 19, fontWeight: "800", color: colors.text },
    sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", color: colors.textSecondary, marginBottom: 8, marginLeft: 4 },
    rowTitle: { fontSize: 14.5, fontWeight: "700", color: colors.text },
    hint: { fontSize: 12, color: colors.textSecondary },
    link: { fontSize: 13, fontWeight: "700", color: colors.primary },
    card: { borderRadius: 20, backgroundColor: t.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline, overflow: "hidden" },
    cardPad: { padding: 14 },
    rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.outline },
    infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
    infoLabel: { fontSize: 14, color: colors.textSecondary },
    infoValue: { fontSize: 14.5, fontWeight: "700", color: colors.text },
    chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, backgroundColor: t.surfaceAlt, borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline },
    chipText: { fontSize: 12.5, fontWeight: "600", color: colors.text },
    typeRow: { flexDirection: "row", gap: 4, padding: 6 },
    typeTile: { flex: 1, alignItems: "center", gap: 6, paddingTop: 10, paddingBottom: 8, borderRadius: 14 },
    typeTileOn: { backgroundColor: t.surfaceAlt, borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline },
    typeText: { fontSize: 11, fontWeight: "700", color: colors.text },
    switchRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
    twoCol: { flexDirection: "row", gap: 10 },
    dateBtn: { flex: 1, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: t.surfaceAlt },
    dateText: { fontSize: 14.5, fontWeight: "600", color: colors.text },
    off: { opacity: 0.5 },
    segment: { flexDirection: "row", gap: 4, padding: 4, marginTop: 8, borderRadius: 16, backgroundColor: t.surfaceAlt },
    segBtn: { flex: 1, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    segText: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
    inner: { borderRadius: 16, backgroundColor: t.surfaceAlt, overflow: "hidden" },
    innerRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
    avatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(8,145,178,0.15)" },
    avatarText: { fontSize: 12, fontWeight: "800", color: colors.primary },
    weightName: { fontSize: 14, color: colors.text },
    weightValue: { fontSize: 14.5, fontWeight: "700", color: colors.text },
    unit: { width: 40, fontSize: 12, color: colors.textSecondary },
    weightInput: { width: 64, height: 36, borderRadius: 10, paddingHorizontal: 8, textAlign: "right", fontWeight: "700", color: colors.text, backgroundColor: t.surface },
});
