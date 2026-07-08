import ChatWindow from "@/components/chat/ChatWindow";
import { useTheme } from "@/context/ThemeContext";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChatDetailScreen() {
    const params = useLocalSearchParams();
    const { colors, theme } = useTheme();

    const activeFriend = {
        _id: params.id,
        name: params.name,
        email: params.email,
        imageUrl: params.imageUrl === "undefined" ? null : params.imageUrl,
        isOnline: params.isOnline === "true",
        lastActive: params.lastActive,
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.card }]} edges={["top", "bottom"]}>
            <StatusBar style={theme === "dark" ? "light" : "dark"} />
            <KeyboardAvoidingView
                style={[styles.keyboardView, { backgroundColor: colors.background }]}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={0}
            >
                <ChatWindow activeFriend={activeFriend} onBack={() => router.back()} />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardView: { flex: 1 },
});
