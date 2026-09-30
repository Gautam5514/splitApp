import GoogleIcon from "@/components/GoogleIcon";
import { PillButton, useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { TYPE } from "@/constants/design";
import { router } from "expo-router";
import { Image, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function AuthScreen({ children }) {
  const { colors, isDark } = useDesign();
  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.brand}>
            <Image source={require("../assets/images/favicon.png")} style={styles.brandIcon} />
            <Text style={[styles.brandName, { color: colors.text }]}>SplitEase</Text>
          </View>
          <View style={styles.content}>{children}</View>
          <View style={styles.legal}>
            <Text style={[styles.legalLink, { color: colors.textSecondary }]} onPress={() => router.push("/info/terms")}>Terms of Service</Text>
            <Text style={[styles.legalSeparator, { color: colors.textSecondary }]}> | </Text>
            <Text style={[styles.legalLink, { color: colors.textSecondary }]} onPress={() => router.push("/info/privacy")}>Privacy Policy</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

export function GoogleButton({ onPress, disabled, loading }) {
  return (
    <PillButton
      variant="secondary"
      label="Continue with Google"
      icon={<GoogleIcon size={20} />}
      onPress={onPress}
      disabled={disabled}
      loading={loading}
    />
  );
}

export function AuthDivider() {
  const { colors, t } = useDesign();
  return (
    <View style={styles.divider}>
      <View style={[styles.dividerLine, { backgroundColor: t.outline }]} />
      <Text style={[styles.dividerText, { color: colors.textSecondary }]}>OR</Text>
      <View style={[styles.dividerLine, { backgroundColor: t.outline }]} />
    </View>
  );
}

export function GradientButton({ children, onPress, disabled, loading }) {
  return <PillButton variant="primary" label={children} onPress={onPress} disabled={disabled} loading={loading} />;
}

export const AUTH_PLACEHOLDER = undefined;

/** Theme-aware auth text/layout styles (headings, links, OTP cells). */export function useAuthStyles() {
  const { colors, t } = useDesign();
  return StyleSheet.create({
    heading: { ...TYPE.pageTitle, color: colors.text, textAlign: "center" },
    subtitle: { ...TYPE.secondary, color: colors.textSecondary, lineHeight: 19, textAlign: "center", marginTop: 10 },
    section: { width: "100%" },
    fieldGap: { marginTop: 14 },
    smallLink: { color: t.ink, fontSize: 13, fontWeight: "600" },
    switchRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 20 },
    switchPrompt: { color: colors.textSecondary, fontSize: 13 },
    switchLink: { color: t.ink, fontSize: 13, fontWeight: "800" },
    hint: { color: colors.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 9, paddingHorizontal: 9 },
    backLink: { color: t.ink, fontSize: 13, textAlign: "center", marginTop: 20 },
    otpRow: { flexDirection: "row", gap: 8, marginTop: 28, marginBottom: 24 },
    otpCell: {
      flex: 1, height: 54, borderRadius: 16, borderWidth: 1.5,
      backgroundColor: t.surface, alignItems: "center", justifyContent: "center",
    },
    otpCellIdle: { borderColor: t.outline },
    otpCellActive: { borderColor: t.ink },
    otpDigit: { color: colors.text, fontSize: 22, fontWeight: "700" },
    hiddenInput: { position: "absolute", width: 1, height: 1, opacity: 0 },
  });
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
  brand: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  brandIcon: { width: 31, height: 31, borderRadius: 8 },
  brandName: { fontSize: 27, fontWeight: "700", letterSpacing: -0.8 },
  content: { flexGrow: 1, justifyContent: "center", paddingVertical: 32 },
  legal: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingBottom: 2 },
  legalLink: { fontSize: 11, textDecorationLine: "underline" },
  legalSeparator: { fontSize: 11 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 19 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 11, fontWeight: "600", letterSpacing: 0.7 },
});
