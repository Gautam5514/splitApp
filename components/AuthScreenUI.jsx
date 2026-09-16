import GoogleIcon from "@/components/GoogleIcon";
import { Loader } from "@/components/Loader";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Image, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function AuthScreen({ children }) {
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={["#82C5F1", "#3478DE", "#113878", "#080E1E", "#050508"]}
        locations={[0, 0.17, 0.37, 0.59, 1]}
        style={styles.root}
      >
        <SafeAreaView style={styles.root}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.brand}>
              <Image source={require("../assets/images/favicon.png")} style={styles.brandIcon} />
              <Text style={styles.brandName}>SplitEase</Text>
            </View>
            <View style={styles.content}>{children}</View>
            <View style={styles.legal}>
              <Text style={styles.legalLink} onPress={() => router.push("/info/terms")}>Terms of Service</Text>
              <Text style={styles.legalSeparator}> | </Text>
              <Text style={styles.legalLink} onPress={() => router.push("/info/privacy")}>Privacy Policy</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

export function GoogleButton({ onPress, disabled, loading }) {
  return (
    <TouchableOpacity accessibilityRole="button" style={styles.googleButton} onPress={onPress} disabled={disabled} activeOpacity={0.8}>
      {loading ? <Loader size={20} color="#82DFF5" /> : <GoogleIcon size={20} />}
      <Text style={styles.googleText}>Continue with Google</Text>
    </TouchableOpacity>
  );
}

export function AuthDivider() {
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>OR</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

export function GradientButton({ children, onPress, disabled, loading }) {
  return (
    <TouchableOpacity accessibilityRole="button" style={[styles.primaryOuter, disabled && styles.disabled]} onPress={onPress} disabled={disabled} activeOpacity={0.85}>
      <LinearGradient colors={["#6F96F1", "#B1E8F5", "#74DDF4"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.primaryGradient}>
        {loading ? <Loader size={20} color="#081423" /> : <Text style={styles.primaryText}>{children}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
}

export const AUTH_PLACEHOLDER = "#A5A8B1";

export const authStyles = StyleSheet.create({
  heading: { color: "#FFFFFF", fontSize: 31, fontWeight: "800", letterSpacing: -1, textAlign: "center" },
  subtitle: { color: "#B9C8DE", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 10 },
  section: { width: "100%" },
  field: {
    minHeight: 54, borderRadius: 28, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)", backgroundColor: "#22252B",
    color: "#FFFFFF", paddingHorizontal: 21, fontSize: 14,
  },
  fieldFocused: { borderColor: "#79D9F5" },
  fieldRow: {
    minHeight: 54, borderRadius: 28, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)", backgroundColor: "#22252B",
    flexDirection: "row", alignItems: "center", paddingLeft: 21, paddingRight: 17,
  },
  fieldInner: { flex: 1, color: "#FFFFFF", fontSize: 14, paddingVertical: 0 },
  fieldGap: { marginTop: 14 },
  smallLink: { color: "#F5F8FF", fontSize: 13, fontWeight: "600" },
  switchRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 20 },
  switchPrompt: { color: "#A9AFBF", fontSize: 13 },
  switchLink: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  hint: { color: "#A3ADC2", fontSize: 11, lineHeight: 16, marginTop: 9, paddingHorizontal: 9 },
  backLink: { color: "#B6CAE1", fontSize: 13, textAlign: "center", marginTop: 20 },
  otpRow: { flexDirection: "row", gap: 7, marginTop: 28, marginBottom: 24 },
  otpCell: {
    flex: 1, height: 54, borderRadius: 12, borderWidth: 1,
    backgroundColor: "#22252B", alignItems: "center", justifyContent: "center",
  },
  otpDigit: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },
  hiddenInput: { position: "absolute", width: 1, height: 1, opacity: 0 },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 30, paddingTop: 32, paddingBottom: 14 },
  brand: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  brandIcon: { width: 31, height: 31, borderRadius: 8 },
  brandName: { color: "#FFFFFF", fontSize: 27, fontWeight: "700", letterSpacing: -0.8 },
  content: { flexGrow: 1, justifyContent: "center", paddingVertical: 35 },
  legal: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingBottom: 2 },
  legalLink: { color: "#AAB3C4", fontSize: 11, textDecorationLine: "underline" },
  legalSeparator: { color: "#8892A5", fontSize: 11 },
  googleButton: {
    height: 52, borderRadius: 26, backgroundColor: "#24272F",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.05)",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 11,
  },
  googleText: { color: "#F6F7FB", fontSize: 14, fontWeight: "600" },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 19 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.12)" },
  dividerText: { color: "#AEB7C9", fontSize: 11, fontWeight: "600", letterSpacing: 0.7 },
  primaryOuter: { height: 54, borderRadius: 27, overflow: "hidden" },
  disabled: { opacity: 0.6 },
  primaryGradient: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 27 },
  primaryText: { color: "#091325", fontSize: 14, fontWeight: "800" },
});
