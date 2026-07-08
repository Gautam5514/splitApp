import { useTheme } from "@/context/ThemeContext";
import { router } from "expo-router";
import { ArrowLeft, Mail, MapPin, MessageSquare, Send } from "lucide-react-native";
import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SUPPORT_EMAIL = "support@splitease.app";

export default function ContactScreen() {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const [form, setForm] = useState({ name: "", email: "", message: "" });

    const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

    const handleSend = async () => {
        if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
            Alert.alert("Missing details", "Please fill in your name, email, and message.");
            return;
        }
        const subject = encodeURIComponent(`SplitEase support request from ${form.name || "user"}`);
        const body = encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`);
        const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
        try {
            const ok = await Linking.canOpenURL(url);
            if (ok) {
                await Linking.openURL(url);
            } else {
                Alert.alert("No mail app", `Email us directly at ${SUPPORT_EMAIL}.`);
            }
        } catch {
            Alert.alert("Couldn't open mail", `Email us directly at ${SUPPORT_EMAIL}.`);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <ArrowLeft size={20} color={colors.text} />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <View style={styles.iconBox}>
                        <MessageSquare size={24} color={colors.primary} />
                    </View>
                    <Text style={styles.eyebrow}>Contact</Text>
                    <Text style={styles.title}>Contact Us</Text>
                    <Text style={styles.description}>
                        Tell us what happened and include enough detail for support to understand the group, expense, or account issue.
                    </Text>

                    <View style={styles.card}>
                        <Text style={styles.label}>Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Your name"
                            placeholderTextColor={colors.placeholder || colors.textSecondary}
                            value={form.name}
                            onChangeText={(t) => setField("name", t)}
                        />
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="you@example.com"
                            placeholderTextColor={colors.placeholder || colors.textSecondary}
                            value={form.email}
                            onChangeText={(t) => setField("email", t)}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <Text style={styles.label}>Message</Text>
                        <TextInput
                            style={[styles.input, styles.textarea]}
                            placeholder="Describe the issue, group name, and anything you already tried."
                            placeholderTextColor={colors.placeholder || colors.textSecondary}
                            value={form.message}
                            onChangeText={(t) => setField("message", t)}
                            multiline
                        />
                        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} activeOpacity={0.85}>
                            <Send size={16} color="#FFFFFF" />
                            <Text style={styles.sendBtnText}>Send message</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.infoCard}>
                        <Mail size={20} color={colors.primary} />
                        <Text style={styles.infoTitle}>Email support</Text>
                        <Text style={styles.paragraph}>{SUPPORT_EMAIL}</Text>
                    </View>

                    <View style={styles.infoCard}>
                        <MapPin size={20} color={colors.primary} />
                        <Text style={styles.infoTitle}>What to include</Text>
                        <Text style={styles.paragraph}>
                            Account email, group name, invite link or expense title, and screenshots when useful.
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 12, paddingVertical: 8 },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    scroll: { paddingHorizontal: 20, paddingBottom: 48 },
    iconBox: {
        width: 48, height: 48, borderRadius: 12, backgroundColor: colors.primaryLight,
        alignItems: "center", justifyContent: "center", marginBottom: 14,
    },
    eyebrow: { fontSize: 12, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase", color: colors.primary, marginBottom: 8 },
    title: { fontSize: 30, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
    description: { fontSize: 15, lineHeight: 23, color: colors.textSecondary, marginTop: 10 },
    card: {
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        borderRadius: 14, padding: 18, marginTop: 16, gap: 8,
    },
    label: { fontSize: 13, fontWeight: "700", color: colors.text, marginTop: 6 },
    input: {
        borderWidth: 1, borderColor: colors.border, backgroundColor: colors.inputBackground,
        borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.text,
    },
    textarea: { minHeight: 120, textAlignVertical: "top" },
    sendBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        backgroundColor: colors.primary, paddingVertical: 13, borderRadius: 12, marginTop: 10,
    },
    sendBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
    infoCard: {
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        borderRadius: 14, padding: 18, marginTop: 12, gap: 6,
    },
    infoTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 4 },
    paragraph: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
});
