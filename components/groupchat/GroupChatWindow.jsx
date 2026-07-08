import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import socket, { connectSocket } from "@/lib/socket";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, CheckCheck, Users } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import ChatInput from "../chat/ChatInput";

const AVATAR_COLORS = ["#F97316", "#EC4899", "#A855F7", "#3B82F6", "#0D9488", "#EF4444", "#6366F1"];
const MINE_GRADIENT = ["#6366F1", "#8B5CF6"];
const GROUP_GRADIENT = ["#0891B2", "#14B8A6"];

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

export default function GroupChatWindow({ activeGroup, onBack }) {
    const { colors, theme } = useTheme();
    const isDark = theme === "dark";
    const [messages, setMessages] = useState([]);
    const [me, setMe] = useState(null);

    const styles = getStyles(colors, isDark);

    useEffect(() => {
        const init = async () => {
            if (!activeGroup) return;
            try {
                const userRes = await api.get("/users/me");
                setMe(userRes.data);
                const res = await api.get(`/groups/${activeGroup._id}/messages`);
                setMessages(res.data || []);
            } catch (err) {
                console.error("Error loading group messages:", err);
            }
        };
        init();
    }, [activeGroup]);

    useEffect(() => {
        if (!activeGroup) return;
        connectSocket();
        socket.emit("joinGroup", activeGroup._id);
        socket.on("newGroupMessage", (msg) => {
            if (msg.groupId === activeGroup._id) {
                setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
            }
        });
        return () => {
            socket.emit("leaveGroup", activeGroup._id);
            socket.off("newGroupMessage");
        };
    }, [activeGroup]);

    const data = useMemo(() => [...messages].reverse(), [messages]);

    if (!activeGroup) return null;

    const isMine = (msg) => msg.sender?._id === me?._id;

    const renderItem = ({ item, index }) => {
        const mine = isMine(item);
        const older = data[index + 1];
        const showDay = !older || !sameDay(older.createdAt, item.createdAt);
        // Group consecutive messages from the same sender (hide avatar/name on follow-ups)
        const newer = data[index - 1];
        const continued = newer && newer.sender?._id === item.sender?._id && sameDay(newer.createdAt, item.createdAt);

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
                    {!mine && (
                        <View style={styles.senderAvatarSlot}>
                            {!continued && (
                                item.sender?.imageUrl ? (
                                    <Image source={{ uri: item.sender.imageUrl }} style={styles.senderAvatar} />
                                ) : (
                                    <View style={[styles.senderAvatarPh, { backgroundColor: colorFor(item.sender?.name) }]}>
                                        <Text style={styles.senderAvatarText}>{item.sender?.name?.charAt(0) || "?"}</Text>
                                    </View>
                                )
                            )}
                        </View>
                    )}
                    {mine ? (
                        <LinearGradient colors={MINE_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bubble, styles.bubbleMine]}>
                            <BubbleBody item={item} mine showName={false} styles={styles} />
                        </LinearGradient>
                    ) : (
                        <View style={[styles.bubble, styles.bubbleOther]}>
                            <BubbleBody item={item} mine={false} showName={!continued} nameColor={colorFor(item.sender?.name)} styles={styles} />
                        </View>
                    )}
                </View>
            </View>
        );
    };

    const memberSummary = activeGroup.members?.map((m) => m.name).filter(Boolean).join(", ");

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
                    <ArrowLeft size={22} color={colors.text} />
                </TouchableOpacity>
                <LinearGradient colors={GROUP_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.groupAvatar}>
                    <Text style={styles.groupAvatarText}>{activeGroup.name?.charAt(0)?.toUpperCase() || "G"}</Text>
                </LinearGradient>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerName} numberOfLines={1}>{activeGroup.name}</Text>
                    <View style={styles.headerMetaRow}>
                        <Users size={11} color={colors.textSecondary} />
                        <Text style={styles.headerMembers} numberOfLines={1}>
                            {activeGroup.members?.length || 0} members{memberSummary ? ` · ${memberSummary}` : ""}
                        </Text>
                    </View>
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
                            <Text style={styles.emptyText}>No messages yet. Start the conversation.</Text>
                        </View>
                    }
                />
            </View>

            <ChatInput conversationId={activeGroup._id} isGroup onSend={() => {}} />
        </View>
    );
}

function BubbleBody({ item, mine, showName, nameColor, styles }) {
    return (
        <>
            {showName && <Text style={[styles.senderName, { color: nameColor }]}>{item.sender?.name}</Text>}
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
    groupAvatar: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    groupAvatarText: { fontSize: 18, fontWeight: "800", color: "#fff" },
    headerInfo: { flex: 1 },
    headerName: { fontSize: 16, fontWeight: "700", color: colors.text },
    headerMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
    headerMembers: { fontSize: 12, color: colors.textSecondary, flex: 1 },

    messagesBg: { flex: 1, backgroundColor: colors.background },
    listContent: { paddingHorizontal: 12, paddingVertical: 12 },

    daySepRow: { alignItems: "center", marginVertical: 10 },
    dayPill: {
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999,
    },
    dayPillText: { fontSize: 11, fontWeight: "700", color: colors.textSecondary },

    row: { width: "100%", marginBottom: 6, flexDirection: "row", alignItems: "flex-end", gap: 8 },
    rowMine: { justifyContent: "flex-end" },
    rowOther: { justifyContent: "flex-start" },
    senderAvatarSlot: { width: 28 },
    senderAvatar: { width: 28, height: 28, borderRadius: 14 },
    senderAvatarPh: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    senderAvatarText: { fontSize: 12, fontWeight: "700", color: "#fff" },

    bubble: { maxWidth: "78%", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18 },
    bubbleMine: { borderBottomRightRadius: 5 },
    bubbleOther: {
        backgroundColor: colors.card, borderBottomLeftRadius: 5,
        borderWidth: 1, borderColor: colors.border,
    },
    senderName: { fontSize: 12.5, fontWeight: "700", marginBottom: 3 },
    media: { width: 200, height: 200, borderRadius: 12, marginBottom: 6, resizeMode: "cover" },
    bubbleContent: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", gap: 8 },
    textMine: { fontSize: 15, color: "#fff", lineHeight: 21 },
    textOther: { fontSize: 15, color: colors.text, lineHeight: 21 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: "auto" },
    timeMine: { fontSize: 10.5, color: "rgba(255,255,255,0.8)" },
    timeOther: { fontSize: 10.5, color: colors.textSecondary },

    empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80, transform: [{ scaleY: -1 }] },
    emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: "center", paddingHorizontal: 30 },
});
