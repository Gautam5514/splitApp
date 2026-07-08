import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import { connectSocket } from "@/lib/socket";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { CheckCircle2, Circle, Search, Trash2, Users, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const GRADIENTS = [
    ["#0891B2", "#14B8A6"],
    ["#6366F1", "#8B5CF6"],
    ["#F97316", "#EC4899"],
    ["#3B82F6", "#06B6D4"],
    ["#10B981", "#059669"],
];
const gradientFor = (name) => GRADIENTS[(name?.charCodeAt(0) || 0) % GRADIENTS.length];

export default function GroupChatList({ onSelect }) {
    const { colors } = useTheme();
    const [groups, setGroups] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState([]);
    const [deleting, setDeleting] = useState(false);

    const styles = getStyles(colors);

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
                if (cached) setGroups(JSON.parse(cached) || []);
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
            }
        };
        loadCached();
        load();
        connectSocket();
    }, []);

    const filteredGroups = groups.filter((g) => g.name?.toLowerCase().includes(searchQuery.toLowerCase()));

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
                <LinearGradient colors={[g1, g2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
                    <Text style={styles.avatarText}>{group.name?.charAt(0)?.toUpperCase()}</Text>
                </LinearGradient>

                <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>{group.name}</Text>
                    <View style={styles.metaRow}>
                        <Users size={12} color={colors.textSecondary} />
                        <Text style={styles.meta} numberOfLines={1}>
                            {group.members?.length || 0} members{names.length ? ` · ${names.slice(0, 2).join(", ")}` : ""}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {selectMode ? (
                <View style={styles.selectHeader}>
                    <TouchableOpacity onPress={exitSelect} style={styles.iconBtn} activeOpacity={0.7}>
                        <X size={22} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.selectCount}>{selected.length} selected</Text>
                    <TouchableOpacity onPress={deleteSelected} style={styles.iconBtn} activeOpacity={0.7} disabled={deleting || !selected.length}>
                        <Trash2 size={21} color={selected.length ? colors.error : colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.searchWrap}>
                    <View style={styles.searchBox}>
                        <Search size={18} color={colors.textSecondary} />
                        <TextInput
                            placeholder="Search groups"
                            placeholderTextColor={colors.placeholder}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            style={styles.searchInput}
                            selectionColor={colors.primary}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery("")}>
                                <X size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            <FlatList
                data={filteredGroups}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 150, paddingTop: 4 }}
                initialNumToRender={12}
                windowSize={11}
                removeClippedSubviews
                extraData={selected.length}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <View style={styles.emptyIcon}><Users size={26} color={colors.primary} /></View>
                        <Text style={styles.emptyTitle}>No group chats</Text>
                        <Text style={styles.emptyText}>Create a group from the Home tab to start chatting.</Text>
                    </View>
                }
            />
        </View>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    searchWrap: { paddingHorizontal: 16, paddingVertical: 10 },
    searchBox: {
        flexDirection: "row", alignItems: "center", gap: 10,
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        borderRadius: 12, paddingHorizontal: 14, height: 44,
    },
    searchInput: { flex: 1, fontSize: 14.5, color: colors.text },

    selectHeader: {
        height: 56, paddingHorizontal: 8, flexDirection: "row", alignItems: "center",
        justifyContent: "space-between", backgroundColor: colors.card,
        borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    selectCount: { fontSize: 16, fontWeight: "700", color: colors.text },

    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
    rowSelected: { backgroundColor: colors.primaryLight },
    check: { marginRight: 2 },

    avatar: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 21, fontWeight: "800", color: "#fff" },

    info: { flex: 1, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10, justifyContent: "center", gap: 4 },
    name: { fontSize: 16, fontWeight: "700", color: colors.text },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    meta: { fontSize: 13, color: colors.textSecondary, flex: 1 },

    empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 40 },
    emptyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center", marginBottom: 14 },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 4 },
    emptyText: { fontSize: 13.5, color: colors.textSecondary, textAlign: "center", lineHeight: 19 },
});
