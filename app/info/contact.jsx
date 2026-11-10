import { IconCircle, PillButton, PillInput, ScreenHeader, SectionLabel, useDesign } from "@/components/ui/Design";
import { Alert } from "@/lib/alert";
import { Text } from "@/components/ui/Typography";
import { SCREEN_GUTTER } from "@/constants/layout";
import { useBottomSpacing } from "@/hooks/useSafeSpacing";
import { Mail, Send } from "lucide-react-native";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SUPPORT_EMAIL = "support@splitease.app";

export default function ContactScreen() {
    const { colors } = useDesign();
    const bottomSpacing = useBottomSpacing(32);
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
            <ScreenHeader flat back title="Contact us" />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView contentContainerStyle={{ paddingBottom: bottomSpacing }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <Text style={styles.description}>
                        Tell us what happened. The group name and the expense or invite involved help us sort it out faster.
                    </Text>

                    <SectionLabel line>Your message</SectionLabel>
                    <View style={styles.section}>
                        <Text style={styles.label}>Name</Text>
                        <PillInput
                            placeholder="Your name"
                            value={form.name}
                            onChangeText={(t) => setField("name", t)}
                        />
                        <Text style={styles.label}>Email</Text>
                        <PillInput
                            placeholder="you@example.com"
                            value={form.email}
                            onChangeText={(t) => setField("email", t)}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <Text style={styles.label}>Message</Text>
                        <PillInput
                            placeholder="What went wrong, and what you already tried"
                            value={form.message}
                            onChangeText={(t) => setField("message", t)}
                            multiline
                        />
                        <PillButton
                            label="Send message"
                            onPress={handleSend}
                            icon={<Send size={16} color={colors.onPrimary} />}
                            style={styles.sendBtn}
                        />
                        <Text style={styles.hint}>Opens your mail app with the message ready to send.</Text>
                    </View>

                    <SectionLabel line>Or email us</SectionLabel>
                    <View style={styles.section}>
                        <TouchableOpacity
                            style={styles.mailRow}
                            activeOpacity={0.7}
                            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {})}
                            accessibilityRole="button"
                            accessibilityLabel={`Email ${SUPPORT_EMAIL}`}
                        >
                            <IconCircle size={40} tint={colors.primaryLight}>
                                <Mail size={18} color={colors.text} strokeWidth={2} />
                            </IconCircle>
                            <Text style={styles.mailText} numberOfLines={1}>{SUPPORT_EMAIL}</Text>
                        </TouchableOpacity>
                        <Text style={styles.hint}>
                            Include your account email, the group name, and screenshots when useful.
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    description: { fontSize: 15, lineHeight: 23, color: colors.textSecondary, marginBottom: 14, marginHorizontal: SCREEN_GUTTER },
    // The form sits straight on the canvas under a lined heading (no cards)
    section: { paddingHorizontal: SCREEN_GUTTER, gap: 8, marginBottom: 20 },
    label: { fontSize: 13.5, fontWeight: "600", color: colors.text, marginTop: 6 },
    sendBtn: { marginTop: 10 },
    hint: { fontSize: 13.5, lineHeight: 20, color: colors.textSecondary },
    mailRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 2 },
    mailText: { flex: 1, fontSize: 16, fontWeight: "500", color: colors.text },
});
