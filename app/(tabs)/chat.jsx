import ChatList from "@/components/chat/ChatList";
import NewChatModal from "@/components/chat/NewChatModal";
import GroupChatList from "@/components/groupchat/GroupChatList";
import { SCREEN_GUTTER, inkTokens } from "@/constants/layout";
import { useTheme } from "@/context/ThemeContext";
import { router } from "expo-router";
import { Search, SquarePen, X } from "lucide-react-native";
import { useState } from "react";
import { StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text, TextInput } from "@/components/ui/Typography";
import { SafeAreaView } from "react-native-safe-area-context";

const TABS = [
    { key: "chats", label: "Chats" },
    { key: "groups", label: "Groups" },
];


export default function ChatPage() {
    const { colors, theme } = useTheme();
    const isDark = theme === "dark";
    const c = inkTokens(isDark, colors);
    const styles = getStyles(colors, c);

    const [activeTab, setActiveTab] = useState("chats");
    const [showNewChat, setShowNewChat] = useState(false);
    const [query, setQuery] = useState("");

    const handleSelectChat = (friend) => {
        router.push({
            pathname: "/chat/[id]",
            params: {
                id: friend._id, name: friend.name, email: friend.email,
                imageUrl: friend.imageUrl, isOnline: friend.isOnline, lastActive: friend.lastActive,
            },
        });
    };

    const handleSelectGroup = (group) => {
        router.push({ pathname: "/group-chat/[id]", params: { id: group._id, name: group.name } });
    };

    const switchTab = (key) => setActiveTab(key);

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* ── Header: title + round actions ───────────────────────────── */}
            <View style={styles.header}>
                <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>Messages</Text>

                {/* One pill holding both options — tap to switch */}
                <View style={styles.segment} accessibilityRole="tablist">
                    {TABS.map((t) => {
                        const active = activeTab === t.key;
                        return (
                            <TouchableOpacity
                                key={t.key}
                                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                                onPress={() => switchTab(t.key)}
                                activeOpacity={0.8}
                                accessibilityRole="tab"
                                accessibilityState={{ selected: active }}
                            >
                                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{t.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* ── Search pill + round "new chat" (pen) button ──────────────── */}
            <View style={styles.searchRow}>
                <View style={styles.searchPill}>
                    <Search size={19} color={colors.textSecondary} strokeWidth={2} />
                    <TextInput
                        placeholder="Search"
                        placeholderTextColor={colors.textSecondary}
                        value={query}
                        onChangeText={setQuery}
                        style={styles.searchInput}
                        selectionColor={colors.primary}
                        returnKeyType="search"
                        accessibilityLabel={activeTab === "chats" ? "Search chats" : "Search groups"}
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <X size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity
                    style={[styles.roundBtn, styles.sideBtn]}
                    onPress={() => setShowNewChat(true)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel="Start a new chat"
                >
                    <SquarePen size={19} color={colors.text} strokeWidth={2} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={[styles.tabPane, activeTab !== "chats" && styles.hidden]}>
                    <ChatList onSelect={handleSelectChat} query={query} />
                </View>
                <View style={[styles.tabPane, activeTab !== "groups" && styles.hidden]}>
                    <GroupChatList onSelect={handleSelectGroup} query={query} />
                </View>
            </View>

            <NewChatModal visible={showNewChat} onClose={() => setShowNewChat(false)} />
        </SafeAreaView>
    );
}

const getStyles = (colors, c) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: 16,
    },
    title: { flexShrink: 1, marginRight: 12, fontSize: 30, fontWeight: "700", color: colors.text, letterSpacing: -0.3 },

    roundBtn: {
        width: 48, height: 48, borderRadius: 24,
        alignItems: "center", justifyContent: "center",
        backgroundColor: c.surface,
        borderWidth: StyleSheet.hairlineWidth, borderColor: c.outline,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: c.shadow, shadowRadius: 10, elevation: c.shadow ? 1 : 0,
    },

    searchRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: SCREEN_GUTTER, marginBottom: 12 },
    searchPill: {
        flex: 1, flexDirection: "row", alignItems: "center", gap: 10,
        height: 52, borderRadius: 26, paddingHorizontal: 18,
        backgroundColor: c.surface,
        borderWidth: StyleSheet.hairlineWidth, borderColor: c.outline,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: c.shadow, shadowRadius: 10, elevation: c.shadow ? 1 : 0,
    },
    searchInput: { flex: 1, fontSize: 15.5, color: colors.text, paddingVertical: 0 },
    sideBtn: { width: 52, height: 52, borderRadius: 26 },

    // Chats | Groups switch next to the title
    segment: {
        flexDirection: "row", padding: 4, gap: 2, borderRadius: 24,
        backgroundColor: c.surface,
        borderWidth: StyleSheet.hairlineWidth, borderColor: c.outline,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: c.shadow, shadowRadius: 10, elevation: c.shadow ? 1 : 0,
    },
    segmentBtn: { height: 38, minWidth: 76, paddingHorizontal: 16, borderRadius: 19, alignItems: "center", justifyContent: "center" },
    segmentBtnActive: { backgroundColor: c.ink },
    segmentText: { fontSize: 14, fontWeight: "500", color: colors.textSecondary },
    segmentTextActive: { color: c.onInk, fontWeight: "600" },

    content: { flex: 1, backgroundColor: colors.background },
    tabPane: { flex: 1 },
    hidden: { display: "none" },
});
