import ChatList from "@/components/chat/ChatList";
import NewChatModal from "@/components/chat/NewChatModal";
import GroupChatList from "@/components/groupchat/GroupChatList";
import { useTheme } from "@/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { MessageSquarePlus } from "lucide-react-native";
import { useState } from "react";
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const NEW_GRADIENT = ["#6366F1", "#8B5CF6"];

export default function ChatPage() {
    const { colors, theme } = useTheme();
    const [activeTab, setActiveTab] = useState("chats");
    const [showNewChat, setShowNewChat] = useState(false);

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

    const styles = getStyles(colors);

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} backgroundColor={colors.background} />

            {/* Top bar */}
            <View style={styles.topBar}>
                <View>
                    <Text style={styles.topBarTitle}>Messages</Text>
                    <Text style={styles.topBarSub}>Chat with friends & your groups</Text>
                </View>
                {activeTab === "chats" && (
                    <TouchableOpacity onPress={() => setShowNewChat(true)} activeOpacity={0.85}>
                        <LinearGradient colors={NEW_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.newChatBtn}>
                            <MessageSquarePlus size={17} color="#fff" />
                            <Text style={styles.newChatText}>New</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>

            {/* Segmented switcher */}
            <View style={styles.segment}>
                {[
                    { key: "chats", label: "Chats" },
                    { key: "groups", label: "Groups" },
                ].map((t) => {
                    const active = activeTab === t.key;
                    return (
                        <TouchableOpacity
                            key={t.key}
                            style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                            onPress={() => setActiveTab(t.key)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{t.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.content}>
                <View style={[styles.tabPane, activeTab !== "chats" && styles.hidden]}>
                    <ChatList onSelect={handleSelectChat} />
                </View>
                <View style={[styles.tabPane, activeTab !== "groups" && styles.hidden]}>
                    <GroupChatList onSelect={handleSelectGroup} />
                </View>
            </View>

            <NewChatModal visible={showNewChat} onClose={() => setShowNewChat(false)} />
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topBar: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12,
    },
    topBarTitle: { fontSize: 26, fontWeight: "800", color: colors.text, letterSpacing: -0.6 },
    topBarSub: { fontSize: 12.5, color: colors.textSecondary, marginTop: 2 },
    newChatBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
        shadowColor: "#6366F1", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    newChatText: { color: "#fff", fontSize: 13.5, fontWeight: "700" },

    segment: {
        flexDirection: "row", gap: 4, marginHorizontal: 20, marginBottom: 6, padding: 4,
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    },
    segmentBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 9, borderRadius: 9 },
    segmentBtnActive: { backgroundColor: colors.primary },
    segmentText: { fontSize: 14, fontWeight: "700", color: colors.textSecondary },
    segmentTextActive: { color: "#fff" },

    content: { flex: 1, backgroundColor: colors.background },
    tabPane: { flex: 1 },
    hidden: { display: "none" },
});
