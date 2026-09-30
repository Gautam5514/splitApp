import { Loader } from "@/components/Loader";
import MarkdownText from "@/components/chat/MarkdownText";
import AI3DLogo from "@/components/icons/AI3DLogo";
import AIThinking, { TypingDots } from "@/components/icons/AIThinking";
import { RoundButton, Segmented, useDesign } from "@/components/ui/Design";
import { Text, TextInput } from "@/components/ui/Typography";
import { SCREEN_GUTTER } from "@/constants/layout";
import { api } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
    ArrowUp,
    ChartPie,
    ChevronLeft,
    HandCoins,
    History,
    Plane,
    Scale,
    SquarePen,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Easing,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PROVIDER_STORAGE_KEY = "ai-provider";
const HISTORY_KEY = "ai-history-v1";
const HISTORY_LIMIT = 20;
const CONTEXT_TURNS = 12; // recent turns sent so follow-up questions make sense

const PROVIDERS = [
    { value: "gemini", label: "Gemini" },
    { value: "openai", label: "ChatGPT" },
];

// Ready-made prompts. Each has a SHORT, meaningful label shown on the chip,
// and a longer, well-structured `prompt` that gets auto-typed into the input
// box when tapped (so the user can review / edit before send).
const SUGGESTIONS = [
    { label: "Who owes me", prompt: "Who owes me money right now? List each person with the amount and group, biggest first." },
    { label: "What I owe", prompt: "Show everything I owe, grouped by person, with the total at the end." },
    { label: "Total spend", prompt: "Show my total spend from January to December, broken down by month with amounts." },
    { label: "This month", prompt: "How much did I spend this month? Break it down by category with amounts." },
    { label: "Recent trip", prompt: "Summarise my most recent trip: total cost, my share, who paid the most and who still owes." },
    { label: "Settle up", prompt: "What is the fewest number of payments to settle all my groups? List who pays whom." },
];

const CATEGORY_ICON = { balances: Scale, spending: ChartPie, trips: Plane, general: HandCoins };

// History is kept ON THIS DEVICE only (the server never stores AI chats).
const categorize = (text) => {
    const s = text.toLowerCase();
    if (/(owe|owed|debt|settle|balance|pay back|lent)/.test(s)) return "balances";
    if (/(spend|spent|expense|cost|budget|month|categor|total)/.test(s)) return "spending";
    if (/(trip|travel|flight|hotel|plan|itinerar|visit)/.test(s)) return "trips";
    return "general";
};

const relTime = (ts) => {
    const diff = Date.now() - ts;
    if (diff < 60_000) return "Just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return new Date(ts).toLocaleDateString([], { day: "numeric", month: "short" });
};


