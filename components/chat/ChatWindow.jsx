import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import socket, { connectSocket } from "@/lib/socket";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Image, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ui/Typography";
import { Loader } from "@/components/Loader";
import ChatInput from "./ChatInput";
import Bubble from "./Bubble";
import { directStatus } from "./MessageStatus";
import { chatStyles, dayLabel, endsRun, sameDay, timeOf } from "./chatUi";

const AVATAR_COLORS = ["#14B8A6", "#10B981", "#0891B2", "#2563EB", "#6366F1", "#8B5CF6"];
const colorFor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
const idOf = (v) => (v && typeof v === "object" ? String(v._id || "") : String(v || ""));

export default function ChatWindow({ activeFriend, onBack }) {
    const { colors, theme } = useTheme();
    const isDark = theme === "dark";
    const styles = useMemo(() => chatStyles(colors, isDark), [colors, isDark]);

    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true); // spinner, not "No messages yet", while history loads
    const [conversationId, setConversationId] = useState(null);
    const [me, setMe] = useState(null);
    const [isOnline, setIsOnline] = useState(!!activeFriend?.isOnline);
    const [lastActive, setLastActive] = useState(activeFriend?.lastActive || null);
    const friendId = activeFriend?._id ? String(activeFriend._id) : null;
    const meRef = useRef(null);

    const formatLastSeen = (date) => {
        if (!date || date === "undefined" || date === "null") return "Offline";
        const d = new Date(date);
        if (Number.isNaN(d.getTime())) return "Offline";
        return d.toDateString() === new Date().toDateString()
            ? `Last seen today at ${timeOf(d)}`
            : `Last seen ${d.toLocaleDateString([], { day: "numeric", month: "short" })}`;
    };

    // Opening / viewing the chat marks the friend's messages as seen → their ticks turn blue.
    const markSeen = useCallback(() => {
        if (friendId) api.post("/chat/reset-unread", { otherUserId: friendId }).catch(() => {});
    }, [friendId]);

    useEffect(() => {
        const init = async () => {
            try {
                const userRes = await api.get("/users/me");
                setMe(userRes.data);
                meRef.current = userRes.data;
                if (activeFriend) {
                    // By id: people found via exact-email search only carry a masked email.
                    const convo = await api.post("/chat/conversation", { otherUserId: activeFriend._id, otherEmail: activeFriend.email });
                    setConversationId(convo.data._id);
                    const msgs = await api.get(`/chat/messages/${convo.data._id}`);
                    setMessages(msgs.data || []);
                    markSeen();
                }
            } catch (err) {
                console.error("Error loading chat:", err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [activeFriend, markSeen]);

    useEffect(() => {
        connectSocket();
        if (!conversationId) return;
        socket.emit("joinConversation", conversationId);

        const onNewMessage = (msg) => {
            if (String(msg.conversationId) !== String(conversationId)) return;
            setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
            // Incoming while I'm looking at the chat → it's seen straight away.
            if (idOf(msg.sender) !== idOf(meRef.current?._id)) markSeen();
        };
        const onSeen = ({ conversationId: cid, seenBy }) => {
            if (String(cid) !== String(conversationId)) return;
            setMessages((prev) =>
                prev.map((m) =>
                    idOf(m.sender) !== String(seenBy) && !(m.seenBy || []).map(idOf).includes(String(seenBy))
                        ? { ...m, seenBy: [...(m.seenBy || []), seenBy], deliveredTo: [...(m.deliveredTo || []), seenBy] }
                        : m
                )
            );
        };
        const onDelivered = ({ conversationId: cid, deliveredTo }) => {
            if (String(cid) !== String(conversationId)) return;
            setMessages((prev) =>
                prev.map((m) =>
                    idOf(m.sender) !== String(deliveredTo) && !(m.deliveredTo || []).map(idOf).includes(String(deliveredTo))
                        ? { ...m, deliveredTo: [...(m.deliveredTo || []), deliveredTo] }
                        : m
                )
            );
        };
        const onStatus = ({ userId, online, lastActive: la }) => {
            if (friendId && String(userId) === friendId) {
                setIsOnline(online);
                if (!online) setLastActive(la);
            }
        };

        socket.on("newMessage", onNewMessage);
        socket.on("messagesSeen", onSeen);
        socket.on("messagesDelivered", onDelivered);
        socket.on("userStatus", onStatus);
        // Remove only OUR listeners — the chat list keeps its own "newMessage" handler.
        return () => {
            socket.off("newMessage", onNewMessage);
            socket.off("messagesSeen", onSeen);
            socket.off("messagesDelivered", onDelivered);
            socket.off("userStatus", onStatus);
        };
    }, [conversationId, friendId, markSeen]);

    // Optimistic send: temp bubble with a clock → replaced by the saved message.
    const handleSend = useCallback((msg, replaceId) => {
        setMessages((prev) => {
            if (msg === null) return prev.filter((m) => m._id !== replaceId); // send failed
            const withoutTemp = replaceId ? prev.filter((m) => m._id !== replaceId) : prev;
            return withoutTemp.some((m) => m._id === msg._id) ? withoutTemp : [...withoutTemp, msg];
        });
    }, []);

    const data = useMemo(() => [...messages].reverse(), [messages]); // newest first (inverted list)

    if (!activeFriend) return null;

    const myId = idOf(me?._id);
    const isMine = (msg) => !!myId && idOf(msg.sender) === myId;

    const renderItem = ({ item, index }) => {
        const mine = isMine(item);
        const older = data[index + 1];
        const newer = data[index - 1];
        const showDay = !older || !sameDay(older.createdAt, item.createdAt);
        const lastOfRun = endsRun(item, newer);

        return (
            <View>
                {showDay && <Text style={styles.dayLabel}>{dayLabel(item.createdAt)}</Text>}
                <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
                    <Bubble
                        item={item}
                        status={mine ? directStatus(item, friendId) : null}
                        styles={styles}
                        colors={colors}
                        isDark={isDark}
                        spacingStyle={lastOfRun ? styles.gapAfterRun : styles.gapInRun}
                    />
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header — back, avatar, name, status. No call / video buttons. */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7} accessibilityLabel="Back">
                    <ChevronLeft size={26} color={colors.text} strokeWidth={2.2} />
                </TouchableOpacity>
                {/* Tap photo or name → contact info (shared media, groups in common) */}
                <TouchableOpacity
                    style={styles.headerTap}
                    activeOpacity={0.7}
                    disabled={!conversationId}
                    onPress={() =>
                        router.push({
                            pathname: "/contact/[id]",
                            params: {
                                id: friendId,
                                conversationId,
                                name: activeFriend.name,
                                email: activeFriend.email,
                                imageUrl: activeFriend.imageUrl || "",
                                isOnline: String(isOnline),
                            },
                        })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`View ${activeFriend.name}'s info`}
                >
                <View style={styles.avatarWrap}>
                    {activeFriend.imageUrl ? (
                        <Image source={{ uri: activeFriend.imageUrl }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatarPh, { backgroundColor: colorFor(activeFriend.name) }]}>
                            <Text style={styles.avatarText}>{activeFriend.name?.charAt(0)?.toUpperCase() || "?"}</Text>
                        </View>
                    )}
                    {isOnline && <View style={styles.onlineDot} />}
                </View>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerName} numberOfLines={1}>{activeFriend.name}</Text>
                    <Text style={styles.headerStatus} numberOfLines={1}>
                        {isOnline ? "Online" : formatLastSeen(lastActive)}
                    </Text>
                </View>
                </TouchableOpacity>
            </View>

            <FlatList
                style={styles.list}
                data={data}
                inverted
                keyExtractor={(item, i) => item._id || String(i)}
                renderItem={renderItem}
                extraData={`${myId}-${isDark}`}
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
                        <Text style={styles.emptyText}>No messages yet. Say hello 👋</Text>
                    </View>
                )}
            />

            <ChatInput conversationId={conversationId} meId={myId} onSend={handleSend} />
        </View>
    );
}
