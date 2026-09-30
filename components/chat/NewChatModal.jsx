import { Loader } from "@/components/Loader";
import { inkTokens } from "@/constants/layout";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import { WEB_URL } from "@/lib/config";
import { router } from "expo-router";
import { ArrowRight, AtSign, Send, UserRoundSearch, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import BottomSheet from "@/components/ui/BottomSheet";
import {
    Image,
    ScrollView,
    Share,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { Text, TextInput } from "@/components/ui/Typography";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RESULTS = 5;
const AVATAR_COLORS = ["#14B8A6", "#10B981", "#0891B2", "#2563EB", "#6366F1", "#8B5CF6"];
const colorFor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

/**
 * "New chat" — a simple bottom sheet. Type a name or an email:
 *  • matching people appear below — tap one to open the chat
 *  • a full email → "Start chat"; if nobody on SplitEase has that email,
 *    offer to invite them instead.
 */
export default function NewChatModal({ visible, onClose }) {
    const { colors, theme } = useTheme();
    const isDark = theme === "dark";
    const c = inkTokens(isDark, colors);
    const styles = getStyles(colors, c, isDark);
    const inputRef = useRef(null);

    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [checking, setChecking] = useState(false);
    const [notFound, setNotFound] = useState(null); // email with no account
    const debounceRef = useRef(null);

    const q = query.trim();
    const isEmail = EMAIL_RE.test(q);

    useEffect(() => {
        if (!visible) {
            setQuery("");
            setResults([]);
            setNotFound(null);
        }
    }, [visible]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setNotFound(null);
        if (!q) {
            setResults([]);
            setSearching(false);
            return;
        }
        setSearching(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await api.get("/users", { params: { q, limit: 12 } });
                setResults((res.data?.items || []).slice(0, MAX_RESULTS));
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(debounceRef.current);
    }, [q]);

    const startChat = (user) => {
        onClose();
        router.push({
            pathname: "/chat/[id]",
            params: { id: user._id, name: user.name, email: user.email, imageUrl: user.imageUrl || "undefined" },
        });
    };

    // "Start chat" with a typed email: find that exact account first.
    const startWithEmail = async () => {
        if (!isEmail || checking) return;
        const email = q.toLowerCase();
        const local = results.find((u) => u.email?.toLowerCase() === email);
        if (local) return startChat(local);
        try {
            setChecking(true);
            const res = await api.get("/users", { params: { q: email, limit: 5 } });
            const items = res.data?.items || [];
            // A stranger found by exact email comes back with a masked email
            // (flagged isContact: false), so match that too.
            const match = items.find((u) => u.email?.toLowerCase() === email) || items.find((u) => u.isContact === false);
            if (match) startChat(match);
            else setNotFound(email);
        } catch {
            setNotFound(email);
        } finally {
            setChecking(false);
        }
    };

    const invite = async () => {
        try {
            await Share.share({
                message: `Hey! I'm using SplitEase to split bills and chat about expenses. Join me: ${WEB_URL}`,
                title: "Join me on SplitEase",
            });
        } catch {
            // user dismissed the share sheet
        }
    };

    return (
        <BottomSheet
            visible={visible}
            onClose={onClose}
            onOpened={() => inputRef.current?.focus()}
            backgroundColor={isDark ? "#17181C" : colors.card}
            handleColor={colors.border}
            header={
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>New chat</Text>
                        <Text style={styles.subtitle}>Add someone by name or email</Text>
                    </View>
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close new chat">
                        <X size={18} color={colors.text} />
                    </TouchableOpacity>
                </View>
            }
        >
                    <View style={styles.inputPill}>
                        <AtSign size={18} color={colors.textSecondary} />
                        <TextInput
                            style={styles.input}
                            placeholder="Friend's name, or a full email"
                            placeholderTextColor={colors.textSecondary}
                            value={query}
                            onChangeText={setQuery}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                            returnKeyType={isEmail ? "go" : "search"}
                            onSubmitEditing={startWithEmail}
                            ref={inputRef}
                            accessibilityLabel="Name or email"
                        />
                        {searching ? (
                            <Loader size={16} />
                        ) : query.length > 0 ? (
                            <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Clear">
                                <X size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                        ) : null}
                    </View>

                    <ScrollView style={styles.results} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                        {results.map((u) => (
                            <TouchableOpacity
                                key={u._id}
                                style={styles.row}
                                onPress={() => startChat(u)}
                                activeOpacity={0.7}
                                accessibilityLabel={`Chat with ${u.name}`}
                            >
                                {u.imageUrl ? (
                                    <Image source={{ uri: u.imageUrl }} style={styles.avatar} />
                                ) : (
                                    <View style={[styles.avatar, { backgroundColor: colorFor(u.name) }]}>
                                        <Text style={styles.avatarText}>{u.name?.charAt(0)?.toUpperCase() || "?"}</Text>
                                    </View>
                                )}
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.name} numberOfLines={1}>{u.name}</Text>
                                    <Text style={styles.email} numberOfLines={1}>{u.email}</Text>
                                </View>
                                <View style={styles.rowArrow}>
                                    <ArrowRight size={16} color={c.onInk} strokeWidth={2.4} />
                                </View>
                            </TouchableOpacity>
                        ))}

                        {notFound ? (
                            <View style={styles.notice}>
                                <UserRoundSearch size={22} color={colors.text} />
                                <Text style={styles.noticeTitle}>{`${notFound} isn't on SplitEase yet`}</Text>
                                <Text style={styles.noticeText}>Send them an invite — you can chat once they join.</Text>
                            </View>
                        ) : q && !searching && !results.length && !isEmail ? (
                            <Text style={styles.hint}>No one found. Try their full email address.</Text>
                        ) : !q ? (
                            <Text style={styles.hint}>Names search people you share a group or chat with. For anyone else, type their full email.</Text>
                        ) : null}
                    </ScrollView>

                    {notFound ? (
                        <TouchableOpacity style={styles.primaryBtn} onPress={invite} activeOpacity={0.85} accessibilityLabel="Invite to SplitEase">
                            <Send size={17} color={c.onInk} />
                            <Text style={styles.primaryText}>Invite to SplitEase</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.primaryBtn, !isEmail && styles.primaryBtnDisabled]}
                            onPress={startWithEmail}
                            disabled={!isEmail || checking}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            accessibilityLabel="Start chat"
                            accessibilityState={{ disabled: !isEmail || checking }}
                        >
                            {checking ? <Loader size={18} color={c.onInk} /> : <Text style={[styles.primaryText, !isEmail && styles.primaryTextDisabled]}>Start chat</Text>}
                        </TouchableOpacity>
                    )}
        </BottomSheet>
    );
}

