import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import { auth } from "@/lib/firebaseClient";
import { useGoogleAuth } from "@/lib/googleAuth";
import { redirectAfterAuth } from "@/lib/pendingInvite";
import GoogleIcon from "@/components/GoogleIcon";
import { Loader } from "@/components/Loader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { signInWithCustomToken } from "firebase/auth";
import { ArrowLeft, Eye, EyeOff, Mail, ShieldCheck } from "lucide-react-native";
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
const RESEND_SECONDS = 60;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getStoredReferralCode = async () => {
  try {
    return (await AsyncStorage.getItem("referralCode")) || undefined;
  } catch {
    return undefined;
  }
};

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

  // step: "start" | "form" | "otp"
  const [step, setStep] = useState("start");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRef = useRef(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(
      () => setResendCooldown((seconds) => Math.max(0, seconds - 1)),
      1000
    );
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const onRegister = async () => {
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedName || !normalizedEmail || !password) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }
    if (normalizedName.length < 2) {
      Alert.alert("Invalid name", "Name must be at least 2 characters.");
      return;
    }
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      Alert.alert(
        "Weak password",
        "Use at least 8 characters, including one uppercase letter and one number."
      );
      return;
    }
    try {
      setLoading(true);
      const { data } = await api.post("/auth/send-signup-otp", {
        name: normalizedName,
        email: normalizedEmail,
        password,
      });
      setOtp("");
      setStep("otp");
      setResendCooldown(data?.retryAfterSeconds || RESEND_SECONDS);
      Alert.alert(
        "Check your email",
        data?.codePending
          ? "Use the verification code already sent to your email."
          : "We sent you a 6-digit verification code."
      );
    } catch (error) {
      const data = error?.response?.data;
      // Compatibility with backend versions that returned 429 when a valid
      // signup code was already pending. The user should enter that code, not
      // be left on the form with a misleading failure.
      const codeAlreadySent =
        error?.response?.status === 429 &&
        (data?.codePending || /code (was|has been) just sent/i.test(data?.message || ""));
      if (codeAlreadySent) {
        setOtp("");
        setStep("otp");
        setResendCooldown(data?.retryAfterSeconds || RESEND_SECONDS);
        Alert.alert("Check your email", "Use the verification code already sent to your email.");
        return;
      }
      Alert.alert(
        "Couldn't send code",
        data?.message ||
          (error?.request
            ? "Couldn't reach the server. Check your internet connection and try again."
            : "Registration failed. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async () => {
    if (otp.length !== OTP_LENGTH) {
      Alert.alert("Incomplete code", "Please enter the complete 6-digit code.");
      return;
    }

    try {
      setOtpLoading(true);
      const referralCode = await getStoredReferralCode();
      const { data } = await api.post("/auth/verify-signup-otp", {
        email: email.trim().toLowerCase(),
        otp,
        password,
        referralCode,
      });
      const result = await signInWithCustomToken(auth, data.customToken);
      const idToken = await result.user.getIdToken();
      await AsyncStorage.removeItem("referralCode").catch(() => {});
      await saveToken(idToken);
      await redirectAfterAuth();
    } catch (error) {
      const data = error?.response?.data;
      if (data?.field === "email") {
        setStep("form");
        setOtp("");
      }
      Alert.alert(
        "Verification failed",
        data?.message ||
          (error?.request
            ? "Couldn't reach the server. Check your internet connection and try again."
            : error?.message || "Invalid or expired code. Please try again.")
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const onResendOtp = async () => {
    if (resendCooldown > 0 || otpLoading) return;
    try {
      setOtpLoading(true);
      const { data } = await api.post("/auth/send-signup-otp", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      setOtp("");
      setResendCooldown(data?.retryAfterSeconds || RESEND_SECONDS);
      Alert.alert(
        data?.codePending ? "Code already sent" : "Code sent",
        data?.codePending
          ? "Use the verification code already sent to your email."
          : "A new verification code is on its way."
      );
    } catch (error) {
      const data = error?.response?.data;
      const codeAlreadySent =
        error?.response?.status === 429 &&
        (data?.codePending || /code (was|has been) just sent/i.test(data?.message || ""));
      if (codeAlreadySent) {
        setResendCooldown(data?.retryAfterSeconds || RESEND_SECONDS);
        Alert.alert("Code already sent", "Use the verification code already sent to your email.");
        return;
      }
      Alert.alert(
        "Couldn't resend",
        data?.message || "Please wait a moment and try again."
      );
    } finally {
      setOtpLoading(false);
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
        await api.post("/auth/google", { token: firebaseToken, referralCode });
        await AsyncStorage.removeItem("referralCode").catch(() => {});
        await saveToken(firebaseToken);
        await redirectAfterAuth();
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
              onPress={() => {
                if (step === "otp") {
                  setStep("form");
                  setOtp("");
                } else if (step === "form") {
                  setStep("start");
                } else if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/auth/login");
                }
              }}
              style={[styles.backBtn, { backgroundColor: surface, borderColor: borderDefault }]}
              activeOpacity={0.7}
            >
              <ArrowLeft size={18} color={isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.5)"} strokeWidth={2} />
            </TouchableOpacity>
          </Animated.View>

          {/* Headline */}
          {step !== "otp" && <Animated.View entering={FadeInDown.delay(80).duration(500)} style={styles.headlineBlock}>
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
          </Animated.View>}

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
                  placeholder="min. 8 characters"
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
                At least 8 characters, one uppercase letter, and one number
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

          {/* ── STEP: verify email before creating the account ─────────── */}
          {step === "otp" && (
            <Animated.View entering={FadeInDown.duration(400)} style={styles.form}>
              <View style={styles.stepIconWrap}>
                <View style={[styles.stepIconCircle, { backgroundColor: accent + "1A" }]}>
                  <ShieldCheck size={26} color={accent} />
                </View>
              </View>
              <Text style={[styles.headlineSm, { color: isDark ? "#ffffff" : "#0a0a12" }]}>Verify your email</Text>
              <Text style={[styles.sub, { color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }]}>
                We sent a 6-digit code to{"\n"}
                <Text style={{ color: isDark ? "#ffffff" : "#0a0a12", fontWeight: "700" }}>
                  {email.trim().toLowerCase()}
                </Text>
              </Text>

              <TouchableOpacity activeOpacity={1} onPress={() => otpRef.current?.focus()} style={styles.otpRow}>
                {Array.from({ length: OTP_LENGTH }).map((_, index) => {
                  const digit = otp[index] || "";
                  const isActive = index === otp.length;
                  return (
                    <View
                      key={index}
                      style={[
                        styles.otpCell,
                        { backgroundColor: surface, borderColor: isActive ? accent : borderDefault },
                      ]}
                    >
                      <Text style={[styles.otpCellText, { color: isDark ? "#ffffff" : "#0a0a12" }]}>{digit}</Text>
                    </View>
                  );
                })}
              </TouchableOpacity>
              <TextInput
                ref={otpRef}
                value={otp}
                onChangeText={(value) => setOtp(value.replace(/[^0-9]/g, "").slice(0, OTP_LENGTH))}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                autoFocus
                maxLength={OTP_LENGTH}
                style={styles.hiddenInput}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: accent, opacity: otpLoading || otp.length !== OTP_LENGTH ? 0.6 : 1 }]}
                onPress={onVerifyOtp}
                disabled={otpLoading || otp.length !== OTP_LENGTH}
                activeOpacity={0.85}
              >
                {otpLoading ? <Loader size={20} color="#fff" /> : <Text style={styles.primaryBtnText}>Verify & create account</Text>}
              </TouchableOpacity>

              <View style={styles.resendRow}>
                {resendCooldown > 0 ? (
                  <Text style={[styles.resendMuted, { color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }]}>Resend code in {resendCooldown}s</Text>
                ) : (
                  <Text style={[styles.resendLink, { color: accent }]} onPress={onResendOtp}>Resend code</Text>
                )}
              </View>

              <Text
                style={[styles.backToForm, { color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }]}
                onPress={() => { setStep("form"); setOtp(""); }}
              >
                Change email or password
              </Text>
            </Animated.View>
          )}

          {/* Footer */}
          {step !== "otp" && <Animated.View entering={FadeInDown.delay(240).duration(500)} style={styles.footer}>
            <Text style={[styles.footerText, { color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)" }]}>
              Already have an account?{"  "}
              <Text
                style={[styles.footerLink, { color: accent }]}
                onPress={() => !loading && router.push("/auth/login")}
              >
                Sign in
              </Text>
            </Text>
          </Animated.View>}
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

  // Email verification
  stepIconWrap: { alignItems: "center", marginTop: 16 },
  stepIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  headlineSm: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.7,
    textAlign: "center",
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 4,
  },
  otpCell: {
    flex: 1,
    aspectRatio: 0.85,
    maxHeight: 58,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  otpCellText: { fontSize: 24, fontWeight: "700" },
  hiddenInput: { position: "absolute", width: 1, height: 1, opacity: 0 },
  resendRow: { alignItems: "center", marginTop: -6 },
  resendMuted: { fontSize: 13 },
  resendLink: { fontSize: 13, fontWeight: "700" },
  backToForm: { fontSize: 13, textAlign: "center", marginTop: -6 },

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
