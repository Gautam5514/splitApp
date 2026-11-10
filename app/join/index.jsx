import { PillButton, PillInput, ScreenHeader, useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { normalizeInviteCode } from "@/lib/inviteCode";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { ArrowRight, ClipboardPaste, KeyRound, ScanLine } from "lucide-react-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Join a group by typing the 6-character code, or pasting the invite link or the
// whole shared message - the code is pulled out of whatever is pasted.
export default function JoinWithCodeScreen() {
    const { colors } = useDesign();
    const styles = getStyles(colors);
    const [value, setValue] = useState("");
    const [error, setError] = useState("");

    const go = (input = value) => {
        const code = normalizeInviteCode(input);
        if (!code) {
            setError("That doesn't look like an invite code. Codes are 6 letters and numbers, like K7M2QX.");
            return;
        }
        router.push(`/join/${encodeURIComponent(code)}`);
    };

    const paste = async () => {
        try {
            const text = (await Clipboard.getStringAsync()) || "";
            const code = normalizeInviteCode(text);
            if (!code) {
                setError(text ? "The copied text doesn't contain an invite code." : "Nothing copied yet. Copy the code or link first.");
                return;
            }
            setValue(code);
            setError("");
            go(code);
        } catch {
            setError("Couldn't read the clipboard. Type the code instead.");
        }
    };

    // Keep a typed code tidy (upper case, no spaces); leave a pasted link as is.
    const onChange = (v) => {
        const compact = v.replace(/[\s-]/g, "").toUpperCase();
        setValue(/^[A-Z0-9]{0,6}$/.test(compact) ? compact : v);
        setError("");
    };

    const looksLikeCode = value.length <= 8;

    return (
        <SafeAreaView style={styles.container}>
            <ScreenHeader back title="Join with code" subtitle="From the group creator" />
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
                    <View style={styles.iconBox}>
                        <KeyRound size={26} color={colors.text} />
                    </View>
                    <Text style={styles.title}>Enter the invite code</Text>
                    <Text style={styles.subtitle}>
                        Ask the group creator for the 6-character code, paste the invite link, or scan their QR code.
                    </Text>

                    <PillInput
                        value={value}
                        onChangeText={onChange}
                        placeholder="K7M2QX"
                        autoCapitalize="characters"
                        autoCorrect={false}
                        autoFocus
                        returnKeyType="go"
                        onSubmitEditing={() => go()}
                        maxLength={300}
                        style={[styles.input, !!error && { borderColor: colors.error }]}
                        inputStyle={looksLikeCode ? styles.codeText : styles.linkText}
                        accessibilityLabel="Invite code or link"
                    />
                    {!!error && <Text style={styles.error}>{error}</Text>}

                    <PillButton
                        label="Continue"
                        onPress={() => go()}
                        disabled={!value.trim()}
                        icon={<ArrowRight size={17} color={colors.onPrimary} />}
                        style={styles.btn}
                    />
                    <View style={styles.row}>
                        <PillButton
                            label="Paste"
                            variant="secondary"
                            onPress={paste}
                            icon={<ClipboardPaste size={16} color={colors.text} />}
                            style={styles.flexBtn}
                        />
                        <PillButton
                            label="Scan QR"
                            variant="secondary"
                            onPress={() => router.push("/join/scan")}
                            icon={<ScanLine size={16} color={colors.text} />}
                            style={styles.flexBtn}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    body: { padding: 22, paddingTop: 12, gap: 12 },
    iconBox: {
        width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center",
        backgroundColor: colors.primaryLight, marginBottom: 4,
    },
    title: { fontSize: 22, fontWeight: "800", color: colors.text },
    subtitle: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, marginBottom: 8 },
    input: { marginTop: 4 },
    codeText: { fontSize: 24, fontWeight: "800", letterSpacing: 6, textAlign: "center" },
    linkText: { fontSize: 14 },
    error: { fontSize: 13, color: colors.error },
    btn: { marginTop: 4 },
    row: { flexDirection: "row", gap: 10, marginTop: 4 },
    flexBtn: { flex: 1 },
});
