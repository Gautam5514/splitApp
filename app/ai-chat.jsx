import { useTheme } from "@/context/ThemeContext";
import { Loader } from "@/components/Loader";
import { api } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, Bot, Send, Sparkles } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PROVIDER_STORAGE_KEY = "ai-provider";

const PROVIDERS = [
    { key: "gemini", label: "Gemini" },
    { key: "openai", label: "ChatGPT" },
];

export default function AiChatScreen() {
    const { colors, theme } = useTheme();
    const [prompt, setPrompt] = useState("");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [provider, setProvider] = useState("gemini");
    const scrollViewRef = useRef(null);

    const styles = getStyles(colors);

    useEffect(() => {
        AsyncStorage.getItem(PROVIDER_STORAGE_KEY).then((saved) => {
            if (saved === "gemini" || saved === "openai") setProvider(saved);
        });
    }, []);

    const selectProvider = (key) => {
        setProvider(key);
        AsyncStorage.setItem(PROVIDER_STORAGE_KEY, key);
    };

    const askAI = async (currentPrompt = prompt) => {
        const trimmedPrompt = currentPrompt.trim();
        if (!trimmedPrompt || loading) return;

        setLoading(true);
        const userMessage = { role: "user", content: trimmedPrompt };
        setMessages((prev) => [...prev, userMessage]);
        setPrompt("");

        try {
            // AI generation (DB context + Gemini/OpenAI with provider fallback)
            // routinely outlasts the api client's global 15s timeout, so give
            // this one request its own generous budget.
            const res = await api.post(
                "/ai/query",
                { prompt: trimmedPrompt, provider },
                { timeout: 90000 }
            );
            const aiText = res.data?.text || "I'm sorry, I couldn't find an answer.";
            const usedProvider = res.data?.provider;
            setMessages((prev) => [...prev, { role: "ai", content: aiText, provider: usedProvider }]);
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

            setMessages((prev) => [...prev, { role: "ai", content: errText, error: true }]);
        } finally {
            setLoading(false);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        setPrompt(suggestion);
        askAI(suggestion);
    };

    useEffect(() => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [messages, loading]);

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <StatusBar style={theme === 'dark' ? "light" : "dark"} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Sparkles size={20} color={colors.success} style={styles.headerIcon} />
                    <Text style={styles.headerTitle}>SplitEase AI</Text>
                </View>
                <View style={{ width: 24 }} />
            </View>

            {/* Provider Toggle */}
            <View style={styles.providerBar}>
                {PROVIDERS.map((p) => {
                    const active = provider === p.key;
                    return (
                        <TouchableOpacity
                            key={p.key}
                            onPress={() => selectProvider(p.key)}
                            style={[styles.providerPill, active && styles.providerPillActive]}
                        >
                            <Text style={[styles.providerPillText, active && styles.providerPillTextActive]}>
                                {p.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ flex: 1 }}
            >
                <View style={styles.chatContainer}>
                    <ScrollView
                        ref={scrollViewRef}
                        contentContainerStyle={styles.messagesContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {messages.length === 0 ? (
                            <EmptyState onSuggestionClick={handleSuggestionClick} colors={colors} styles={styles} />
                        ) : (
                            messages.map((m, i) => (
                                <ChatMessage key={i} message={m} colors={colors} styles={styles} />
                            ))
                        )}
                        {loading && <ThinkingIndicator colors={colors} styles={styles} />}
                    </ScrollView>

                    {/* Input Area */}
                    <View style={styles.inputWrapper}>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Ask about your trips..."
                                placeholderTextColor={colors.placeholder}
                                value={prompt}
                                onChangeText={setPrompt}
                                multiline
                            />
                            <TouchableOpacity
                                onPress={() => askAI()}
                                disabled={loading || !prompt.trim()}
                                style={[
                                    styles.sendButton,
                                    (!prompt.trim() || loading) && styles.sendButtonDisabled,
                                ]}
                            >
                                {loading ? (
                                    <Loader size={18} color="#fff" />
                                ) : (
                                    <Send size={20} color="white" />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// --- Sub Components ---

const PROVIDER_LABELS = { gemini: "Gemini", openai: "ChatGPT", smart: "Instant lookup" };

const ChatMessage = ({ message, colors, styles }) => {
    const isUser = message.role === "user";
    const providerLabel = !isUser && PROVIDER_LABELS[message.provider];
    return (
        <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAi]}>
            {!isUser && (
                <View style={styles.botAvatar}>
                    <Bot size={16} color="white" />
                </View>
            )}
            <View
                style={[
                    styles.messageBubble,
                    isUser ? styles.messageBubbleUser : styles.messageBubbleAi,
                ]}
            >
                {providerLabel && <Text style={styles.providerTag}>via {providerLabel}</Text>}
                <Text
                    style={[
                        styles.messageText,
                        isUser ? styles.messageTextUser : styles.messageTextAi,
                        message.error && { color: colors.error },
                    ]}
                >
                    {message.content}
                </Text>
            </View>
        </View>
    );
};

const ThinkingIndicator = ({ colors, styles }) => (
    <View style={styles.messageRow}>
        <View style={styles.botAvatar}>
            <Bot size={16} color="white" />
        </View>
        <View style={[styles.messageBubble, styles.messageBubbleAi]}>
            <Loader size={16} color={colors.textSecondary} />
        </View>
    </View>
);

const EmptyState = ({ onSuggestionClick, colors, styles }) => {
    const suggestions = [
        "How much did I spend on the Goa trip?",
        "Who owes money in the Bhopal group?",
        "What is the capital of Japan?",
        "Plan a trip to Manali",
    ];

    return (
        <View style={styles.emptyStateContainer}>
            <View style={styles.emptyIconContainer}>
                <Sparkles size={40} color={colors.success} />
            </View>
            <Text style={styles.emptyTitle}>Welcome to SplitEase AI!</Text>
            <Text style={styles.emptySubtitle}>
                Your intelligent trip and expense assistant. Ask me anything!
            </Text>

            <View style={styles.suggestionsContainer}>
                {suggestions.map((s, i) => (
                    <TouchableOpacity
                        key={i}
                        onPress={() => onSuggestionClick(s)}
                        style={styles.suggestionButton}
                    >
                        <Text style={styles.suggestionText}>{s}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const getStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.card,
    },
    providerBar: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    providerPill: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: colors.inputBackground,
        borderWidth: 1,
        borderColor: colors.border,
    },
    providerPillActive: {
        backgroundColor: colors.success,
        borderColor: colors.success,
    },
    providerPillText: {
        fontSize: 13,
        fontWeight: "600",
        color: colors.textSecondary,
    },
    providerPillTextActive: {
        color: "white",
    },
    providerTag: {
        fontSize: 11,
        fontWeight: "600",
        color: colors.textSecondary,
        marginBottom: 4,
        opacity: 0.8,
    },
    backButton: {
        padding: 4,
    },
    headerTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
    },
    chatContainer: {
        flex: 1,
    },
    messagesContent: {
        padding: 16,
        paddingBottom: 20,
    },
    messageRow: {
        flexDirection: "row",
        marginBottom: 16,
        alignItems: "flex-end",
    },
    messageRowUser: {
        justifyContent: "flex-end",
    },
    messageRowAi: {
        justifyContent: "flex-start",
    },
    botAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.success,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
        marginBottom: 4,
    },
    messageBubble: {
        maxWidth: "80%",
        padding: 12,
        borderRadius: 16,
    },
    messageBubbleUser: {
        backgroundColor: colors.success,
        borderBottomRightRadius: 4,
    },
    messageBubbleAi: {
        backgroundColor: colors.card,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
    },
    messageTextUser: {
        color: "white",
    },
    messageTextAi: {
        color: colors.text,
    },
    inputWrapper: {
        padding: 16,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "flex-end",
        backgroundColor: colors.inputBackground,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    input: {
        flex: 1,
        maxHeight: 100,
        fontSize: 16,
        color: colors.text,
        paddingTop: 8,
        paddingBottom: 8,
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.success,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 8,
        marginBottom: 2,
    },
    sendButtonDisabled: {
        backgroundColor: colors.border,
    },
    emptyStateContainer: {
        alignItems: "center",
        marginTop: 40,
        paddingHorizontal: 20,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.inputBackground, // Light tint of generic
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: "center",
        marginBottom: 32,
    },
    suggestionsContainer: {
        width: "100%",
        gap: 12,
    },
    suggestionButton: {
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        width: "100%",
    },
    suggestionText: {
        fontSize: 14,
        color: colors.text,
    },
});
