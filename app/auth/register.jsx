import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import { auth } from "@/lib/firebaseClient";
import { useGoogleAuth } from "@/lib/googleAuth";
import GoogleIcon from "@/components/GoogleIcon";
import { Loader } from "@/components/Loader";
import { router } from "expo-router";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { ArrowLeft, Eye, EyeOff, Mail } from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const INDIGO = "#6366F1";
const INDIGO_DARK = "#818CF8";

export default function RegisterScreen() {
  const { saveToken } = useAuth();
  const { signIn: googleSignIn } = useGoogleAuth();
  const { theme } = useTheme();

  const isDark = theme === "dark";
  const accent = isDark ? INDIGO_DARK : INDIGO;
  const bg = isDark ? "#09090f" : "#ffffff";
  const surface = isDark ? "#111118" : "#f9f9fb";
  const borderDefault = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const borderFocus = accent;

  // step: "start" | "form"
  const [step, setStep] = useState("start");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);

  const onRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    try {
      setLoading(true);
      const res = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(res.user, { displayName: name });
      const firebaseToken = await res.user.getIdToken();
      try {
        const backend = await api.post("/auth/google", { token: firebaseToken });
        await saveToken(backend.data.token);
        router.replace("/(tabs)/home");
      } catch {
        Alert.alert("Warning", "Account created, but failed to connect to backend.");
      }
    } catch (error) {
      const msg =
        error.code === "auth/email-already-in-use"
          ? "This email is already registered."
          : error.code === "auth/invalid-email"
          ? "Invalid email address."
          : error.code === "auth/weak-password"
          ? "Password is too weak."
          : "Registration failed. Please try again.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    try {
      setLoading(true);
      const result = await googleSignIn();
      if (!result?.user) return;
      const firebaseToken = await result.user.getIdToken();
      try {
        const backend = await api.post("/auth/google", { token: firebaseToken });
        await saveToken(backend.data.token);
        router.replace("/(tabs)/home");
      } catch {
        Alert.alert("Warning", "Google auth succeeded but failed to connect to backend.");
      }
    } catch (error) {
      Alert.alert("Error", error?.message || "Google sign-up failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <SafeAreaView style={styles.root}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <Animated.View entering={FadeInDown.duration(400)}>
            <TouchableOpacity
              onPress={() => (step === "form" ? setStep("start") : router.back())}
              style={[styles.backBtn, { backgroundColor: surface, borderColor: borderDefault }]}
              activeOpacity={0.7}
            >
              <ArrowLeft size={18} color={isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.5)"} strokeWidth={2} />
            </TouchableOpacity>
          </Animated.View>

          {/* Headline */}
          <Animated.View entering={FadeInDown.delay(80).duration(500)} style={styles.headlineBlock}>
            <View style={styles.logoRow}>
              <Image
                source={require("../../assets/images/icon.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.headline, { color: isDark ? "#ffffff" : "#0a0a12" }]}>
              Create{"\n"}account.
            </Text>
            <Text style={[styles.sub, { color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }]}>
              Join SplitEase and split smarter
            </Text>
          </Animated.View>

          {/* ── STEP: start (minimal: choose Google or email) ───────────── */}
          {step === "start" && (
            <Animated.View entering={FadeInDown.delay(160).duration(500)} style={styles.form}>
              <TouchableOpacity
                style={[styles.googleBtn, { backgroundColor: surface, borderColor: borderDefault }]}
                onPress={onGoogle}
                disabled={loading}
                activeOpacity={0.8}
              >
                <View style={styles.googleIconBox}>
                  {loading ? <Loader size={20} color={accent} /> : <GoogleIcon size={20} />}
                </View>
                <Text style={[styles.googleBtnText, { color: isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.65)" }]}>
                  Continue with Google
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.googleBtn, { backgroundColor: surface, borderColor: borderDefault }]}
                onPress={() => setStep("form")}
                disabled={loading}
                activeOpacity={0.8}
              >
                <View style={styles.googleIconBox}>
                  <Mail size={20} color={accent} />
                </View>
                <Text style={[styles.googleBtnText, { color: isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.65)" }]}>
                  Continue with email
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ── STEP: form (email sign-up) ──────────────────────────────── */}
          {step === "form" && (
          <Animated.View entering={FadeInDown.delay(160).duration(500)} style={styles.form}>

            {/* Name */}
            <View style={styles.fieldBlock}>
              <Text style={[styles.label, { color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)" }]}>
                Full name
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: surface,
                    color: isDark ? "#ffffff" : "#0a0a12",
                    borderColor: focused === "name" ? borderFocus : borderDefault,
                  },
                ]}
                placeholder="John Doe"
                placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}
                value={name}
                onChangeText={setName}
                editable={!loading}
                onFocus={() => setFocused("name")}
                onBlur={() => setFocused(null)}
              />
            </View>

            {/* Email */}
            <View style={styles.fieldBlock}>
              <Text style={[styles.label, { color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)" }]}>
                Email address
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: surface,
                    color: isDark ? "#ffffff" : "#0a0a12",
                    borderColor: focused === "email" ? borderFocus : borderDefault,
                  },
                ]}
                placeholder="you@example.com"
                placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
              />
            </View>

            {/* Password */}
            <View style={styles.fieldBlock}>
              <Text style={[styles.label, { color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)" }]}>
                Password
              </Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: surface,
                    borderColor: focused === "password" ? borderFocus : borderDefault,
                  },
                ]}
              >
                <TextInput
                  style={[styles.inputInner, { color: isDark ? "#ffffff" : "#0a0a12" }]}
                  placeholder="min. 6 characters"
                  placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}
                  secureTextEntry={!showPass}
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                  {showPass
                    ? <EyeOff size={18} color={isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)"} />
                    : <Eye size={18} color={isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)"} />}
                </TouchableOpacity>
              </View>
              <Text style={[styles.hint, { color: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)" }]}>
                Must be at least 6 characters
              </Text>
            </View>

            {/* Register */}
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: accent, opacity: loading ? 0.65 : 1 }]}
              onPress={onRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <Loader size={20} color="#fff" />
                : <Text style={styles.primaryBtnText}>Create account</Text>}
            </TouchableOpacity>
          </Animated.View>
          )}

          {/* Footer */}
          <Animated.View entering={FadeInDown.delay(240).duration(500)} style={styles.footer}>
            <Text style={[styles.footerText, { color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)" }]}>
              Already have an account?{"  "}
              <Text
                style={[styles.footerLink, { color: accent }]}
                onPress={() => !loading && router.push("/auth/login")}
              >
                Sign in
              </Text>
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Back
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },

  // Headline
  headlineBlock: {
    marginTop: 12,
    marginBottom: 36,
    gap: 8,
    alignItems: "center",
  },
  logoRow: {
    marginBottom: 6,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 13,
  },
  headline: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 38,
    textAlign: "center",
  },
  sub: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
    textAlign: "center",
  },

  // Form
  form: {
    gap: 20,
  },

  // Google
  googleBtn: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  googleIconBox: {
    width: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },

  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: "500",
  },

  // Fields
  fieldBlock: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  input: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    fontSize: 15,
    fontWeight: "400",
  },
  inputRow: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  inputInner: {
    flex: 1,
    fontSize: 15,
    fontWeight: "400",
  },
  eyeBtn: {
    paddingLeft: 12,
  },
  hint: {
    fontSize: 11,
    fontWeight: "400",
    marginTop: -2,
  },

  // Primary button
  primaryBtn: {
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
    shadowColor: INDIGO,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  // Footer
  footer: {
    marginTop: 36,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    fontWeight: "400",
  },
  footerLink: {
    fontWeight: "700",
  },
});
