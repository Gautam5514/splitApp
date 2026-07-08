import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import socket, { connectSocket } from "@/lib/socket";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CheckCircle2, Circle, Search, Trash2, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const AVATAR_COLORS = ["#14B8A6", "#10B981", "#0891B2", "#2563EB", "#6366F1", "#8B5CF6"];
const colorFor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const fmtTime = (d) => {
    const date = new Date(d), now = new Date();
    if (date.toDateString() === now.toDateString())
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const yest = new Date(now.getTime() - 86400000);
    if (date.toDateString() === yest.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], { day: "numeric", month: "short" });
};

export default function ChatList({ onSelect }) {
    const { colors } = useTheme();
    const [friends, setFriends] = useState([]);
    const [online, setOnline] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState([]);
    const [deleting, setDeleting] = useState(false);

    const styles = useMemo(() => getStyles(colors), [colors]);
    // O(1) presence lookups instead of online.includes() (O(n)) per row.
    const onlineSet = useMemo(() => new Set(online), [online]);
    const selectedSet = useMemo(() => new Set(selected), [selected]);

    const toggleSelect = (id) =>
        setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    const enterSelect = (id) => { setSelectMode(true); setSelected([id]); };
    const exitSelect = () => { setSelectMode(false); setSelected([]); };

    const deleteSelected = () => {
        if (!selected.length) return;
        Alert.alert(
            `Delete ${selected.length} chat${selected.length > 1 ? "s" : ""}?`,
            "This removes the conversation and its messages for you. This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete", style: "destructive",
                    onPress: async () => {
                        try {
                            setDeleting(true);
                            await api.post("/chat/delete-conversations", { userIds: selected });
                            setFriends((prev) => {
                                const next = prev.filter((f) => !selected.includes(f._id));
                                AsyncStorage.setItem("chat_contacts_cache_v1", JSON.stringify(next)).catch(() => {});
                                return next;
                            });
                            exitSelect();
                        } catch {
                            Alert.alert("Error", "Couldn't delete the selected chats.");
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
                const cached = await AsyncStorage.getItem("chat_contacts_cache_v1");
                if (cached) {
                    const items = JSON.parse(cached) || [];
                    setFriends(items.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)));
                }
            } catch (err) {
                console.error("Error loading cached chat data:", err);
            }
        };
        const load = async () => {
            try {
                const contactsRes = await api.get("/chat/my-contacts");
                const items = contactsRes.data.items || [];
                setFriends(items.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)));
                await AsyncStorage.setItem("chat_contacts_cache_v1", JSON.stringify(items));
            } catch (err) {
                console.error("Error loading users:", err);
            }
        };
        loadCached();
        load();
        connectSocket();

        socket.on("userStatus", ({ userId, online: isOnline }) => {
            setOnline((prev) => (isOnline ? [...new Set([...prev, userId])] : prev.filter((id) => id !== userId)));
        });
        socket.on("newMessage", (msg) => {
            setFriends((prev) =>
                prev
                    .map((u) =>
                        u._id === msg.sender || u._id === msg.receiver
                            ? { ...u, lastMessage: msg.text || "Media", lastMessageAt: msg.createdAt, unread: (u.unread || 0) + 1 }
                            : u
                    )
                    .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0))
            );
        });
        return () => {
            socket.off("userStatus");
            socket.off("newMessage");
        };
    }, []);

    const filteredFriends = friends.filter((u) => u.name?.toLowerCase().includes(searchQuery.toLowerCase()));

    const resetUnread = async (userId) => {
        try {
            await api.post("/chat/reset-unread", { otherUserId: userId });
            setFriends((prev) => prev.map((f) => (f._id === userId ? { ...f, unread: 0 } : f)));
        } catch { }
    };

    const renderItem = ({ item: user }) => {
        const isSelected = selectedSet.has(user._id);
        const isOnline = onlineSet.has(user._id);
        const unread = user.unread > 0;
        return (
            <TouchableOpacity
                onPress={() => {
                    if (selectMode) toggleSelect(user._id);
                    else { onSelect(user); resetUnread(user._id); }
                }}
                onLongPress={() => enterSelect(user._id)}
                delayLongPress={250}
                activeOpacity={0.7}
                style={[styles.row, isSelected && styles.rowSelected]}
            >
                {selectMode && (
                    <View style={styles.check}>
                        {isSelected ? <CheckCircle2 size={22} color={colors.primary} /> : <Circle size={22} color={colors.textSecondary} />}
                    </View>
                )}
                <View style={styles.avatarWrap}>
                    {user.imageUrl ? (
                        <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatarPh, { backgroundColor: colorFor(user.name) }]}>
                            <Text style={styles.avatarText}>{user.name?.charAt(0)?.toUpperCase()}</Text>
                        </View>
                    )}
                    {isOnline && <View style={styles.onlineDot} />}
                </View>

                <View style={styles.info}>
                    <View style={styles.infoTop}>
                        <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
                        {user.lastMessageAt && (
                            <Text style={[styles.time, unread && styles.timeUnread]}>{fmtTime(user.lastMessageAt)}</Text>
                        )}
                    </View>
                    <View style={styles.infoBottom}>
                        <Text style={[styles.preview, unread && styles.previewUnread]} numberOfLines={1}>
                            {user.lastMessage || "Tap to say hello"}
                        </Text>
                        {unread && (
                            <View style={styles.unreadBadge}>
                                <Text style={styles.unreadText}>{user.unread > 99 ? "99+" : user.unread}</Text>
                            </View>
                        )}
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
                            placeholder="Search chats"
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
                data={filteredFriends}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 150, paddingTop: 4 }}
                initialNumToRender={12}
                windowSize={11}
                removeClippedSubviews
                extraData={`${selected.length}-${online.length}`}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <View style={styles.emptyIcon}><Search size={26} color={colors.primary} /></View>
                        <Text style={styles.emptyTitle}>No chats yet</Text>
                        <Text style={styles.emptyText}>Start a new conversation with the “New” button.</Text>
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

    avatarWrap: { position: "relative" },
    avatar: { width: 52, height: 52, borderRadius: 26 },
    avatarPh: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 20, fontWeight: "700", color: "#fff" },
    onlineDot: {
        position: "absolute", bottom: 1, right: 1, width: 14, height: 14, borderRadius: 7,
        backgroundColor: "#10B981", borderWidth: 2.5, borderColor: colors.background,
    },

    info: { flex: 1, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10, justifyContent: "center", gap: 4 },
    infoTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    name: { fontSize: 16, fontWeight: "700", color: colors.text, flex: 1, marginRight: 8 },
    time: { fontSize: 11.5, color: colors.textSecondary, fontWeight: "500" },
    timeUnread: { color: colors.primary, fontWeight: "700" },
    infoBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    preview: { fontSize: 13.5, color: colors.textSecondary, flex: 1 },
    previewUnread: { color: colors.text, fontWeight: "600" },
    unreadBadge: {
        backgroundColor: colors.primary, borderRadius: 11, minWidth: 22, height: 22,
        paddingHorizontal: 7, alignItems: "center", justifyContent: "center",
    },
    unreadText: { color: "#fff", fontSize: 11, fontWeight: "800" },

    empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 40 },
    emptyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center", marginBottom: 14 },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 4 },
    emptyText: { fontSize: 13.5, color: colors.textSecondary, textAlign: "center", lineHeight: 19 },
});
