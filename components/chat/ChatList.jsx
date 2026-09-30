import { useTabScreenBottomPadding } from "@/hooks/useSafeSpacing";
import { Alert } from "@/lib/alert";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import socket, { connectSocket } from "@/lib/socket";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CheckCircle2, Circle, MessageCircle, Trash2, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
    FlatList,
    Image,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { Text } from "@/components/ui/Typography";
import { SCREEN_GUTTER, inkTokens } from "@/constants/layout";
import { RowListSkeleton } from "@/components/ui/Skeleton";

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

// `query` and `unreadOnly` come from the Messages screen (shared search + filter).
export default function ChatList({ onSelect, query = "", unreadOnly = false }) {
    const { colors, theme } = useTheme();
    const tabBottomPadding = useTabScreenBottomPadding();
    const [friends, setFriends] = useState([]);
    const [online, setOnline] = useState([]);
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState([]);
    const [deleting, setDeleting] = useState(false);
    // True until the first response (or cache) lands, so we show a skeleton
    // instead of flashing "No chats yet" while the request is in flight.
    const [loading, setLoading] = useState(true);

    const styles = useMemo(() => getStyles(colors, inkTokens(theme === "dark", colors)), [colors, theme]);
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
                    if (items.length) setLoading(false);
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
            } finally {
                setLoading(false);
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

    const q = query.trim().toLowerCase();
    const filteredFriends = friends.filter(
        (u) => (!q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)) && (!unreadOnly || u.unread > 0)
    );

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
                    <Text style={[styles.name, unread && styles.nameUnread]} numberOfLines={1}>{user.name}</Text>
                    <Text style={[styles.preview, unread && styles.previewUnread]} numberOfLines={1}>
                        {user.lastMessage || "Tap to say hello"}
                    </Text>
                </View>

                <View style={styles.right}>
                    <Text style={styles.time}>{user.lastMessageAt ? fmtTime(user.lastMessageAt) : ""}</Text>
                    {unread ? (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{user.unread > 99 ? "99+" : user.unread}</Text>
                        </View>
                    ) : (
                        <View style={styles.badgeSpacer} />
                    )}
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
                    <TouchableOpacity onPress={deleteSelected} style={styles.iconBtn} activeOpacity={0.7} disabled={deleting || !selected.length} accessibilityLabel="Delete selected chats">
                        <Trash2 size={21} color={selected.length ? colors.error : colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            )}

            <FlatList
                data={filteredFriends}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: tabBottomPadding, paddingTop: 4 }}
                initialNumToRender={12}
                windowSize={11}
                removeClippedSubviews
                extraData={`${selected.length}-${online.length}-${theme}`}
                ListEmptyComponent={loading ? <RowListSkeleton count={8} /> : (
                    <View style={styles.empty}>
                        <View style={styles.emptyIcon}><MessageCircle size={26} color={colors.text} /></View>
                        <Text style={styles.emptyTitle}>{q || unreadOnly ? "No matching chats" : "No chats yet"}</Text>
                        <Text style={styles.emptyText}>
                            {q || unreadOnly ? "Try a different search or turn off the filter." : "Tap the pen button next to search to start a conversation."}
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

    avatarWrap: { position: "relative" },
    avatar: { width: 50, height: 50, borderRadius: 25 },
    avatarPh: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 19, fontWeight: "700", color: "#fff" },
    onlineDot: {
        position: "absolute", bottom: 1, right: 1, width: 13, height: 13, borderRadius: 6.5,
        backgroundColor: "#10B981", borderWidth: 2.5, borderColor: colors.background,
    },

    info: { flex: 1, justifyContent: "center", gap: 5 },
    name: { fontSize: 16.5, fontWeight: "500", color: colors.text, letterSpacing: -0.2 },
    nameUnread: { fontWeight: "700" },
    preview: { fontSize: 13.5, color: colors.textSecondary },
    previewUnread: { color: colors.text },

    right: { alignItems: "flex-end", justifyContent: "center", gap: 7, minWidth: 56 },
    time: { fontSize: 12, color: colors.textSecondary },
    unreadBadge: {
        backgroundColor: c.ink, borderRadius: 11, minWidth: 22, height: 22,
        paddingHorizontal: 6, alignItems: "center", justifyContent: "center",
    },
    unreadText: { color: c.onInk, fontSize: 11.5, fontWeight: "700" },
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
