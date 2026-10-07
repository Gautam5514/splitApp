import { useBottomSpacing } from "@/hooks/useSafeSpacing";
import { Alert } from "@/lib/alert";
import { SCREEN_GUTTER } from "@/constants/layout";
import GroupIconPicker from "@/components/GroupIconPicker";
import InviteModal from "@/components/InviteModal";
import PeoplePicker from "@/components/people/PeoplePicker";
import GroupTypeIcon from "@/components/group/GroupTypeIcon";
import { PillButton, PillInput, ScreenHeader, useDesign } from "@/components/ui/Design";
import { api } from "@/lib/api";
import { getGroupIcon } from "@/lib/groupIcons";
import { CURRENCIES, GROUP_TYPES, PRIMARY_GROUP_TYPES, groupTypeMeta, suggestGroupName } from "@/lib/groupPresets";
import { addPeopleToGroup, describeAddResult } from "@/lib/people";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { CalendarDays, Camera, ChevronRight, Receipt, Sparkles, Wallet } from "lucide-react-native";
import { useState } from "react";
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    TouchableOpacity,
    View,
} from "react-native";
import { Text } from "@/components/ui/Typography";
import { SafeAreaView } from "react-native-safe-area-context";

const MAX = 60;
// New groups are Roommates unless the user picks something else.
const DEFAULT_TYPE = "roommate";
const QUICK_ICONS = {
    roommate: ["home", "building2", "shoppingCart", "utensils", "coffee", "sparkles"],
    trip: ["plane", "mountain", "car", "treePine", "camera", "mapPin"],
    business: ["briefcase", "building2", "wallet", "trainFront", "coffee", "sparkles"],
    general: ["users", "partyPopper", "utensils", "gift", "gamepad2", "sparkles"],
};

const tap = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
};
const toYmd = (d) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : null);
const fmtDay = (d) => (d ? d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) : null);

/**
 * 3-step create flow (same as web):
 *   1. What's it for - Roommates / Trip / Business / Other
 *   2. Name, photo or icon, and the type's details (dates, budget, bill day…)
 *   3. Add people - contacts by name, anyone else by full email (invite). Skippable.
 * Then the invite-link sheet, then the group.
 */
