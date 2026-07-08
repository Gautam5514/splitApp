import { useTheme } from "@/context/ThemeContext";
import { Loader } from "@/components/Loader";
import { api } from "@/lib/api";
import { router } from "expo-router";
import { MessageSquarePlus, Search, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
    FlatList,
    Image,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NewChatModal({ visible, onClose }) {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef(null);

    useEffect(() => {
        if (!visible) {
            setQuery("");
            setResults([]);
            return;
        }
    }, [visible]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const q = query.trim();
        if (!q) {
            setResults([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await api.get("/users", { params: { q, limit: 12 } });
                setResults(res.data?.items || []);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(debounceRef.current);
    }, [query]);

    const startChat = (user) => {
        onClose();
        router.push({
            pathname: "/chat/[id]",
            params: {
                id: user._id,
                name: user.name,
                email: user.email,
                imageUrl: user.imageUrl || "undefined",
            },
        });
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
            <SafeAreaView style={styles.container} edges={["top"]}>
                <View style={styles.header}>
                    <View style={styles.headerTitleRow}>
                        <MessageSquarePlus size={20} color={colors.primary} />
                        <Text style={styles.title}>New conversation</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                        <X size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.searchBox}>
                    <Search size={16} color={colors.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search name or email…"
                        placeholderTextColor={colors.placeholder || colors.textSecondary}
                        value={query}
                        onChangeText={setQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoFocus
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery("")} style={{ padding: 4 }}>
                            <X size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <Loader size={28} />
                        <Text style={styles.muted}>Searching…</Text>
                    </View>
                ) : results.length > 0 ? (
                    <FlatList
                        data={results}
                        keyExtractor={(item) => item._id}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingHorizontal: 16 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.row} onPress={() => startChat(item)} activeOpacity={0.7}>
                                {item.imageUrl ? (
                                    <Image source={{ uri: item.imageUrl }} style={styles.avatar} />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarText}>
                                            {item.name?.charAt(0).toUpperCase() || "U"}
                                        </Text>
                                    </View>
                                )}
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                                    <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
                                </View>
                                <View style={styles.chatBtn}>
                                    <Text style={styles.chatBtnText}>Chat</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                ) : query.trim() ? (
                    <View style={styles.center}>
                        <Text style={styles.muted}>No users found matching "{query.trim()}"</Text>
                    </View>
                ) : (
                    <View style={styles.center}>
                        <MessageSquarePlus size={36} color={colors.textSecondary} />
                        <Text style={styles.emptyTitle}>Find friends to chat</Text>
                        <Text style={styles.muted}>Type a name or email to get started.</Text>
                    </View>
                )}
            </SafeAreaView>
        </Modal>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    title: { fontSize: 17, fontWeight: "700", color: colors.text },
    closeBtn: { padding: 4 },
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        margin: 16,
        paddingHorizontal: 14,
        height: 48,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
    },
    searchInput: { flex: 1, fontSize: 15, color: colors.text },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 },
    muted: { fontSize: 13, color: colors.textSecondary, textAlign: "center" },
    emptyTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    avatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: { fontSize: 17, fontWeight: "700", color: colors.primary },
    name: { fontSize: 15, fontWeight: "600", color: colors.text },
    email: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
    chatBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
    },
    chatBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});
