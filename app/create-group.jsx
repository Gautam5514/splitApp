import InviteModal from "@/components/InviteModal";
import { Loader } from "@/components/Loader";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import {
    ArrowLeft,
    Check,
    Home,
    Plane,
    Sparkles,
    Users,
} from "lucide-react-native";
import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MAX = 60;
const TYPES = [
    {
        id: "trip",
        title: "Trip Split",
        desc: "Travel, outings & one-off events",
        Icon: Plane,
        gradient: ["#6366F1", "#8B5CF6"],
    },
    {
        id: "roommate",
        title: "Roommate Split",
        desc: "Rent, bills & shared household costs",
        Icon: Home,
        gradient: ["#0891B2", "#14B8A6"],
    },
];
const SUGGESTIONS = {
    trip: ["Goa Trip", "Weekend Getaway", "Office Offsite", "Birthday Bash"],
    roommate: ["Flat 304", "Apartment Bills", "Hostel Room", "PG Expenses"],
};

export default function CreateGroupScreen() {
    const { colors, theme } = useTheme();
    const params = useLocalSearchParams();
    const isDark = theme === "dark";
    const styles = getStyles(colors, isDark);

    const [name, setName] = useState("");
    const [type, setType] = useState(params.type === "roommate" ? "roommate" : "trip");
    const [error, setError] = useState("");
    const [creating, setCreating] = useState(false);
    const [createdId, setCreatedId] = useState(null);
    const [focused, setFocused] = useState(false);

    const active = TYPES.find((t) => t.id === type);
    const trimmed = name.trim();
    const letter = trimmed ? trimmed.charAt(0).toUpperCase() : active.title.charAt(0);

    const validate = () => {
        if (!trimmed) return "Please name your group.";
        if (trimmed.length < 2) return "Use at least 2 characters.";
        if (trimmed.length > MAX) return `Keep it under ${MAX} characters.`;
        return "";
    };

    const createGroup = async () => {
        const v = validate();
        if (v) { setError(v); return; }
        setError("");
        try {
            setCreating(true);
            const res = await api.post("/groups", { name: trimmed, groupType: type });
            setCreatedId(res.data._id);
        } catch (err) {
            Alert.alert("Error", err?.response?.data?.message || "Could not create group. Please try again.");
        } finally {
            setCreating(false);
        }
    };

    const goToGroup = () => {
        const id = createdId;
        setCreatedId(null);
        if (id) router.replace({ pathname: "/groups/[id]", params: { id, returnTo: "trips" } });
        else router.back();
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <ArrowLeft size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Group</Text>
                <View style={{ width: 36 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                    {/* Live preview */}
                    <LinearGradient colors={active.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.preview}>
                        <View style={styles.previewOrb} />
                        <View style={styles.previewAvatar}>
                            <Text style={styles.previewAvatarText}>{letter}</Text>
                        </View>
                        <Text style={styles.previewName} numberOfLines={1}>
                            {trimmed || "Your group name"}
                        </Text>
                        <View style={styles.previewBadge}>
                            <active.Icon size={12} color="#fff" />
                            <Text style={styles.previewBadgeText}>{active.title}</Text>
                        </View>
                    </LinearGradient>

                    {/* Name */}
                    <Text style={styles.label}>Group name</Text>
                    <View style={[styles.inputWrap, focused && { borderColor: colors.primary }, error && { borderColor: colors.error }]}>
                        <Sparkles size={18} color={focused ? colors.primary : colors.textSecondary} />
                        <TextInput
                            value={name}
                            onChangeText={(t) => { setName(t.slice(0, MAX)); if (error) setError(""); }}
                            placeholder={type === "trip" ? "e.g. Goa Trip 2026" : "e.g. Flat 304"}
                            placeholderTextColor={colors.placeholder}
                            style={styles.input}
                            selectionColor={colors.primary}
                            autoFocus
                            returnKeyType="done"
                            onFocus={() => setFocused(true)}
                            onBlur={() => setFocused(false)}
                            onSubmitEditing={createGroup}
                        />
                        <Text style={styles.counter}>{name.length}/{MAX}</Text>
                    </View>
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    {/* Suggestions */}
                    <View style={styles.chips}>
                        {SUGGESTIONS[type].map((s) => (
                            <TouchableOpacity key={s} style={styles.chip} onPress={() => { setName(s); setError(""); }} activeOpacity={0.75}>
                                <Text style={styles.chipText}>{s}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Type */}
                    <Text style={[styles.label, { marginTop: 24 }]}>Split type</Text>
                    <View style={styles.typeList}>
                        {TYPES.map((t) => {
                            const selected = type === t.id;
                            return (
                                <TouchableOpacity
                                    key={t.id}
                                    style={[styles.typeCard, selected && { borderColor: t.gradient[0] }]}
                                    onPress={() => setType(t.id)}
                                    activeOpacity={0.85}
                                >
                                    <LinearGradient colors={t.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.typeIcon}>
                                        <t.Icon size={20} color="#fff" />
                                    </LinearGradient>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.typeTitle}>{t.title}</Text>
                                        <Text style={styles.typeDesc}>{t.desc}</Text>
                                    </View>
                                    <View style={[styles.radio, selected && { backgroundColor: t.gradient[0], borderColor: t.gradient[0] }]}>
                                        {selected && <Check size={13} color="#fff" strokeWidth={3} />}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <View style={styles.hintRow}>
                        <Users size={14} color={colors.textSecondary} />
                        <Text style={styles.hint}>You can invite members right after creating.</Text>
                    </View>
                </ScrollView>

                {/* Sticky create button */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        onPress={createGroup}
                        disabled={creating || !trimmed}
                        activeOpacity={0.9}
                        style={[styles.createBtn, (creating || !trimmed) && { opacity: 0.5 }]}
                    >
                        <LinearGradient colors={active.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.createBtnGrad}>
                            {creating
                                ? <Loader size={20} color="#fff" />
                                : <Text style={styles.createBtnText}>Create {active.title}</Text>}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            <InviteModal groupId={createdId} visible={!!createdId} onClose={goToGroup} />
        </SafeAreaView>
    );
}

const getStyles = (colors, isDark) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
    scroll: { padding: 16, paddingBottom: 30 },

    preview: {
        borderRadius: 16, paddingVertical: 26, alignItems: "center", overflow: "hidden", marginBottom: 24,
    },
    previewOrb: {
        position: "absolute", top: -40, right: -30, width: 150, height: 150, borderRadius: 75,
        backgroundColor: "rgba(255,255,255,0.12)",
    },
    previewAvatar: {
        width: 72, height: 72, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.22)",
        alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.3)",
    },
    previewAvatarText: { fontSize: 34, fontWeight: "900", color: "#fff" },
    previewName: { fontSize: 19, fontWeight: "800", color: "#fff", marginTop: 14, maxWidth: "82%" },
    previewBadge: {
        flexDirection: "row", alignItems: "center", gap: 5, marginTop: 10,
        backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
    },
    previewBadgeText: { fontSize: 12, fontWeight: "700", color: "#fff" },

    label: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, marginLeft: 2 },
    inputWrap: {
        flexDirection: "row", alignItems: "center", gap: 10, height: 54, borderRadius: 8,
        backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14,
    },
    input: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.text },
    counter: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
    errorText: { color: colors.error, fontSize: 12.5, marginTop: 6, marginLeft: 2 },

    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
    chip: { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
    chipText: { fontSize: 12.5, fontWeight: "600", color: colors.primary },

    typeList: { gap: 10 },
    typeCard: {
        flexDirection: "row", alignItems: "center", gap: 14,
        backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: 8, padding: 14,
    },
    typeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    typeTitle: { fontSize: 15.5, fontWeight: "700", color: colors.text },
    typeDesc: { fontSize: 12.5, color: colors.textSecondary, marginTop: 2 },
    radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },

    hintRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 20, justifyContent: "center" },
    hint: { fontSize: 12.5, color: colors.textSecondary },

    footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
    createBtn: { borderRadius: 10, overflow: "hidden" },
    createBtnGrad: { height: 54, alignItems: "center", justifyContent: "center" },
    createBtnText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.2 },
});