export default function CreateGroupScreen() {
    const { colors, isDark, t } = useDesign();
    const footerBottomPadding = useBottomSpacing(16);
    const styles = getStyles(colors, isDark, t);

    const [step, setStep] = useState(0);
    const [type, setType] = useState(null);
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [icon, setIcon] = useState(null);
    const [showAllIcons, setShowAllIcons] = useState(false);
    const [photo, setPhoto] = useState(null); // { uri, base64 }
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [datePicker, setDatePicker] = useState(null); // "start" | "end" | null
    const [budget, setBudget] = useState("");
    const [currency, setCurrency] = useState("INR");
    const [receiptRequired, setReceiptRequired] = useState(false);
    const [splitMode, setSplitMode] = useState("equal"); // "equal" | "shares"
    const [selected, setSelected] = useState([]);
    const [creating, setCreating] = useState(false);
    const [createdId, setCreatedId] = useState(null);

    const meta = groupTypeMeta(type);
    const trimmed = name.trim();
    const PreviewIcon = getGroupIcon(icon) || meta.Icon;

    const pickType = (key) => {
        tap();
        setType(key);
        setIcon(GROUP_TYPES[key].icon);
        if (!trimmed) setName(suggestGroupName(key));
        setStep(1);
    };

    const validateDetails = () => {
        if (!trimmed) return "Please name your group.";
        if (trimmed.length < 2) return "Use at least 2 characters.";
        if (trimmed.length > MAX) return `Keep it under ${MAX} characters.`;
        if (startDate && endDate && endDate < startDate) return "End date can't be before the start date.";
        if (budget && !(Number(budget) > 0)) return "Budget must be a positive amount.";
        return "";
    };

    const goToPeople = () => {
        const v = validateDetails();
        if (v) { setError(v); return; }
        setError("");
        setStep(2);
    };

    const pickPhoto = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });
        if (!result.canceled && result.assets[0]) {
            const a = result.assets[0];
            setPhoto({ uri: a.uri, base64: `data:${a.mimeType || "image/jpeg"};base64,${a.base64}` });
        }
    };

    const onDateChange = (event, date) => {
        const which = datePicker;
        if (Platform.OS === "android") setDatePicker(null);
        if (event?.type === "dismissed" || !date) return;
        if (which === "start") setStartDate(date);
        else setEndDate(date);
    };

    const createGroup = async () => {
        if (creating) return;
        const v = validateDetails();
        if (v) { setError(v); setStep(1); return; }
        try {
            setCreating(true);
            const body = { name: trimmed, groupType: type, icon: photo ? null : icon };
            if (type === "trip") body.trip = { startDate: toYmd(startDate), endDate: toYmd(endDate), budget: budget || null };
            if (type === "trip" || type === "business") body.settings = { currency };
            if (type === "business") body.settings = { ...body.settings, receiptRequired };
            // How expenses are split is decided here, once - not on every expense.
            if (splitMode === "shares") body.settings = { ...body.settings, defaultSplit: { type: "shares", weights: [] } };

            const res = await api.post("/groups", body);
            const groupId = res.data._id;
            const notes = [];

            // Members and photo use their own endpoints; a failure there
            // shouldn't lose the group that was already created. They're
            // independent, so run them in parallel (notes keep their order).
            const [memberNote, photoNote] = await Promise.all([
                selected.length
                    ? addPeopleToGroup(groupId, selected).then(
                        (r) => describeAddResult(r),
                        (err) => err?.response?.data?.message || "Adding people failed - try again from the group."
                    )
                    : null,
                photo
                    ? api.post(`/groups/${groupId}/photo`, { file: photo.base64 }, { timeout: 60000 }).then(
                        () => null,
                        () => "The photo didn't upload - you can add it later."
                    )
                    : null,
            ]);
            if (memberNote) notes.push(memberNote);
            if (photoNote) notes.push(photoNote);
            if (notes.length) {
                Alert.alert("Group created", notes.join("\n"), [
                    { text: "Cancel", style: "cancel", onPress: () => goToGroupById(groupId) },
                    { text: "Done", onPress: () => setCreatedId(groupId) },
                ]);
            } else {
                Alert.alert("Group created 🎉", "Your group is ready.", [
                    { text: "Cancel", style: "cancel", onPress: () => goToGroupById(groupId) },
                    { text: "Done", onPress: () => setCreatedId(groupId) },
                ]);
            }
        } catch (err) {
            const message = err?.response?.data?.message;
            Alert.alert(
                "Could not create group",
                /duplicate|already (exists|have)/i.test(message || "")
                    ? "You already have a group with this name. Please choose another name."
                    : message || "Please check your connection and try again."
            );
        } finally {
            setCreating(false);
        }
    };

    const goToGroupById = (id) => {
        if (id) router.replace({ pathname: "/groups/[id]", params: { id, returnTo: "trips" } });
        else router.back();
    };

    const goToGroup = () => {
        const id = createdId;
        setCreatedId(null);
        goToGroupById(id);
    };

    const onBack = () => (step > 0 ? setStep(step - 1) : router.back());
    const title = step === 0 ? "New Group" : step === 1 ? `${meta.label} details` : "Add people";

    const chip = (label, on, onPress, key) => (
        <TouchableOpacity key={key || label} onPress={() => { tap(); onPress(); }} activeOpacity={0.8}
            style={[styles.chip, on && { backgroundColor: t.ink, borderColor: t.ink }]}>
            <Text style={[styles.chipText, on && { color: t.onInk }]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <ScreenHeader back onBack={onBack} title={title} subtitle={`Step ${step + 1} of 3`} />

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                    {/* ── Step 1: type ── */}
                    {step === 0 && (
                        <View style={styles.gutter}>
                            <Text style={styles.lead}>What&apos;s this group for?</Text>
                            {[...PRIMARY_GROUP_TYPES, "general"].map((key) => {
                                const g = GROUP_TYPES[key];
                                const isDefault = key === DEFAULT_TYPE;
                                return (
                                    <TouchableOpacity key={key} style={[styles.typeCard, isDefault && { borderColor: colors.text, borderWidth: 1.5 }]}
                                        onPress={() => pickType(key)} activeOpacity={0.8}
                                        accessibilityRole="button" accessibilityLabel={`${g.label}${isDefault ? " (default)" : ""}: ${g.tagline}`}>
                                        <GroupTypeIcon type={key} size={50} />
                                        <View style={{ flex: 1 }}>
                                            <View style={styles.titleRow}>
                                                <Text style={styles.typeTitle}>{g.label}</Text>
                                                {isDefault ? (
                                                    <View style={[styles.defaultBadge, { backgroundColor: t.ink }]}>
                                                        <Text style={[styles.defaultBadgeText, { color: t.onInk }]}>Default</Text>
                                                    </View>
                                                ) : null}
                                            </View>
                                            <Text style={styles.typeDesc}>{g.tagline}</Text>
                                        </View>
                                        <ChevronRight size={18} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    {/* ── Step 2: details ── */}
                    {step === 1 && (
                        <View style={styles.gutter}>
                            <View style={styles.identity}>
                                <TouchableOpacity onPress={pickPhoto} activeOpacity={0.85} accessibilityLabel="Add a group photo">
                                    {photo ? (
                                        <Image source={{ uri: photo.uri }} style={styles.avatarBig} />
                                    ) : (
                                        <LinearGradient colors={meta.accent} style={styles.avatarBig}>
                                            <PreviewIcon size={30} color="#fff" strokeWidth={2.2} />
                                        </LinearGradient>
                                    )}
                                    <View style={styles.cameraBadge}><Camera size={12} color="#fff" /></View>
                                </TouchableOpacity>
                                <View style={{ flex: 1 }}>
                                    <PillInput
                                        icon={<Sparkles size={17} color={colors.textSecondary} />}
                                        value={name}
                                        onChangeText={(v) => { setName(v.slice(0, MAX)); if (error) setError(""); }}
                                        placeholder={meta.namePlaceholder}
                                        returnKeyType="next"
                                    />
                                </View>
                            </View>
                            {error ? <Text style={styles.errorText}>{error}</Text> : null}

                            {photo ? (
                                <TouchableOpacity onPress={() => setPhoto(null)}><Text style={styles.linkText}>Remove photo, use an icon</Text></TouchableOpacity>
                            ) : (
                                <>
                                    <View style={styles.chipsRow}>
                                        {QUICK_ICONS[type].map((k) => {
                                            const I = getGroupIcon(k);
                                            if (!I) return null;
                                            const on = icon === k;
                                            return (
                                                <TouchableOpacity key={k} onPress={() => { tap(); setIcon(k); }}
                                                    style={[styles.iconBtn, on && { backgroundColor: t.ink, borderColor: t.ink }]} accessibilityLabel={k}>
                                                    <I size={18} color={on ? t.onInk : colors.textSecondary} />
                                                </TouchableOpacity>
                                            );
                                        })}
                                        {chip(showAllIcons ? "Less" : "More", false, () => setShowAllIcons((v) => !v), "more")}
                                    </View>
                                    {showAllIcons && (
                                        <View style={{ marginTop: 12 }}>
                                            <GroupIconPicker value={icon} onChange={setIcon} colors={colors} tint={colors.primary} />
                                        </View>
                                    )}
                                </>
                            )}

                            {type === "trip" && (
                                <View style={styles.panel}>
                                    <View style={styles.panelTitleRow}><CalendarDays size={14} color={colors.primary} /><Text style={styles.panelTitle}>Dates (optional)</Text></View>
                                    <View style={styles.twoCol}>
                                        <TouchableOpacity style={styles.dateBtn} onPress={() => setDatePicker("start")}>
                                            <Text style={[styles.dateText, !startDate && { color: colors.textSecondary }]}>{fmtDay(startDate) || "Start"}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.dateBtn} onPress={() => setDatePicker("end")}>
                                            <Text style={[styles.dateText, !endDate && { color: colors.textSecondary }]}>{fmtDay(endDate) || "End"}</Text>
                                        </TouchableOpacity>
                                    </View>
                                    {datePicker && (
                                        <DateTimePicker
                                            value={(datePicker === "start" ? startDate : endDate) || startDate || new Date()}
                                            minimumDate={datePicker === "end" && startDate ? startDate : undefined}
                                            mode="date"
                                            display="default"
                                            onChange={onDateChange}
                                            themeVariant={isDark ? "dark" : "light"}
                                        />
                                    )}
                                    {Platform.OS === "ios" && datePicker && (
                                        <TouchableOpacity onPress={() => setDatePicker(null)}><Text style={styles.linkText}>Done</Text></TouchableOpacity>
                                    )}
                                    <View style={[styles.panelTitleRow, { marginTop: 14 }]}><Wallet size={14} color={colors.primary} /><Text style={styles.panelTitle}>Budget (optional)</Text></View>
                                    <PillInput value={budget} onChangeText={(v) => setBudget(v.replace(/[^0-9.]/g, ""))} placeholder="15000" keyboardType="decimal-pad" />
                                    <Text style={[styles.panelTitle, { marginTop: 14 }]}>Currency</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hChips}>
                                        {CURRENCIES.map((c) => chip(c, currency === c, () => setCurrency(c)))}
                                    </ScrollView>
                                </View>
                            )}

                            {type === "business" && (
                                <View style={styles.panel}>
                                    <View style={styles.switchRow}>
                                        <View style={{ flex: 1 }}>
                                            <View style={styles.panelTitleRow}><Receipt size={14} color={colors.primary} /><Text style={styles.panelTitle}>Receipt required</Text></View>
                                            <Text style={styles.hint}>Every expense must have a bill photo</Text>
                                        </View>
                                        <Switch value={receiptRequired} onValueChange={setReceiptRequired}
                                            trackColor={{ false: "#E5E7EB", true: colors.primary }} thumbColor="#fff" ios_backgroundColor="#E5E7EB" />
                                    </View>
                                    <Text style={[styles.panelTitle, { marginTop: 14 }]}>Currency</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hChips}>
                                        {CURRENCIES.map((c) => chip(c, currency === c, () => setCurrency(c)))}
                                    </ScrollView>
                                </View>
                            )}

                            {/* Split: chosen once, here - not on every expense */}
                            <View style={{ marginTop: 6 }}>
                                <Text style={styles.panelTitle}>How do you split expenses?</Text>
                                <View style={[styles.twoCol, { marginTop: 8 }]}>
                                    {[
                                        { key: "equal", title: "Equally", hint: "Everyone pays the same" },
                                        { key: "shares", title: "By shares", hint: "Bigger room = 2 shares" },
                                    ].map((o) => {
                                        const on = splitMode === o.key;
                                        return (
                                            <TouchableOpacity key={o.key} onPress={() => { tap(); setSplitMode(o.key); }} activeOpacity={0.85}
                                                style={[styles.splitOpt, on && { backgroundColor: t.ink, borderColor: t.ink }]}
                                                accessibilityState={{ selected: on }}>
                                                <Text style={[styles.splitTitle, on && { color: t.onInk }]}>{o.title}</Text>
                                                <Text style={[styles.splitHint, on && { color: t.onInk, opacity: 0.75 }]}>{o.hint}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                                {splitMode === "shares" ? (
                                    <Text style={[styles.hint, { marginTop: 6 }]}>Everyone starts with 1 share - set each person&apos;s shares in Group settings once they join.</Text>
                                ) : null}
                            </View>
                        </View>
                    )}

                    {/* ── Step 3: people ── */}
                    {step === 2 && (
                        <View style={styles.gutter}>
                            <PeoplePicker selected={selected} onChange={setSelected} autoFocus={false} />
                        </View>
                    )}
                </ScrollView>

                {step === 0 && (
                    <View style={[styles.footer, { paddingBottom: footerBottomPadding }]}>
                        <PillButton variant="primary" onPress={() => pickType(DEFAULT_TYPE)}
                            label={`Continue with ${GROUP_TYPES[DEFAULT_TYPE].label}`} />
                    </View>
                )}
                {step > 0 && (
                    <View style={[styles.footer, { paddingBottom: footerBottomPadding }]}>
                        {step === 1 ? (
                            <PillButton variant="primary" onPress={goToPeople} disabled={!trimmed} label="Next" />
                        ) : (
                            <View style={styles.twoCol}>
                                {!selected.length && (
                                    <PillButton variant="secondary" onPress={createGroup} disabled={creating} label="Skip for now" style={{ flex: 1 }} />
                                )}
                                <PillButton variant="primary" onPress={createGroup} loading={creating} disabled={creating}
                                    label={selected.length ? `Create & add ${selected.length}` : "Create group"} style={{ flex: 1 }} />
                            </View>
                        )}
                    </View>
                )}
            </KeyboardAvoidingView>

            <InviteModal groupId={createdId} visible={!!createdId} onClose={goToGroup} />
        </SafeAreaView>
    );
}

const getStyles = (colors, isDark, t) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingTop: 4, paddingBottom: 30 },
    gutter: { paddingHorizontal: SCREEN_GUTTER, gap: 12 },
    lead: { fontSize: 15, color: colors.textSecondary, marginBottom: 4 },

    typeCard: {
        flexDirection: "row", alignItems: "center", gap: 14, padding: 14, paddingVertical: 16, borderRadius: 22,
        backgroundColor: t.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline,
    },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    defaultBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    defaultBadgeText: { fontSize: 10, fontWeight: "700" },
    typeTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
    typeDesc: { fontSize: 12.5, color: colors.textSecondary, marginTop: 2 },

    identity: { flexDirection: "row", alignItems: "center", gap: 14 },
    avatarBig: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    cameraBadge: {
        position: "absolute", right: -4, bottom: -4, width: 24, height: 24, borderRadius: 12,
        backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center",
    },
    errorText: { color: colors.error, fontSize: 12.5 },
    linkText: { color: colors.primary, fontSize: 13, fontWeight: "600", paddingVertical: 4 },

    chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
    iconBtn: {
        width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center",
        borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline, backgroundColor: t.surface,
    },
    chip: {
        paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
        borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline, backgroundColor: t.surface,
    },
    chipText: { fontSize: 13, fontWeight: "600", color: colors.text },
    hChips: { gap: 8, paddingVertical: 2 },

    panel: {
        marginTop: 6, padding: 14, borderRadius: 22, gap: 8,
        backgroundColor: t.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline,
    },
    panelTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    panelTitle: { fontSize: 13, fontWeight: "700", color: colors.text },
    hint: { fontSize: 12, color: colors.textSecondary },
    twoCol: { flexDirection: "row", gap: 10 },
    dateBtn: {
        flex: 1, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center",
        backgroundColor: t.surfaceAlt,
    },
    dateText: { fontSize: 14.5, fontWeight: "600", color: colors.text },
    switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    splitOpt: {
        flex: 1, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 18,
        backgroundColor: t.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline,
    },
    splitTitle: { fontSize: 14.5, fontWeight: "700", color: colors.text },
    splitHint: { fontSize: 11.5, color: colors.textSecondary, marginTop: 2 },

    footer: { paddingTop: 14, paddingHorizontal: SCREEN_GUTTER, backgroundColor: colors.background },
});
