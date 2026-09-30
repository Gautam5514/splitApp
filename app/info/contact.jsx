import { Block, IconCircle, PillButton, PillInput, ScreenHeader, useDesign } from "@/components/ui/Design";
import { Alert } from "@/lib/alert";
import { Text } from "@/components/ui/Typography";
import { SCREEN_GUTTER } from "@/constants/layout";
import { useBottomSpacing } from "@/hooks/useSafeSpacing";
import { Mail, MapPin, MessageSquare, Send } from "lucide-react-native";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
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
            <ScreenHeader title="Contact Us" back />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomSpacing }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <View style={styles.iconWrap}>
                        <IconCircle size={48}>
                            <MessageSquare size={24} color={colors.primary} />
                        </IconCircle>
                    </View>
                    <Text style={styles.eyebrow}>Contact</Text>
                    <Text style={styles.description}>
                        Tell us what happened and include enough detail for support to understand the group, expense, or account issue.
                    </Text>

                    <Block style={styles.formBlock}>
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
                            placeholder="Describe the issue, group name, and anything you already tried."
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
                    </Block>

                    <Block style={styles.infoBlock}>
                        <Mail size={20} color={colors.primary} />
                        <Text style={styles.infoTitle}>Email support</Text>
                        <Text style={styles.paragraph}>{SUPPORT_EMAIL}</Text>
                    </Block>

                    <Block style={styles.infoBlock}>
                        <MapPin size={20} color={colors.primary} />
                        <Text style={styles.infoTitle}>What to include</Text>
                        <Text style={styles.paragraph}>
                            Account email, group name, invite link or expense title, and screenshots when useful.
                        </Text>
                    </Block>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingTop: 4, paddingBottom: 48 },
    iconWrap: { marginHorizontal: SCREEN_GUTTER, marginBottom: 14 },
    eyebrow: { fontSize: 12, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase", color: colors.primary, marginBottom: 8, marginHorizontal: SCREEN_GUTTER },
    description: { fontSize: 15, lineHeight: 23, color: colors.textSecondary, marginTop: 4, marginHorizontal: SCREEN_GUTTER },
    formBlock: { gap: 8 },
    label: { fontSize: 13, fontWeight: "700", color: colors.text, marginTop: 6 },
    sendBtn: { marginTop: 10 },
    infoBlock: { gap: 6 },
    infoTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 4 },
    paragraph: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
});
