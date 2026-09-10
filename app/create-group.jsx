import InviteModal from "@/components/InviteModal";
import { Loader } from "@/components/Loader";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import {
    ArrowLeft,
    Check,
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
const GROUP_TYPE = "general";
const GROUP_TINT = "#6366F1";
const GROUP_GRADIENT = ["#4338CA", "#7C3AED"];
const SUGGESTIONS = ["Friends & Family", "Weekend Plans", "Home Expenses", "Office Team"];

const tap = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
};

export default function CreateGroupScreen() {
    const { colors, theme } = useTheme();
    const isDark = theme === "dark";
    const styles = getStyles(colors, isDark);

    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [creating, setCreating] = useState(false);
    const [createdId, setCreatedId] = useState(null);
    const [focused, setFocused] = useState(false);

    const trimmed = name.trim();
    const letter = trimmed ? trimmed.charAt(0).toUpperCase() : "G";

    const validate = () => {
        if (!trimmed) return "Please name your group.";
        if (trimmed.length < 2) return "Use at least 2 characters.";
        if (trimmed.length > MAX) return `Keep it under ${MAX} characters.`;
        return "";
    };

    const pickSuggestion = (s) => {
        tap();
        setName(s);
        setError("");
    };

    const createGroup = async () => {
        if (creating) return;
        const v = validate();
        if (v) { setError(v); return; }
        setError("");
        try {
            setCreating(true);
            const res = await api.post("/groups", { name: trimmed, groupType: GROUP_TYPE });
            setCreatedId(res.data._id);
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
                    <LinearGradient colors={GROUP_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.preview}>
                        <View style={styles.previewOrb} />
                        <View style={styles.previewOrbSmall} />

                        <View style={styles.previewAvatarWrap}>
                            <View style={styles.previewAvatar}>
                                <Text style={styles.previewAvatarText}>{letter}</Text>
                            </View>
                            <View style={styles.previewTypeBadge}>
                                <Users size={13} color={GROUP_TINT} strokeWidth={2.5} />
                            </View>
                        </View>

                        <Text style={styles.previewName} numberOfLines={1}>
                            {trimmed || "Your group name"}
                        </Text>
                        <View style={styles.previewPill}>
                            <Users size={12} color="#fff" strokeWidth={2.5} />
                            <Text style={styles.previewPillText}>Group</Text>
                        </View>
                    </LinearGradient>

                    {/* A single universal group replaces the old type picker. */}
                    <View style={styles.groupIdentity}>
                        <View style={styles.groupIdentityIcon}>
                            <Users size={20} color={GROUP_TINT} strokeWidth={2.3} />
                        </View>
                        <View style={styles.groupIdentityCopy}>
                            <Text style={styles.groupIdentityTitle}>Group</Text>
                            <Text style={styles.groupIdentityDesc}>One place for every shared expense</Text>
                        </View>
                        <View style={styles.groupIdentityCheck}>
                            <Check size={14} color="#fff" strokeWidth={3} />
                        </View>
                    </View>

                    {/* Name */}
                    <Text style={styles.label}>Group name</Text>
                    <View
                        style={[
                            styles.inputWrap,
                            focused && { borderColor: GROUP_TINT },
                            error && { borderColor: colors.error },
                        ]}
                    >
                        <Sparkles size={18} color={focused ? GROUP_TINT : colors.textSecondary} />
                        <TextInput
                            value={name}
                            onChangeText={(t) => { setName(t.slice(0, MAX)); if (error) setError(""); }}
                            placeholder={`e.g. ${SUGGESTIONS[0]}`}
                            placeholderTextColor={colors.placeholder}
                            style={styles.input}
                            selectionColor={GROUP_TINT}
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
                        {SUGGESTIONS.map((s) => (
                            <TouchableOpacity
                                key={s}
                                style={styles.chip}
                                onPress={() => pickSuggestion(s)}
                                activeOpacity={0.75}
                            >
                                <Text style={styles.chipText}>{s}</Text>
                            </TouchableOpacity>
                        ))}
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
                        <LinearGradient colors={GROUP_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.createBtnGrad}>
                            {creating
                                ? <Loader size={20} color="#fff" />
                                : <Text style={styles.createBtnText}>Create Group</Text>}
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
        borderRadius: 20, paddingVertical: 30, alignItems: "center", overflow: "hidden", marginBottom: 26,
    },
    previewOrb: {
        position: "absolute", top: -50, right: -35, width: 160, height: 160, borderRadius: 80,
        backgroundColor: "rgba(255,255,255,0.12)",
    },
    previewOrbSmall: {
        position: "absolute", bottom: -30, left: -20, width: 100, height: 100, borderRadius: 50,
        backgroundColor: "rgba(255,255,255,0.08)",
    },
    previewAvatarWrap: { width: 76, height: 76 },
    previewAvatar: {
        width: 76, height: 76, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.22)",
        alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.32)",
    },
    previewAvatarText: { fontSize: 36, fontWeight: "900", color: "#fff" },
    previewTypeBadge: {
        position: "absolute", bottom: -6, right: -6, width: 28, height: 28, borderRadius: 14,
        backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
        borderWidth: 2, borderColor: "rgba(255,255,255,0.5)",
    },
    previewName: { fontSize: 20, fontWeight: "800", color: "#fff", marginTop: 16, maxWidth: "82%" },
    previewPill: {
        flexDirection: "row", alignItems: "center", gap: 5,
        marginTop: 8, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.22)",
    },
    previewPillText: { fontSize: 11.5, fontWeight: "700", color: "#fff", letterSpacing: 0.3 },

    label: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, marginLeft: 2 },

    groupIdentity: {
        flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24,
        padding: 14, borderRadius: 16, borderWidth: 1,
        borderColor: isDark ? "rgba(129,140,248,0.24)" : "rgba(99,102,241,0.16)",
        backgroundColor: isDark ? "rgba(99,102,241,0.10)" : "rgba(99,102,241,0.055)",
    },
    groupIdentityIcon: {
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: isDark ? "rgba(129,140,248,0.16)" : "rgba(99,102,241,0.10)",
        alignItems: "center", justifyContent: "center",
    },
    groupIdentityCopy: { flex: 1 },
    groupIdentityTitle: { color: colors.text, fontSize: 15.5, fontWeight: "800", letterSpacing: -0.2 },
    groupIdentityDesc: { color: colors.textSecondary, fontSize: 12.5, marginTop: 3 },
    groupIdentityCheck: {
        width: 26, height: 26, borderRadius: 13, backgroundColor: GROUP_TINT,
        alignItems: "center", justifyContent: "center",
    },

    inputWrap: {
        flexDirection: "row", alignItems: "center", gap: 10, height: 54, borderRadius: 14,
        backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14,
    },
    input: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.text },
    counter: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
    errorText: { color: colors.error, fontSize: 12.5, marginTop: 6, marginLeft: 2 },

    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
    chip: {
        borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
        backgroundColor: isDark ? "rgba(129,140,248,0.10)" : "rgba(99,102,241,0.06)",
        borderColor: isDark ? "rgba(129,140,248,0.22)" : "rgba(99,102,241,0.15)",
    },
    chipText: { fontSize: 12.5, fontWeight: "600", color: isDark ? "#A5B4FC" : "#4F46E5" },

    hintRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 22, justifyContent: "center" },
    hint: { fontSize: 12.5, color: colors.textSecondary },

    footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
    createBtn: { borderRadius: 14, overflow: "hidden" },
    createBtnGrad: { height: 54, alignItems: "center", justifyContent: "center" },
    createBtnText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.2 },
});
