import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import { auth } from "@/lib/firebaseClient";
import { useGoogleAuth } from "@/lib/googleAuth";
import GoogleIcon from "@/components/GoogleIcon";
import { Loader } from "@/components/Loader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { ArrowLeft, Eye, EyeOff, Mail, MailCheck, ShieldCheck } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
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
const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

const getStoredReferralCode = async () => {
  try {
    return (await AsyncStorage.getItem("referralCode")) || undefined;
  } catch {
    return undefined;
  }
};

export default function LoginScreen() {
  const { saveToken } = useAuth();
  const { signIn: googleSignIn } = useGoogleAuth();
  const { theme } = useTheme();

  const isDark = theme === "dark";
  const accent = isDark ? INDIGO_DARK : INDIGO;
  const bg = isDark ? "#09090f" : "#ffffff";
  const surface = isDark ? "#111118" : "#f9f9fb";
  const borderDefault = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const borderFocus = accent;
  const labelColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const textColor = isDark ? "#ffffff" : "#0a0a12";
  const subColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";

  // step: "start" | "login" | "otp" | "forgot" | "forgotSent"
  const [step, setStep] = useState("start");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);

  // OTP step
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRef = useRef(null);

  // Forgot step
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // ── Step 1: validate credentials + send OTP ──────────────────────────────
  const onRequestOtp = async () => {
    if (!email || !password) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }
    try {
      setLoading(true);
      await api.post("/auth/send-login-otp", { email: email.trim(), password });
      setStep("otp");
      setOtp("");
      setResendCooldown(RESEND_SECONDS);
    } catch (e) {
      Alert.alert(
        "Sign in failed",
        e?.response?.data?.message || "Invalid email or password."
      );
    } finally {
      setLoading(false);
    }
  };

  const onResendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      setOtpLoading(true);
      await api.post("/auth/send-login-otp", { email: email.trim(), password });
      setResendCooldown(RESEND_SECONDS);
      Alert.alert("Code sent", "A new verification code is on its way.");
    } catch (e) {
      Alert.alert(
        "Couldn't resend",
        e?.response?.data?.message || "Please wait a moment and try again."
      );
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Step 2: verify OTP, then complete Firebase sign-in ───────────────────
  const onVerifyOtp = async () => {
    if (otp.length < OTP_LENGTH) {
      Alert.alert("Incomplete code", "Please enter the complete 6-digit code.");
      return;
    }
    try {
      setOtpLoading(true);
      await api.post("/auth/verify-login-otp", { email: email.trim(), otp });

      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      const idToken = await result.user.getIdToken();
      const referralCode = await getStoredReferralCode();
      const backend = await api.post("/auth/google", { token: idToken, referralCode });
      await saveToken(backend.data.token);
      router.replace("/(tabs)/home");
    } catch (e) {
      Alert.alert(
        "Verification failed",
        e?.response?.data?.message || "Invalid or expired code. Please try again."
      );
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Forgot password ──────────────────────────────────────────────────────
  const onForgotSubmit = async () => {
    if (!forgotEmail) {
      Alert.alert("Email required", "Please enter your account email.");
      return;
    }
    try {
      setForgotLoading(true);
      await api.post("/auth/forgot-password", { email: forgotEmail.trim() });
      setStep("forgotSent");
    } catch (e) {
      Alert.alert(
        "Couldn't send link",
        e?.response?.data?.message || "Something went wrong. Please try again."
      );
    } finally {
      setForgotLoading(false);
    }
  };

  const onGoogle = async () => {
    try {
      setLoading(true);
      const result = await googleSignIn();
      if (!result?.user) return;
      const firebaseToken = await result.user.getIdToken();
      const referralCode = await getStoredReferralCode();
      try {
        const backend = await api.post("/auth/google", { token: firebaseToken, referralCode });
        await saveToken(backend.data.token);
        router.replace("/(tabs)/home");
      } catch {
        Alert.alert("Warning", "Google sign-in succeeded but failed to connect to backend.");
      }
    } catch (error) {
      Alert.alert("Error", error?.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const onBack = () => {
    if (step === "start") {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/auth/register");
      }
    } else if (step === "login") {
      setStep("start");
    } else {
      setStep("login");
      setOtp("");
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
              onPress={onBack}
              style={[styles.backBtn, { backgroundColor: surface, borderColor: borderDefault }]}
              activeOpacity={0.7}
            >
              <ArrowLeft size={18} color={isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.5)"} strokeWidth={2} />
            </TouchableOpacity>
          </Animated.View>

          {/* ── STEP: start (minimal: choose Google or email) ───────────── */}
          {step === "start" && (
            <>
              <Animated.View entering={FadeInDown.delay(80).duration(500)} style={styles.headlineBlock}>
                <View style={styles.logoRow}>
                  <Image source={require("../../assets/images/icon.png")} style={styles.logo} resizeMode="contain" />
                </View>
                <Text style={[styles.headline, { color: textColor }]}>Welcome{"\n"}back.</Text>
                <Text style={[styles.sub, { color: subColor }]}>Sign in to your SplitEase account</Text>
              </Animated.View>

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
                  onPress={() => setStep("login")}
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

              <Animated.View entering={FadeInDown.delay(240).duration(500)} style={styles.footer}>
                <Text style={[styles.footerText, { color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)" }]}>
                  {"Don't have an account?  "}
                  <Text style={[styles.footerLink, { color: accent }]} onPress={() => !loading && router.push("/auth/register")}>
                    Register
                  </Text>
                </Text>
              </Animated.View>
            </>
          )}

          {/* ── STEP: login ─────────────────────────────────────────────── */}
          {step === "login" && (
            <>
              <Animated.View entering={FadeInDown.delay(80).duration(500)} style={styles.headlineBlock}>
                <View style={styles.logoRow}>
                  <Image source={require("../../assets/images/icon.png")} style={styles.logo} resizeMode="contain" />
                </View>
                <Text style={[styles.headline, { color: textColor }]}>Welcome{"\n"}back.</Text>
                <Text style={[styles.sub, { color: subColor }]}>Sign in to your SplitEase account</Text>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(160).duration(500)} style={styles.form}>
                <View style={styles.fieldBlock}>
                  <Text style={[styles.label, { color: labelColor }]}>Email address</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: surface, color: textColor, borderColor: focused === "email" ? borderFocus : borderDefault }]}
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

                <View style={styles.fieldBlock}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.label, { color: labelColor }]}>Password</Text>
                    <Text
                      style={[styles.forgotLink, { color: accent }]}
                      onPress={() => { setStep("forgot"); setForgotEmail(email); }}
                    >
                      Forgot?
                    </Text>
                  </View>
                  <View style={[styles.inputRow, { backgroundColor: surface, borderColor: focused === "password" ? borderFocus : borderDefault }]}>
                    <TextInput
                      style={[styles.inputInner, { color: textColor }]}
                      placeholder="••••••••"
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
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: accent, opacity: loading ? 0.65 : 1 }]}
                  onPress={onRequestOtp}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? <Loader size={20} color="#fff" /> : <Text style={styles.primaryBtnText}>Continue</Text>}
                </TouchableOpacity>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(240).duration(500)} style={styles.footer}>
                <Text style={[styles.footerText, { color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)" }]}>
                  {"Don't have an account?  "}
                  <Text style={[styles.footerLink, { color: accent }]} onPress={() => !loading && router.push("/auth/register")}>
                    Register
                  </Text>
                </Text>
              </Animated.View>
            </>
          )}

          {/* ── STEP: otp ───────────────────────────────────────────────── */}
          {step === "otp" && (
            <Animated.View entering={FadeInDown.duration(400)} style={styles.form}>
              <View style={styles.stepIconWrap}>
                <View style={[styles.stepIconCircle, { backgroundColor: accent + "1A" }]}>
                  <ShieldCheck size={26} color={accent} />
                </View>
              </View>
              <Text style={[styles.headlineSm, { color: textColor }]}>Verify it{"'"}s you</Text>
              <Text style={[styles.sub, { color: subColor, textAlign: "center" }]}>
                We sent a 6-digit code to{"\n"}
                <Text style={{ color: textColor, fontWeight: "700" }}>{email}</Text>
              </Text>

              {/* OTP cells */}
              <TouchableOpacity activeOpacity={1} onPress={() => otpRef.current?.focus()} style={styles.otpRow}>
                {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                  const char = otp[i] || "";
                  const isActive = i === otp.length;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.otpCell,
                        { backgroundColor: surface, borderColor: isActive ? accent : borderDefault },
                      ]}
                    >
                      <Text style={[styles.otpCellText, { color: textColor }]}>{char}</Text>
                    </View>
                  );
                })}
              </TouchableOpacity>
              <TextInput
                ref={otpRef}
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, "").slice(0, OTP_LENGTH))}
                keyboardType="number-pad"
                autoFocus
                maxLength={OTP_LENGTH}
                style={styles.hiddenInput}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: accent, opacity: otpLoading || otp.length < OTP_LENGTH ? 0.6 : 1 }]}
                onPress={onVerifyOtp}
                disabled={otpLoading || otp.length < OTP_LENGTH}
                activeOpacity={0.85}
              >
                {otpLoading ? <Loader size={20} color="#fff" /> : <Text style={styles.primaryBtnText}>Verify & Sign in</Text>}
              </TouchableOpacity>

              <View style={styles.resendRow}>
                {resendCooldown > 0 ? (
                  <Text style={[styles.resendMuted, { color: subColor }]}>Resend code in {resendCooldown}s</Text>
                ) : (
                  <Text style={[styles.resendLink, { color: accent }]} onPress={onResendOtp}>Resend code</Text>
                )}
              </View>

              <Text style={[styles.backToLogin, { color: subColor }]} onPress={() => { setStep("login"); setOtp(""); }}>
                Use a different account
              </Text>
            </Animated.View>
          )}

          {/* ── STEP: forgot ────────────────────────────────────────────── */}
          {step === "forgot" && (
            <Animated.View entering={FadeInDown.duration(400)} style={styles.form}>
              <Text style={[styles.headlineSm, { color: textColor }]}>Reset password</Text>
              <Text style={[styles.sub, { color: subColor }]}>
                Enter your account email and we{"'"}ll send you a secure reset link.
              </Text>

              <View style={styles.fieldBlock}>
                <Text style={[styles.label, { color: labelColor }]}>Email address</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: surface, color: textColor, borderColor: focused === "forgot" ? borderFocus : borderDefault }]}
                  placeholder="you@example.com"
                  placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!forgotLoading}
                  onFocus={() => setFocused("forgot")}
                  onBlur={() => setFocused(null)}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: accent, opacity: forgotLoading ? 0.65 : 1 }]}
                onPress={onForgotSubmit}
                disabled={forgotLoading}
                activeOpacity={0.85}
              >
                {forgotLoading ? <Loader size={20} color="#fff" /> : <Text style={styles.primaryBtnText}>Send reset link</Text>}
              </TouchableOpacity>

              <Text style={[styles.backToLogin, { color: subColor }]} onPress={() => setStep("login")}>
                Back to sign in
              </Text>
            </Animated.View>
          )}

          {/* ── STEP: forgotSent ────────────────────────────────────────── */}
          {step === "forgotSent" && (
            <Animated.View entering={FadeInDown.duration(400)} style={styles.form}>
              <View style={styles.stepIconWrap}>
                <View style={[styles.stepIconCircle, { backgroundColor: "#10B98119" }]}>
                  <MailCheck size={26} color="#10B981" />
                </View>
              </View>
              <Text style={[styles.headlineSm, { color: textColor }]}>Check your email</Text>
              <Text style={[styles.sub, { color: subColor, textAlign: "center" }]}>
                If an account exists for{"\n"}
                <Text style={{ color: textColor, fontWeight: "700" }}>{forgotEmail}</Text>
                {"\n"}you{"'"}ll receive a reset link shortly. The link expires in 15 minutes.
              </Text>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: accent }]}
                onPress={() => setStep("login")}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Back to sign in</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 16, paddingBottom: 40 },

  backBtn: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1,
    justifyContent: "center", alignItems: "center", marginBottom: 40,
  },

  headlineBlock: { marginTop: 12, marginBottom: 40, gap: 8, alignItems: "center" },
  logoRow: { marginBottom: 6 },
  logo: { width: 52, height: 52, borderRadius: 13 },
  headline: { fontSize: 32, fontWeight: "800", letterSpacing: -1, lineHeight: 38, textAlign: "center" },
  headlineSm: { fontSize: 28, fontWeight: "800", letterSpacing: -1, textAlign: "center", marginBottom: 4 },
  sub: { fontSize: 14, fontWeight: "400", lineHeight: 20, textAlign: "center" },

  form: { gap: 20 },
  fieldBlock: { gap: 8 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  forgotLink: { fontSize: 12, fontWeight: "700" },
  label: { fontSize: 12, fontWeight: "600", letterSpacing: 0.4, textTransform: "uppercase" },
  input: { height: 56, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 18, fontSize: 15, fontWeight: "400" },
  inputRow: { height: 56, borderRadius: 14, borderWidth: 1.5, flexDirection: "row", alignItems: "center", paddingHorizontal: 18 },
  inputInner: { flex: 1, fontSize: 15, fontWeight: "400" },
  eyeBtn: { paddingLeft: 12 },

  primaryBtn: {
    height: 56, borderRadius: 14, justifyContent: "center", alignItems: "center", marginTop: 4,
    shadowColor: INDIGO, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  primaryBtnText: { color: "#ffffff", fontSize: 16, fontWeight: "700", letterSpacing: 0.2 },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontWeight: "500" },

  googleBtn: {
    height: 56, borderRadius: 14, borderWidth: 1.5, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 12,
  },
  googleIconBox: { width: 22, height: 22, justifyContent: "center", alignItems: "center" },
  googleBtnText: { fontSize: 15, fontWeight: "600" },

  footer: { marginTop: 36, alignItems: "center" },
  footerText: { fontSize: 14, fontWeight: "400" },
  footerLink: { fontWeight: "700" },

  // OTP
  stepIconWrap: { alignItems: "center", marginBottom: 4 },
  stepIconCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center" },
  otpRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginTop: 4 },
  otpCell: {
    flex: 1, height: 58, borderRadius: 12, borderWidth: 1.5,
    justifyContent: "center", alignItems: "center",
  },
  otpCellText: { fontSize: 24, fontWeight: "700" },
  hiddenInput: { position: "absolute", width: 1, height: 1, opacity: 0 },
  resendRow: { alignItems: "center", marginTop: -6 },
  resendMuted: { fontSize: 13 },
  resendLink: { fontSize: 13, fontWeight: "700" },
  backToLogin: { textAlign: "center", fontSize: 14, fontWeight: "500", marginTop: 4 },
});
