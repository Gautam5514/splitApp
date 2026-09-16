import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { auth } from "@/lib/firebaseClient";
import { useGoogleAuth } from "@/lib/googleAuth";
import { redirectAfterAuth } from "@/lib/pendingInvite";
import { AUTH_PLACEHOLDER, AuthDivider, AuthScreen, GoogleButton, GradientButton, authStyles } from "@/components/AuthScreenUI";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { signInWithCustomToken } from "firebase/auth";
import { Eye, EyeOff, ShieldCheck } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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
  // The registration route opens on the form; OTP is the next step after submitting it.
  const [step, setStep] = useState("form");
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
    <AuthScreen>
      {step === "form" && (
        <View style={authStyles.section}>
          <Text style={authStyles.heading}>Create an Account</Text>
          <Text style={[authStyles.subtitle, { marginBottom: 25 }]}>
            Enter your details, verify your email, and start splitting together.
          </Text>

          <GoogleButton onPress={onGoogle} disabled={loading} loading={loading} />
          <AuthDivider />

          <TextInput
            accessibilityLabel="Full name"
            style={[authStyles.field, focused === "name" && authStyles.fieldFocused]}
            placeholder="Full name"
            placeholderTextColor={AUTH_PLACEHOLDER}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            editable={!loading}
            onFocus={() => setFocused("name")}
            onBlur={() => setFocused(null)}
          />
          <TextInput
            accessibilityLabel="Email address"
            style={[authStyles.field, authStyles.fieldGap, focused === "email" && authStyles.fieldFocused]}
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
          <Text style={authStyles.hint}>At least 8 characters, one uppercase letter, and one number</Text>

          <View style={{ marginTop: 21 }}>
            <GradientButton onPress={onRegister} disabled={loading} loading={loading}>Continue</GradientButton>
          </View>
          <View style={authStyles.switchRow}>
            <Text style={authStyles.switchPrompt}>Have an account? </Text>
            <Text style={authStyles.switchLink} onPress={() => !loading && router.replace("/auth/login")}>Log In</Text>
          </View>
        </View>
      )}

      {step === "otp" && (
        <View style={authStyles.section}>
          <View style={{ alignItems: "center", marginBottom: 20 }}><ShieldCheck size={38} color="#83DCF6" /></View>
          <Text style={authStyles.heading}>Verify your email</Text>
          <Text style={authStyles.subtitle}>Enter the 6-digit code sent to {email.trim().toLowerCase()}</Text>
          <TouchableOpacity activeOpacity={1} onPress={() => otpRef.current?.focus()} style={authStyles.otpRow}>
            {Array.from({ length: OTP_LENGTH }).map((_, index) => (
              <View key={index} style={[authStyles.otpCell, { borderColor: index === otp.length ? "#82DDF5" : "rgba(255,255,255,0.08)" }]}>
                <Text style={authStyles.otpDigit}>{otp[index] || ""}</Text>
              </View>
            ))}
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
            style={authStyles.hiddenInput}
          />
          <GradientButton onPress={onVerifyOtp} disabled={otpLoading || otp.length !== OTP_LENGTH} loading={otpLoading}>
            Verify & create account
          </GradientButton>
          <Text style={authStyles.backLink} onPress={resendCooldown > 0 ? undefined : onResendOtp}>
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
          </Text>
          <Text style={authStyles.backLink} onPress={() => { setStep("form"); setOtp(""); }}>
            Change email or password
          </Text>
        </View>
      )}
    </AuthScreen>
  );
}