const getStyles = (colors, c, isDark) => StyleSheet.create({
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
    title: { fontSize: 21, fontWeight: "600", color: colors.text, letterSpacing: -0.3 },
    subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    closeBtn: {
        width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center",
        backgroundColor: isDark ? "rgba(255,255,255,0.08)" : colors.background,
    },

    inputPill: {
        flexDirection: "row", alignItems: "center", gap: 10,
        height: 54, borderRadius: 27, paddingHorizontal: 18,
        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : colors.background,
        borderWidth: StyleSheet.hairlineWidth, borderColor: c.outline,
    },
    input: { flex: 1, fontSize: 15.5, color: colors.text, paddingVertical: 0 },

    results: { marginTop: 10, flexGrow: 0, flexShrink: 1 },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
    avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    avatarText: { color: "#fff", fontSize: 17, fontWeight: "700" },
    name: { fontSize: 15.5, fontWeight: "500", color: colors.text },
    email: { fontSize: 12.5, color: colors.textSecondary, marginTop: 1 },
    rowArrow: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: c.ink },

    hint: { fontSize: 13, color: colors.textSecondary, textAlign: "center", paddingVertical: 18, paddingHorizontal: 12 },
    notice: { alignItems: "center", gap: 6, paddingVertical: 18, paddingHorizontal: 12 },
    noticeTitle: { fontSize: 15, fontWeight: "600", color: colors.text, textAlign: "center" },
    noticeText: { fontSize: 13, color: colors.textSecondary, textAlign: "center" },

    primaryBtn: {
        marginTop: 12, height: 54, borderRadius: 27, backgroundColor: c.ink,
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    },
    primaryBtnDisabled: { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : colors.background },
    primaryText: { fontSize: 16, fontWeight: "600", color: c.onInk },
    primaryTextDisabled: { color: colors.textSecondary },
});
