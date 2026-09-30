import { useTabScreenBottomPadding } from "@/hooks/useSafeSpacing";
import { Alert } from "@/lib/alert";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import { connectSocket } from "@/lib/socket";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { CheckCircle2, Circle, Trash2, Users, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
    FlatList,
    StyleSheet,
    Image,
    TouchableOpacity,
    View,
} from "react-native";
import { Text } from "@/components/ui/Typography";
import { SCREEN_GUTTER, inkTokens } from "@/constants/layout";
import { RowListSkeleton } from "@/components/ui/Skeleton";

const GRADIENTS = [
    ["#0891B2", "#14B8A6"],
    ["#6366F1", "#8B5CF6"],
    ["#F97316", "#EC4899"],
    ["#3B82F6", "#06B6D4"],
    ["#10B981", "#059669"],
];
const gradientFor = (name) => GRADIENTS[(name?.charCodeAt(0) || 0) % GRADIENTS.length];

const fmtTime = (d) => {
    if (!d) return "";
    const date = new Date(d), now = new Date();
    if (date.toDateString() === now.toDateString())
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const yest = new Date(now.getTime() - 86400000);
    if (date.toDateString() === yest.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], { day: "numeric", month: "short" });
};

// `query` and `activeOnly` come from the Messages screen (shared search + filter).
export default function GroupChatList({ onSelect, query = "", activeOnly = false }) {
    const { colors, theme } = useTheme();
    const tabBottomPadding = useTabScreenBottomPadding();
    const [groups, setGroups] = useState([]);
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState([]);
    const [deleting, setDeleting] = useState(false);
    const [loading, setLoading] = useState(true); // skeleton, not "No group chats", while fetching

    const styles = getStyles(colors, inkTokens(theme === "dark", colors));

    const toggleSelect = (id) =>
        setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    const enterSelect = (id) => { setSelectMode(true); setSelected([id]); };
    const exitSelect = () => { setSelectMode(false); setSelected([]); };

    const deleteSelected = () => {
        if (!selected.length) return;
        Alert.alert(
            `Clear ${selected.length} group chat${selected.length > 1 ? "s" : ""}?`,
            "This clears the chat history from your view. Group expenses are not affected.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear", style: "destructive",
                    onPress: async () => {
                        try {
                            setDeleting(true);
                            await api.post("/groups/messages/delete", { groupIds: selected });
                            exitSelect();
                            Alert.alert("Done", "Selected group chats were cleared.");
                        } catch {
                            Alert.alert("Error", "Couldn't clear the selected group chats.");
                        } finally {
                            setDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    useEffect(() => {
        const loadCached = async () => {
            try {
                const cached = await AsyncStorage.getItem("groups_cache_v1");
                if (cached) {
                    const items = JSON.parse(cached) || [];
                    setGroups(items);
                    if (items.length) setLoading(false);
                }
            } catch (err) {
                console.error("Error loading cached groups:", err);
            }
        };
        const load = async () => {
            try {
                const res = await api.get("/groups");
                setGroups(res.data || []);
                await AsyncStorage.setItem("groups_cache_v1", JSON.stringify(res.data || []));
            } catch (err) {
                console.error("Error loading groups:", err);
            } finally {
                setLoading(false);
            }
        };
        loadCached();
        load();
        connectSocket();
    }, []);

    const q = query.trim().toLowerCase();
    const isDone = (g) => g?.isCompleted === true || g?.isCompleted === "true";
    const filteredGroups = groups.filter(
        (g) => (!q || g.name?.toLowerCase().includes(q)) && (!activeOnly || !isDone(g))
    );

    const renderItem = ({ item: group }) => {
        const isSelected = selected.includes(group._id);
        const [g1, g2] = gradientFor(group.name);
        const names = (group.members || []).map((m) => m.name || m.email).filter(Boolean);
        return (
            <TouchableOpacity
                onPress={() => { if (selectMode) toggleSelect(group._id); else onSelect(group); }}
                onLongPress={() => enterSelect(group._id)}
                delayLongPress={250}
                activeOpacity={0.7}
                style={[styles.row, isSelected && styles.rowSelected]}
            >
                {selectMode && (
                    <View style={styles.check}>
                        {isSelected ? <CheckCircle2 size={22} color={colors.primary} /> : <Circle size={22} color={colors.textSecondary} />}
                    </View>
                )}
                {group.photo?.url ? (
                    <Image source={{ uri: group.photo.url }} style={styles.avatarImg} />
                ) : (
                    <LinearGradient colors={[g1, g2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
                        <Text style={styles.avatarText}>{group.name?.charAt(0)?.toUpperCase()}</Text>
                    </LinearGradient>
                )}

                <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>{group.name}</Text>
                    <Text style={styles.meta} numberOfLines={1}>
                        {names.length ? names.slice(0, 3).join(", ") : "No members yet"}
                    </Text>
                </View>

                <View style={styles.right}>
                    <Text style={styles.time}>{fmtTime(group.lastMessageAt || group.updatedAt)}</Text>
                    <View style={styles.badgeSpacer} />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {selectMode && (
                <View style={styles.selectHeader}>
                    <TouchableOpacity onPress={exitSelect} style={styles.iconBtn} activeOpacity={0.7} accessibilityLabel="Cancel selection">
                        <X size={22} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.selectCount}>{selected.length} selected</Text>
                    <TouchableOpacity onPress={deleteSelected} style={styles.iconBtn} activeOpacity={0.7} disabled={deleting || !selected.length} accessibilityLabel="Clear selected group chats">
                        <Trash2 size={21} color={selected.length ? colors.error : colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            )}

            <FlatList
                data={filteredGroups}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: tabBottomPadding, paddingTop: 4 }}
                initialNumToRender={12}
                windowSize={11}
                removeClippedSubviews
                extraData={`${selected.length}-${theme}`}
                ListEmptyComponent={loading ? <RowListSkeleton count={8} /> : (
                    <View style={styles.empty}>
                        <View style={styles.emptyIcon}><Users size={26} color={colors.text} /></View>
                        <Text style={styles.emptyTitle}>{q || activeOnly ? "No matching groups" : "No group chats"}</Text>
                        <Text style={styles.emptyText}>
                            {q || activeOnly ? "Try a different search or turn off the filter." : "Create a group from the Trips tab to start chatting."}
                        </Text>
                    </View>
                )}
            />
        </View>
    );
}

const getStyles = (colors, c) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    selectHeader: {
        height: 56, marginHorizontal: SCREEN_GUTTER, marginBottom: 6, paddingHorizontal: 4,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        borderRadius: 28, backgroundColor: c.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: c.outline,
    },
    iconBtn: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
    selectCount: { fontSize: 15.5, fontWeight: "600", color: colors.text },

    row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: SCREEN_GUTTER, paddingVertical: 11 },
    rowSelected: { backgroundColor: colors.primaryLight },
    check: { marginRight: 2 },

    avatar: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    avatarImg: { width: 50, height: 50, borderRadius: 25 },
    avatarText: { fontSize: 19, fontWeight: "700", color: "#fff" },

    info: { flex: 1, justifyContent: "center", gap: 5 },
    name: { fontSize: 16.5, fontWeight: "500", color: colors.text, letterSpacing: -0.2 },
    meta: { fontSize: 13.5, color: colors.textSecondary },

    right: { alignItems: "flex-end", justifyContent: "center", gap: 7, minWidth: 56 },
    time: { fontSize: 12, color: colors.textSecondary },
    badgeSpacer: { height: 22 },

    empty: { alignItems: "center", paddingTop: 72, paddingHorizontal: 40 },
    emptyIcon: {
        width: 64, height: 64, borderRadius: 32, backgroundColor: c.surface,
        borderWidth: StyleSheet.hairlineWidth, borderColor: c.outline,
        alignItems: "center", justifyContent: "center", marginBottom: 14,
    },
    emptyTitle: { fontSize: 16.5, fontWeight: "600", color: colors.text, marginBottom: 4 },
    emptyText: { fontSize: 13.5, color: colors.textSecondary, textAlign: "center", lineHeight: 19 },
});
