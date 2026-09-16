import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { auth } from "@/lib/firebaseClient";
import { useGoogleAuth } from "@/lib/googleAuth";
import { redirectAfterAuth } from "@/lib/pendingInvite";
import { AUTH_PLACEHOLDER, AuthDivider, AuthScreen, GoogleButton, GradientButton, authStyles } from "@/components/AuthScreenUI";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Eye, EyeOff, MailCheck, ShieldCheck } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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
  // The login route opens directly on the credentials form.
  const [step, setStep] = useState("login");

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

  // ── Step 1: validate credentials, sign in directly ───────────────────────
  // Login OTP is intentionally disabled, matching the web app
  // (frontend/app/(auth)/login/page.jsx LOGIN_OTP_ENABLED = false): the OTP
  // at signup already proves the inbox, so asking again on every login was
  // unnecessary friction. onResendOtp/onVerifyOtp below are kept for later
  // but are now unreachable from this screen.
  const onRequestOtp = async () => {
    if (!email || !password) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }
    try {
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      const idToken = await result.user.getIdToken();
      const referralCode = await getStoredReferralCode();
      await api.post("/auth/google", { token: idToken, referralCode });
      await saveToken(idToken);
      await redirectAfterAuth();
    } catch (e) {
      if (
        e?.code === "auth/invalid-credential" ||
        e?.code === "auth/wrong-password" ||
        e?.code === "auth/user-not-found"
      ) {
        Alert.alert("Sign in failed", "Invalid email or password.");
      } else if (e?.code === "auth/too-many-requests") {
        Alert.alert("Sign in failed", "Too many login attempts. Please try again later.");
      } else {
        Alert.alert(
          "Sign in failed",
          e?.response?.data?.message || e?.message || "Invalid email or password."
        );
      }
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
      await api.post("/auth/google", { token: idToken, referralCode });
      await saveToken(idToken);
      await redirectAfterAuth();
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
        await api.post("/auth/google", { token: firebaseToken, referralCode });
        await saveToken(firebaseToken);
        await redirectAfterAuth();
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
    setStep("login");
    setOtp("");
  };

  return (
    <AuthScreen>
      {step === "login" && (
        <View style={authStyles.section}>
          <Text style={authStyles.heading}>Hi There!</Text>
          <Text style={[authStyles.subtitle, { marginBottom: 27 }]}>Please enter your details to log in.</Text>

          <GoogleButton onPress={onGoogle} disabled={loading} loading={loading} />
          <AuthDivider />

          <TextInput
            accessibilityLabel="Email address"
            style={[authStyles.field, focused === "email" && authStyles.fieldFocused]}
            placeholder="Email address"
            placeholderTextColor={AUTH_PLACEHOLDER}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
            onFocus={() => setFocused("email")}
            onBlur={() => setFocused(null)}
          />
          <View style={[authStyles.fieldRow, authStyles.fieldGap, focused === "password" && authStyles.fieldFocused]}>
            <TextInput
              accessibilityLabel="Password"
              style={authStyles.fieldInner}
              placeholder="Password"
              placeholderTextColor={AUTH_PLACEHOLDER}
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
              editable={!loading}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
            />
            <TouchableOpacity accessibilityLabel={showPass ? "Hide password" : "Show password"} onPress={() => setShowPass(!showPass)}>
              {showPass ? <EyeOff size={18} color="#B6BECD" /> : <Eye size={18} color="#B6BECD" />}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={{ alignSelf: "flex-end", paddingVertical: 16 }}
            onPress={() => { setStep("forgot"); setForgotEmail(email); }}
          >
            <Text style={authStyles.smallLink}>Forgot Password?</Text>
          </TouchableOpacity>

          <GradientButton onPress={onRequestOtp} disabled={loading} loading={loading}>Log In</GradientButton>
          <View style={authStyles.switchRow}>
            <Text style={authStyles.switchPrompt}>Create an account? </Text>
            <Text style={authStyles.switchLink} onPress={() => !loading && router.replace("/auth/register")}>Sign Up</Text>
          </View>
        </View>
      )}

      {step === "otp" && (
        <View style={authStyles.section}>
          <View style={{ alignItems: "center", marginBottom: 20 }}><ShieldCheck size={38} color="#83DCF6" /></View>
          <Text style={authStyles.heading}>Verify it’s you</Text>
          <Text style={authStyles.subtitle}>Enter the 6-digit code sent to {email}</Text>
          <TouchableOpacity activeOpacity={1} onPress={() => otpRef.current?.focus()} style={authStyles.otpRow}>
            {Array.from({ length: OTP_LENGTH }).map((_, i) => (
              <View key={i} style={[authStyles.otpCell, { borderColor: i === otp.length ? "#82DDF5" : "rgba(255,255,255,0.08)" }]}>
                <Text style={authStyles.otpDigit}>{otp[i] || ""}</Text>
              </View>
            ))}
          </TouchableOpacity>
          <TextInput
            ref={otpRef}
            value={otp}
            onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, "").slice(0, OTP_LENGTH))}
            keyboardType="number-pad"
            autoFocus
            maxLength={OTP_LENGTH}
            style={authStyles.hiddenInput}
          />
          <GradientButton onPress={onVerifyOtp} disabled={otpLoading || otp.length < OTP_LENGTH} loading={otpLoading}>Verify & Sign in</GradientButton>
          <Text style={authStyles.backLink} onPress={resendCooldown > 0 ? undefined : onResendOtp}>
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
          </Text>
          <Text style={authStyles.backLink} onPress={onBack}>Use a different account</Text>
        </View>
      )}

      {step === "forgot" && (
        <View style={authStyles.section}>
          <Text style={authStyles.heading}>Reset password</Text>
          <Text style={[authStyles.subtitle, { marginBottom: 28 }]}>Enter your account email and we’ll send you a secure reset link.</Text>
          <TextInput
            accessibilityLabel="Account email address"
            style={[authStyles.field, focused === "forgot" && authStyles.fieldFocused]}
            placeholder="Email address"
            placeholderTextColor={AUTH_PLACEHOLDER}
            value={forgotEmail}
            onChangeText={setForgotEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!forgotLoading}
            onFocus={() => setFocused("forgot")}
            onBlur={() => setFocused(null)}
          />
          <View style={{ marginTop: 20 }}>
            <GradientButton onPress={onForgotSubmit} disabled={forgotLoading} loading={forgotLoading}>Send reset link</GradientButton>
          </View>
          <Text style={authStyles.backLink} onPress={onBack}>Back to log in</Text>
        </View>
      )}

      {step === "forgotSent" && (
        <View style={authStyles.section}>
          <View style={{ alignItems: "center", marginBottom: 20 }}><MailCheck size={38} color="#83DCF6" /></View>
          <Text style={authStyles.heading}>Check your email</Text>
          <Text style={[authStyles.subtitle, { marginBottom: 28 }]}>
            If an account exists for {forgotEmail}, you’ll receive a reset link shortly. The link expires in 15 minutes.
          </Text>
          <GradientButton onPress={onBack}>Back to log in</GradientButton>
        </View>
      )}
    </AuthScreen>
  );
}
