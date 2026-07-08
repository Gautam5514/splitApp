import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import socket, { connectSocket } from "@/lib/socket";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, CheckCheck } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import ChatInput from "./ChatInput";

const AVATAR_COLORS = ["#14B8A6", "#10B981", "#0891B2", "#2563EB", "#6366F1", "#8B5CF6"];
const MINE_GRADIENT = ["#6366F1", "#8B5CF6"];

const colorFor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const dayLabel = (date) => {
    const d = new Date(date), now = new Date();
    const yest = new Date(now.getTime() - 86400000);
    if (d.toDateString() === now.toDateString()) return "Today";
    if (d.toDateString() === yest.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { day: "numeric", month: "short" });
};
const timeOf = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function ChatWindow({ activeFriend, onBack }) {
    const { colors, theme } = useTheme();
    const isDark = theme === "dark";
    const [messages, setMessages] = useState([]);
    const [conversationId, setConversationId] = useState(null);
    const [me, setMe] = useState(null);
    const [isOnline, setIsOnline] = useState(false);
    const [lastActive, setLastActive] = useState(null);

    const styles = getStyles(colors, isDark);

    const formatLastSeen = (date) => {
        if (!date) return "offline";
        const d = new Date(date);
        const isToday = d.toDateString() === new Date().toDateString();
        const t = timeOf(d);
        return isToday ? `last seen today at ${t}` : `last seen ${d.toLocaleDateString()}`;
    };

    useEffect(() => {
        const init = async () => {
            try {
                const userRes = await api.get("/users/me");
                setMe(userRes.data);
                if (activeFriend) {
                    setIsOnline(activeFriend.isOnline || false);
                    setLastActive(activeFriend.lastActive || null);
                    const convo = await api.post("/chat/conversation", { otherEmail: activeFriend.email });
                    setConversationId(convo.data._id);
                    const msgs = await api.get(`/chat/messages/${convo.data._id}`);
                    setMessages(msgs.data || []);
                }
            } catch (err) {
                console.error("Error loading chat:", err);
            }
        };
        init();
    }, [activeFriend]);

    useEffect(() => {
        connectSocket();
        if (!conversationId) return;
        socket.emit("joinConversation", conversationId);

        socket.on("newMessage", (msg) => {
            if (msg.conversationId === conversationId) {
                setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
            }
        });
        socket.on("userStatus", ({ userId, online, lastActive }) => {
            if (activeFriend && userId === activeFriend._id) {
                setIsOnline(online);
                if (!online) setLastActive(lastActive);
            }
        });
        return () => {
            socket.off("newMessage");
            socket.off("userStatus");
        };
    }, [conversationId, activeFriend]);

    // newest first for an inverted (fast, auto-stick-to-bottom) list
    const data = useMemo(() => [...messages].reverse(), [messages]);

    if (!activeFriend) return null;

    const isMine = (msg) => me && (msg.sender === me._id || msg.sender?._id === me._id);

    const renderItem = ({ item, index }) => {
        const mine = isMine(item);
        const older = data[index + 1];
        const showDay = !older || !sameDay(older.createdAt, item.createdAt);
        return (
            <View>
                {showDay && (
                    <View style={styles.daySepRow}>
                        <View style={styles.dayPill}>
                            <Text style={styles.dayPillText}>{dayLabel(item.createdAt)}</Text>
                        </View>
                    </View>
                )}
                <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
                    {mine ? (
                        <LinearGradient colors={MINE_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bubble, styles.bubbleMine]}>
                            <BubbleBody item={item} mine styles={styles} />
                        </LinearGradient>
                    ) : (
                        <View style={[styles.bubble, styles.bubbleOther]}>
                            <BubbleBody item={item} mine={false} styles={styles} />
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
                    <ArrowLeft size={22} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.avatarWrap}>
                    {activeFriend.imageUrl ? (
                        <Image source={{ uri: activeFriend.imageUrl }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: colorFor(activeFriend.name) }]}>
                            <Text style={styles.avatarText}>{activeFriend.name?.charAt(0) || "?"}</Text>
                        </View>
                    )}
                    {isOnline && <View style={styles.onlineDot} />}
                </View>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerName} numberOfLines={1}>{activeFriend.name}</Text>
                    <Text style={[styles.headerStatus, isOnline && { color: "#10B981" }]} numberOfLines={1}>
                        {isOnline ? "online" : formatLastSeen(lastActive)}
                    </Text>
                </View>
            </View>

            {/* Messages */}
            <View style={styles.messagesBg}>
                <FlatList
                    data={data}
                    inverted
                    keyExtractor={(item, i) => item._id || String(i)}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={15}
                    windowSize={11}
                    removeClippedSubviews
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>No messages yet. Say hello.</Text>
                        </View>
                    }
                />
            </View>

            <ChatInput
                conversationId={conversationId}
                onSend={(msg) => setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]))}
            />
        </View>
    );
}

function BubbleBody({ item, mine, styles }) {
    return (
        <>
            {item.mediaUrl && <Image source={{ uri: item.mediaUrl }} style={styles.media} />}
            <View style={styles.bubbleContent}>
                {item.text ? <Text style={mine ? styles.textMine : styles.textOther}>{item.text}</Text> : null}
                <View style={styles.metaRow}>
                    <Text style={mine ? styles.timeMine : styles.timeOther}>{timeOf(item.createdAt)}</Text>
                    {mine && <CheckCheck size={14} color="rgba(255,255,255,0.85)" />}
                </View>
            </View>
        </>
    );
}

const getStyles = (colors, isDark) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
    avatarWrap: { position: "relative" },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 17, fontWeight: "700", color: "#fff" },
    onlineDot: {
        position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6,
        backgroundColor: "#10B981", borderWidth: 2, borderColor: colors.card,
    },
    headerInfo: { flex: 1 },
    headerName: { fontSize: 16, fontWeight: "700", color: colors.text },
    headerStatus: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },

    messagesBg: { flex: 1, backgroundColor: colors.background },
    listContent: { paddingHorizontal: 12, paddingVertical: 12 },

    daySepRow: { alignItems: "center", marginVertical: 10 },
    dayPill: {
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999,
    },
    dayPillText: { fontSize: 11, fontWeight: "700", color: colors.textSecondary },

    row: { width: "100%", marginBottom: 6 },
    rowMine: { alignItems: "flex-end" },
    rowOther: { alignItems: "flex-start" },
    bubble: { maxWidth: "82%", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18 },
    bubbleMine: { borderBottomRightRadius: 5 },
    bubbleOther: {
        backgroundColor: colors.card, borderBottomLeftRadius: 5,
        borderWidth: 1, borderColor: colors.border,
    },
    media: { width: 210, height: 210, borderRadius: 12, marginBottom: 6, resizeMode: "cover" },
    bubbleContent: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", gap: 8 },
    textMine: { fontSize: 15, color: "#fff", lineHeight: 21 },
    textOther: { fontSize: 15, color: colors.text, lineHeight: 21 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: "auto" },
    timeMine: { fontSize: 10.5, color: "rgba(255,255,255,0.8)" },
    timeOther: { fontSize: 10.5, color: colors.textSecondary },

    empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80, transform: [{ scaleY: -1 }] },
    emptyText: { fontSize: 14, color: colors.textSecondary },
});
