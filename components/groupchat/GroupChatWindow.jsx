import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import socket, { connectSocket } from "@/lib/socket";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ui/Typography";
import { Loader } from "@/components/Loader";
import ChatInput from "../chat/ChatInput";
import Bubble from "../chat/Bubble";
import { groupStatus } from "../chat/MessageStatus";
import { chatStyles, dayLabel, endsRun, sameDay, startsRun } from "../chat/chatUi";

const AVATAR_COLORS = ["#F97316", "#EC4899", "#A855F7", "#3B82F6", "#0D9488", "#EF4444", "#6366F1"];
const GROUP_GRADIENT = ["#0891B2", "#14B8A6"];
const colorFor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
const idOf = (v) => (v && typeof v === "object" ? String(v._id || "") : String(v || ""));

export default function GroupChatWindow({ activeGroup, onBack }) {
    const { colors, theme } = useTheme();
    const isDark = theme === "dark";
    const base = useMemo(() => chatStyles(colors, isDark), [colors, isDark]);
    const styles = useMemo(() => ({ ...base, ...extra }), [base]);

    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true); // spinner, not "No messages yet", while history loads
    const [me, setMe] = useState(null);
    const meRef = useRef(null);
    const groupId = activeGroup?._id ? String(activeGroup._id) : null;
    const memberIds = useMemo(() => (activeGroup?.members || []).map(idOf), [activeGroup]);

    const markSeen = useCallback(() => {
        if (groupId) api.post(`/groups/${groupId}/mark-seen`).catch(() => {});
    }, [groupId]);

    useEffect(() => {
        const init = async () => {
            if (!groupId) return;
            try {
                const userRes = await api.get("/users/me");
                setMe(userRes.data);
                meRef.current = userRes.data;
                // Loading the messages also marks them seen for me on the server.
                const res = await api.get(`/groups/${groupId}/messages`);
                setMessages(res.data || []);
            } catch (err) {
                console.error("Error loading group messages:", err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [groupId]);

    useEffect(() => {
        if (!groupId) return;
        connectSocket();
        socket.emit("joinGroup", groupId);

        const onNew = (msg) => {
            if (String(msg.groupId) !== groupId) return;
            setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
            if (idOf(msg.sender) !== idOf(meRef.current?._id)) markSeen();
        };
        const onSeen = ({ groupId: gid, userId }) => {
            if (String(gid) !== groupId) return;
            setMessages((prev) =>
                prev.map((m) =>
                    (m.seenBy || []).map(idOf).includes(String(userId)) ? m : { ...m, seenBy: [...(m.seenBy || []), userId] }
                )
            );
        };

        socket.on("newGroupMessage", onNew);
        socket.on("groupMessagesSeen", onSeen);
        return () => {
            socket.emit("leaveGroup", groupId);
            socket.off("newGroupMessage", onNew);
            socket.off("groupMessagesSeen", onSeen);
        };
    }, [groupId, markSeen]);

    const data = useMemo(() => [...messages].reverse(), [messages]);

    if (!activeGroup) return null;

    const myId = idOf(me?._id);
    const isMine = (msg) => !!myId && idOf(msg.sender) === myId;

    const renderItem = ({ item, index }) => {
        const mine = isMine(item);
        const older = data[index + 1];
        const newer = data[index - 1];
        const showDay = !older || !sameDay(older.createdAt, item.createdAt);
        const firstOfRun = startsRun(item, older);
        const lastOfRun = endsRun(item, newer);
        const sender = item.sender || {};

        return (
            <View>
                {showDay && <Text style={styles.dayLabel}>{dayLabel(item.createdAt)}</Text>}
                {!mine && firstOfRun && <Text style={styles.senderName}>{sender.name || "Member"}</Text>}
                <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
                    <View style={[styles.bubbleLine, mine && styles.bubbleLineMine]}>
                        {/* Small avatar beside the last bubble of someone else's run */}
                        {!mine && (
                            <View style={styles.avatarSlot}>
                                {lastOfRun &&
                                    (sender.imageUrl ? (
                                        <Image source={{ uri: sender.imageUrl }} style={styles.senderAvatar} />
                                    ) : (
                                        <View style={[styles.senderAvatar, { backgroundColor: colorFor(sender.name) }]}>
                                            <Text style={styles.senderAvatarText}>{sender.name?.charAt(0)?.toUpperCase() || "?"}</Text>
                                        </View>
                                    ))}
                            </View>
                        )}
                        <Bubble
                            item={item}
                            status={mine ? groupStatus(item, memberIds, myId) : null}
                            styles={styles}
                            colors={colors}
                            isDark={isDark}
                            spacingStyle={lastOfRun ? styles.gapAfterRun : styles.gapInRun}
                        />
                    </View>
                </View>
            </View>
        );
    };

    const memberCount = activeGroup.members?.length || 0;

    return (
        <View style={styles.container}>
            {/* Header — back, group avatar, name, members. No call / video buttons. */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7} accessibilityLabel="Back">
                    <ChevronLeft size={26} color={colors.text} strokeWidth={2.2} />
                </TouchableOpacity>
                {activeGroup.photo?.url ? (
                    <Image source={{ uri: activeGroup.photo.url }} style={styles.avatar} />
                ) : (
                    <LinearGradient colors={GROUP_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarPh}>
                        <Text style={styles.avatarText}>{activeGroup.name?.charAt(0)?.toUpperCase() || "G"}</Text>
                    </LinearGradient>
                )}
                <View style={styles.headerInfo}>
                    <Text style={styles.headerName} numberOfLines={1}>{activeGroup.name}</Text>
                    <Text style={styles.headerStatus} numberOfLines={1}>
                        {memberCount} member{memberCount !== 1 ? "s" : ""}
                    </Text>
                </View>
            </View>

            <FlatList
                style={styles.list}
                data={data}
                inverted
                keyExtractor={(item, i) => item._id || String(i)}
                renderItem={renderItem}
                extraData={`${myId}-${isDark}-${memberIds.length}`}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                initialNumToRender={15}
                windowSize={11}
                removeClippedSubviews
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={loading ? (
                    <View style={styles.empty}><Loader size={30} /></View>
                ) : (
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>No messages yet. Start the conversation.</Text>
                    </View>
                )}
            />

            <ChatInput conversationId={groupId} isGroup onSend={() => {}} />
        </View>
    );
}

const AVATAR = 28;
const extra = StyleSheet.create({
    senderName: { fontSize: 12, color: "#8A8F98", marginLeft: AVATAR + 12, marginBottom: 4 },
    bubbleLine: { flexDirection: "row", alignItems: "flex-end", gap: 8, maxWidth: "88%" },
    bubbleLineMine: { justifyContent: "flex-end" },
    avatarSlot: { width: AVATAR, marginBottom: 14 },
    senderAvatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    senderAvatarText: { fontSize: 12, fontWeight: "700", color: "#fff" },
});
