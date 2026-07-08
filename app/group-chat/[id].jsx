import GroupChatWindow from "@/components/groupchat/GroupChatWindow";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function GroupChatDetailScreen() {
    const params = useLocalSearchParams();
    const { colors, theme } = useTheme();
    const [group, setGroup] = useState(null);

    useEffect(() => {
        const fetchGroupDetails = async () => {
            try {
                const res = await api.get(`/groups/${params.id}`);
                setGroup(res.data);
            } catch (err) {
                console.error("Error fetching group details:", err);
                setGroup({ _id: params.id, name: params.name, members: [] });
            }
        };
        if (params.id) fetchGroupDetails();
    }, [params.id]);

    if (!group) return <View style={[styles.container, { backgroundColor: colors.background }]} />;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.card }]} edges={["top", "bottom"]}>
            <StatusBar style={theme === "dark" ? "light" : "dark"} />
            <KeyboardAvoidingView
                style={[styles.keyboardView, { backgroundColor: colors.background }]}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={0}
            >
                <GroupChatWindow activeGroup={group} onBack={() => router.back()} />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardView: { flex: 1 },
});