export default function AiChatScreen() {
    const { colors, isDark, t } = useDesign();
    const styles = useMemo(() => getStyles(colors, t, isDark), [colors, t, isDark]);

    const [prompt, setPrompt] = useState("");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [provider, setProvider] = useState("gemini");
    const [history, setHistory] = useState([]);
    const [logoPressed, setLogoPressed] = useState(false);
    const listRef = useRef(null);

    useEffect(() => {
        AsyncStorage.getItem(PROVIDER_STORAGE_KEY).then((saved) => {
            if (saved === "gemini" || saved === "openai") setProvider(saved);
        });
        AsyncStorage.getItem(HISTORY_KEY)
            .then((raw) => raw && setHistory(JSON.parse(raw) || []))
            .catch(() => {});
    }, []);

    const selectProvider = (key) => {
        setProvider(key);
        AsyncStorage.setItem(PROVIDER_STORAGE_KEY, key);
    };

    const remember = (text) => {
        setHistory((prev) => {
            const next = [
                { id: String(Date.now()), text, category: categorize(text), at: Date.now() },
                ...prev.filter((h) => h.text.toLowerCase() !== text.toLowerCase()),
            ].slice(0, HISTORY_LIMIT);
            AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next)).catch(() => {});
            return next;
        });
    };

    const clearHistory = () => {
        setHistory([]);
        AsyncStorage.removeItem(HISTORY_KEY).catch(() => {});
    };

    const askAI = async (currentPrompt = prompt) => {
        const trimmedPrompt = currentPrompt.trim();
        if (!trimmedPrompt || loading) return;

        setLoading(true);
        const priorTurns = messages.filter((m) => !m.error).slice(-CONTEXT_TURNS).map((m) => ({ role: m.role, content: m.content }));
        setMessages((prev) => [...prev, { role: "user", content: trimmedPrompt, at: Date.now() }]);
        setPrompt("");
        remember(trimmedPrompt);

        try {
            // AI generation (DB context + Gemini/OpenAI with provider fallback)
            // routinely outlasts the api client's global 15s timeout, so give
            // this one request its own generous budget.
            const res = await api.post(
                "/ai/query",
                { prompt: trimmedPrompt, provider, history: priorTurns },
                { timeout: 90000 }
            );
            const aiText = res.data?.text || "I'm sorry, I couldn't find an answer.";
            setMessages((prev) => [...prev, { role: "ai", content: aiText, provider: res.data?.provider, at: Date.now() }]);
        } catch (err) {
            const status = err?.response?.status;
            const timedOut = err?.code === "ECONNABORTED";
            // The backend sends actionable messages (rate limited, provider
            // overloaded, key rejected) — show those instead of a generic one.
            const errText = timedOut
                ? "The AI is taking too long to respond. Please try again."
                : err?.response?.data?.message ||
                  err?.response?.data?.error ||
                  "SplitEase AI is unavailable right now. Please check your connection and try again.";
            console.warn("AI request failed:", status ?? err?.code, errText);
            setMessages((prev) => [...prev, { role: "ai", content: errText, error: true, at: Date.now() }]);
        } finally {
            setLoading(false);
        }
    };

    const newChat = () => {
        if (loading) return;
        setMessages([]);
        setPrompt("");
    };

    useEffect(() => {
        if (!messages.length) return;
        const id = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
        return () => clearTimeout(id);
    }, [messages, loading]);

    const renderMessage = useCallback(
        ({ item }) => <ChatMessage message={item} colors={colors} styles={styles} t={t} />,
        [colors, styles, t]
    );

    const canSend = !!prompt.trim() && !loading;
    const inChat = messages.length > 0;

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <StatusBar style={isDark ? "light" : "dark"} />

            {/* ── Header ─────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <RoundButton onPress={() => router.back()} label="Back">
                    <ChevronLeft size={22} color={colors.text} strokeWidth={2.3} />
                </RoundButton>
                {inChat && (
                    <View style={styles.brand}>
                        <AI3DLogo size={26} shadow={false} />
                        <Text style={styles.brandText}>SplitEase AI</Text>
                    </View>
                )}
                {inChat ? (
                    <RoundButton onPress={newChat} label="New chat" disabled={loading}>
                        <SquarePen size={18} color={colors.text} strokeWidth={2} />
                    </RoundButton>
                ) : (
                    <Segmented options={PROVIDERS} value={provider} onChange={selectProvider} style={styles.providerCompact} />
                )}
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
                {inChat ? (
                    <FlatList
                        ref={listRef}
                        data={messages}
                        keyExtractor={(_, i) => String(i)}
                        renderItem={renderMessage}
                        contentContainerStyle={styles.messagesContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        initialNumToRender={15}
                        windowSize={11}
                        removeClippedSubviews
                        ListFooterComponent={loading ? <ThinkingIndicator colors={colors} styles={styles} isDark={isDark} /> : null}
                    />
                ) : (
                    <ScrollView contentContainerStyle={styles.homeContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {/* One big 3D logo — nothing else competing for attention */}
                        <View style={styles.hero} accessibilityLabel="SplitEase AI">
                            <FloatingLogo size={200} />
                        </View>

                        {/* Compact suggestion chips — tapping fills the input box
                            with the longer question so you can review / edit it
                            before sending. Two-line wrapped grid to save space. */}
                        <View style={styles.suggestGrid}>
                            {SUGGESTIONS.map((item) => {
                                const Icon = CATEGORY_ICON[categorize(item.prompt)] || Scale;
                                return (
                                    <TouchableOpacity
                                        key={item.label}
                                        style={styles.suggestChip}
                                        onPress={() => setPrompt(item.prompt)}
                                        activeOpacity={0.8}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Fill: ${item.prompt}`}
                                    >
                                        <Icon size={15} color={colors.text} strokeWidth={1.9} />
                                        <Text style={styles.suggestChipText}>{item.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* History (this phone only) */}
                        <View style={styles.historyHead}>
                            <Text style={styles.historyTitle}>History</Text>
                            {history.length > 0 && (
                                <TouchableOpacity onPress={clearHistory} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Clear history">
                                    <Text style={styles.historyAction}>Clear</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        {history.length ? (
                            <View style={styles.historyList}>
                                {history.map((h) => (
                                    <TouchableOpacity
                                        key={h.id}
                                        style={styles.historyRow}
                                        onPress={() => askAI(h.text)}
                                        activeOpacity={0.75}
                                        accessibilityLabel={`Ask again: ${h.text}`}
                                    >
                                        <View style={styles.historyIcon}>
                                            <History size={17} color={colors.textSecondary} />
                                        </View>
                                        <Text style={styles.historyText} numberOfLines={2}>{h.text}</Text>
                                        <Text style={styles.historyTime}>{relTime(h.at)}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : (
                            <Text style={styles.historyEmpty}>
                                Your recent questions will show up here. They stay on this phone.
                            </Text>
                        )}
                    </ScrollView>
                )}

                {/* ── Composer ──────────────────────────────────────────── */}
                <View style={styles.composerBar}>
                    <View style={styles.composer}>
                        <TouchableOpacity
                            style={styles.composerIcon}
                            activeOpacity={0.85}
                            onPressIn={() => setLogoPressed(true)}
                            onPressOut={() => setLogoPressed(false)}
                            onPress={() => selectProvider(provider === "gemini" ? "openai" : "gemini")}
                            accessibilityRole="button"
                            accessibilityLabel={`Switch AI model, currently ${provider === "gemini" ? "Gemini" : "ChatGPT"}`}
                        >
                            <View style={{ transform: [{ scale: logoPressed ? 0.9 : 1 }] }}>
                                <AI3DLogo size={48} shadow={false} variant={logoPressed ? "dark" : "light"} />
                            </View>
                        </TouchableOpacity>
                        <TextInput
                            style={styles.input}
                            placeholder="Ask SplitEase AI anything…"
                            placeholderTextColor={colors.textSecondary}
                            selectionColor={colors.primary}
                            value={prompt}
                            onChangeText={setPrompt}
                            multiline
                            accessibilityLabel="Message SplitEase AI"
                        />
                        <TouchableOpacity
                            onPress={() => askAI()}
                            disabled={!canSend}
                            activeOpacity={0.8}
                            style={[styles.sendButton, canSend && styles.sendButtonActive]}
                            accessibilityRole="button"
                            accessibilityLabel="Send"
                            accessibilityState={{ disabled: !canSend }}
                        >
                            {loading ? (
                                <Loader size={16} color={colors.textSecondary} />
                            ) : (
                                <ArrowUp size={19} color={canSend ? t.onInk : colors.textSecondary} strokeWidth={2.5} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

/** Big hero logo that slowly floats and breathes (idle, not "thinking"). */
function FloatingLogo({ size }) {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(v, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(v, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [v]);
    return (
        <Animated.View
            style={{
                transform: [
                    { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [4, -6] }) },
                    { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.02] }) },
                ],
            }}
        >
            <AI3DLogo size={size} />
        </Animated.View>
    );
}

// ── Messages ──────────────────────────────────────────────────────────────
const PROVIDER_LABELS = { gemini: "Gemini", openai: "ChatGPT", smart: "Instant answer" };
const clock = (ts) => new Date(ts || Date.now()).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase();

/** AI turn: avatar + time/name on one line, the answer bubble underneath. */
const AiHeader = ({ at, provider, styles, colors }) => (
    <View style={styles.aiHead}>
        <View style={styles.aiAvatar}>
            <AI3DLogo size={46} shadow={false} />
        </View>
        <View>
            <Text style={styles.aiTime}>{clock(at)}{provider ? ` · ${provider}` : ""}</Text>
            <Text style={styles.aiName}>SplitEase AI</Text>
        </View>
    </View>
);

const ChatMessage = ({ message, colors, styles, t }) => {
    if (message.role === "user") {
        return (
            <View style={styles.userRow}>
                <View style={styles.userBubble}>
                    <Text style={styles.userText}>{message.content}</Text>
                </View>
            </View>
        );
    }
    return (
        <View style={styles.aiRow}>
            <AiHeader at={message.at} provider={PROVIDER_LABELS[message.provider]} styles={styles} colors={colors} />
            <View style={styles.aiBody}>
            <View style={[styles.aiBubble, message.error && styles.aiBubbleError]}>
                {message.error ? (
                    <Text style={[styles.userText, { color: colors.error }]}>{message.content}</Text>
                ) : (
                    // AI replies are Markdown (**bold**, lists, tables) — render them properly.
                    <MarkdownText
                        color={colors.text}
                        mutedColor={colors.textSecondary}
                        borderColor={t.outline}
                        surfaceColor={t.surfaceAlt}
                    >
                        {message.content}
                    </MarkdownText>
                )}
            </View>
            </View>
        </View>
    );
};

/** Loading state while the AI works: animated 3D logo + typing dots + elapsed time. */
const ThinkingIndicator = ({ colors, styles, isDark }) => {
    const [secs, setSecs] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setSecs((s) => s + 1), 1000);
        return () => clearInterval(id);
    }, []);
    const label = secs < 4 ? "Thinking" : secs < 12 ? "Crunching your numbers" : "Almost there";
    return (
        <View style={styles.aiRow}>
            <View style={styles.aiHead}>
                <View style={styles.aiAvatarLive}>
                    <View style={styles.aiAvatarAnim}>
                        <AIThinking
                            size={46}
                            color={colors.text}
                            haloColor={isDark ? "rgba(255,255,255,0.14)" : "rgba(20,20,20,0.10)"}
                        />
                    </View>
                </View>
                <View>
                    <Text style={styles.aiTime}>{secs > 0 ? `${secs}s` : "Now"}</Text>
                    <Text style={styles.aiName}>SplitEase AI</Text>
                </View>
            </View>
            <View style={styles.aiBody}>
                <View style={[styles.aiBubble, styles.thinking]}>
                    <TypingDots color={colors.textSecondary} />
                    <Text style={styles.thinkingText}>{label}…</Text>
                </View>
            </View>
        </View>
    );
};

const getStyles = (colors, t, isDark) => {
    const shadow = {
        shadowColor: "#000", shadowOffset: { width: 0, height: 10 },
        shadowOpacity: isDark ? 0 : 0.06, shadowRadius: 22, elevation: isDark ? 0 : 3,
    };
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        flex: { flex: 1 },

        header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SCREEN_GUTTER, paddingTop: 6, paddingBottom: 8 },
        brand: { flexDirection: "row", alignItems: "center", gap: 7 },
        brandText: { fontSize: 16, fontWeight: "600", color: colors.text },

        // Home
        homeContent: { paddingHorizontal: SCREEN_GUTTER, paddingTop: 4, paddingBottom: 24 },
        hero: { alignItems: "center", justifyContent: "center", paddingTop: 20, paddingBottom: 28 },
        providerCompact: { alignSelf: "center" },

        // Compact suggestion chips — wrapped into two lines to save space.
        suggestGrid: {
            marginTop: 6, flexDirection: "row", flexWrap: "wrap", gap: 8,
            alignItems: "center", justifyContent: "center",
        },
        suggestChip: {
            flexDirection: "row", alignItems: "center", gap: 7,
            paddingVertical: 9, paddingHorizontal: 14, borderRadius: 20,
            backgroundColor: t.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline,
        },
        suggestChipText: { fontSize: 13.5, fontWeight: "600", color: colors.text },

        historyHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 26, marginBottom: 4 },
        historyTitle: { fontSize: 22, fontWeight: "700", color: colors.text, letterSpacing: -0.3 },
        historyAction: { fontSize: 14.5, fontWeight: "600", color: colors.text },

        historyList: { marginTop: 14, gap: 4 },
        historyRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
        historyIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: t.surfaceAlt },
        historyText: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 20 },
        historyTime: { fontSize: 12, color: colors.textSecondary },
        historyEmpty: { marginTop: 16, fontSize: 13.5, color: colors.textSecondary, lineHeight: 19 },

        // Conversation
        messagesContent: { paddingHorizontal: SCREEN_GUTTER, paddingTop: 12, paddingBottom: 16, gap: 18 },
        userRow: { alignItems: "flex-end" },
        userBubble: {
            maxWidth: "80%", paddingHorizontal: 18, paddingVertical: 13, borderRadius: 22,
            backgroundColor: t.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline,
            ...shadow,
        },
        userText: { fontSize: 15, lineHeight: 21.5, color: colors.text },

        aiRow: { alignSelf: "stretch" },
        aiHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
        aiAvatar: {
            width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center",
            // soft drop shadow under the 3D sphere
            shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: isDark ? 0.5 : 0.22, shadowRadius: 10, elevation: 6,
        },
        aiTime: { fontSize: 12.5, color: colors.textSecondary },
        aiName: { fontSize: 15, fontWeight: "600", color: colors.text, marginTop: 1 },
        // Bubble is indented under the name (46 avatar + 12 gap) and can use the rest of the width.
        aiBody: { alignSelf: "stretch", paddingLeft: 58 },
        aiBubble: {
            alignSelf: "flex-start", maxWidth: "100%", paddingHorizontal: 18, paddingVertical: 14, borderRadius: 22,
            borderTopLeftRadius: 8,
            backgroundColor: t.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline,
            ...shadow,
        },
        aiBubbleError: { borderColor: colors.error },
        // Same 46pt slot as the normal avatar; the animation overflows it on purpose.
        aiAvatarLive: { width: 46, height: 46, alignItems: "center", justifyContent: "center", overflow: "visible" },
        aiAvatarAnim: { position: "absolute" },
        thinking: { flexDirection: "row", alignItems: "center", gap: 10 },
        thinkingText: { fontSize: 14, color: colors.textSecondary },

        // Composer
        composerBar: { paddingHorizontal: SCREEN_GUTTER, paddingTop: 10, paddingBottom: 10 },
        composer: {
            flexDirection: "row", alignItems: "flex-end", gap: 8,
            minHeight: 60, borderRadius: 30, padding: 6,
            backgroundColor: t.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline,
            ...shadow,
        },
        composerIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
        input: { flex: 1, fontSize: 15.5, color: colors.text, maxHeight: 120, paddingTop: 14, paddingBottom: 14 },
        sendButton: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: t.surfaceAlt },
        sendButtonActive: { backgroundColor: t.ink },
    });
};
