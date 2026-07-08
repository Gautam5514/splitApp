import { useTheme } from "@/context/ThemeContext";
import { Loader } from "@/components/Loader";
import { api } from "@/lib/api";
import { Check, Plus, Search, UserPlus, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function MemberPicker({ groupId, onSubmit, exclude = [] }) {
    const { colors } = useTheme();
    const [query, setQuery] = useState("");
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState([]);
    const [debounceTimer, setDebounceTimer] = useState(null);

    const styles = getStyles(colors);

    const fetchOptions = async (searchQuery) => {
        if (!groupId) return;
        try {
            setLoading(true);
            const res = await api.get(`/groups/${groupId}/available-users`, {
                params: { q: searchQuery, limit: 10 },
            });
            const data = (res.data || []).filter((u) => !exclude.includes(u.email));
            setOptions(data);
        } catch {
            console.error("Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (debounceTimer) clearTimeout(debounceTimer);
        const timer = setTimeout(() => fetchOptions(query), 400);
        setDebounceTimer(timer);
        return () => clearTimeout(timer);
    }, [query, groupId]);

    const toggle = (email) => {
        setSelected((prev) =>
            prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
        );
    };

    const submit = () => {
        if (!selected.length) return;
        onSubmit?.(selected);
        setSelected([]);
        setQuery("");
    };

    const selectedSet = useMemo(() => new Set(selected), [selected]);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.headerIcon}>
                        <UserPlus size={15} color={colors.primary} />
                    </View>
                    <Text style={styles.headerTitle}>Add Members</Text>
                </View>
                {selected.length > 0 && (
                    <TouchableOpacity onPress={submit} style={styles.addButton}>
                        <Check size={14} color="white" />
                        <Text style={styles.addButtonText}>
                            Add {selected.length} {selected.length === 1 ? "Member" : "Members"}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Search Input */}
            <View style={styles.searchRow}>
                <Search size={16} color={colors.textSecondary} />
                <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search by name or email…"
                    placeholderTextColor={colors.placeholder}
                    style={styles.searchInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {query.length > 0 && (
                    <TouchableOpacity onPress={() => { setQuery(""); setOptions([]); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <X size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Results — rendered inline, no nested scroll */}
            {query.trim().length > 0 && (
                <View style={styles.resultsWrap}>
                    {loading ? (
                        <View style={styles.loadingRow}>
                            <Loader size={18} />
                            <Text style={styles.loadingText}>Searching…</Text>
                        </View>
                    ) : options.length > 0 ? (
                        options.map((u) => {
                            const isSelected = selectedSet.has(u.email);
                            return (
                                <TouchableOpacity
                                    key={u._id}
                                    style={[styles.userCard, isSelected && styles.userCardSelected]}
                                    onPress={() => toggle(u.email)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.userLeft}>
                                        {u.photoURL ? (
                                            <Image source={{ uri: u.photoURL }} style={styles.avatar} />
                                        ) : (
                                            <View style={[styles.avatarPlaceholder, isSelected && styles.avatarPlaceholderSelected]}>
                                                <Text style={[styles.avatarText, isSelected && styles.avatarTextSelected]}>
                                                    {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                                                </Text>
                                            </View>
                                        )}
                                        <View style={styles.userInfo}>
                                            <Text style={styles.userName} numberOfLines={1}>
                                                {u.name || "Unnamed User"}
                                            </Text>
                                            <Text style={styles.userEmail} numberOfLines={1}>
                                                {u.email}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={[styles.checkBox, isSelected && styles.checkBoxSelected]}>
                                        {isSelected ? (
                                            <Check size={14} color="white" />
                                        ) : (
                                            <Plus size={14} color={colors.textSecondary} />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    ) : (
                        <View style={styles.emptyRow}>
                            <Text style={styles.emptyText}>{`No users found for "${query}"`}</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Selected chips */}
            {selected.length > 0 && (
                <View style={styles.chipsSection}>
                    <Text style={styles.chipsLabel}>Selected</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                        {selected.map((email) => (
                            <TouchableOpacity
                                key={email}
                                style={styles.chip}
                                onPress={() => toggle(email)}
                                activeOpacity={0.75}
                            >
                                <Text style={styles.chipText} numberOfLines={1}>{email}</Text>
                                <X size={11} color={colors.primary} />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        padding: 16,
        gap: 14,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    headerIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.primaryLight,
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: colors.text,
    },
    addButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: colors.primary,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    addButtonText: {
        color: "white",
        fontSize: 13,
        fontWeight: "600",
    },
    searchRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: colors.inputBackground || colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
        padding: 0,
        margin: 0,
    },
    resultsWrap: {
        borderRadius: 10,
        overflow: "hidden",
        gap: 8,
    },
    loadingRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 20,
        gap: 10,
    },
    loadingText: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    userCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        padding: 12,
    },
    userCardSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight,
    },
    userLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flex: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.border,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarPlaceholderSelected: {
        backgroundColor: colors.primary,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.textSecondary,
    },
    avatarTextSelected: {
        color: "white",
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 2,
    },
    userEmail: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    checkBox: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.card,
        justifyContent: "center",
        alignItems: "center",
    },
    checkBoxSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    emptyRow: {
        paddingVertical: 20,
        alignItems: "center",
    },
    emptyText: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    chipsSection: {
        gap: 8,
        paddingTop: 4,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    chipsLabel: {
        fontSize: 11,
        fontWeight: "600",
        color: colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    chipsScroll: {
        flexGrow: 0,
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: colors.primaryLight,
        borderWidth: 1,
        borderColor: colors.primary,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 8,
    },
    chipText: {
        fontSize: 12,
        fontWeight: "500",
        color: colors.primary,
        maxWidth: 140,
    },
});
