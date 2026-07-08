// lib/googleAuth.js
//
// Google Sign-In bridged into Firebase Auth.
//
// Development/standalone builds use @react-native-google-signin/google-signin.
// Expo Go uses expo-auth-session because Expo Go cannot load that native module.
//
// Requirements (already wired in this repo):
//  - webClientId  → EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID  (REQUIRED — the idToken's
//    audience must be the Web client for Firebase to accept the credential)
//  - iosClientId  → EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
//  - Expo Go      → EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID
//  - The config plugin + iosUrlScheme in app.json, then a native rebuild.
import * as Google from "expo-auth-session/providers/google";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "./firebaseClient";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_EXPO_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID;
const GOOGLE_REDIRECT_URI =
  Constants.expoConfig?.extra?.googleRedirectUri ||
  "https://auth.expo.io/@kunalkumar/splitApp";

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let GoogleSignin;
let statusCodes;
let isErrorWithCode;

if (!isExpoGo) {
  // Lazy require so the native module is only evaluated in a real build.
  const mod = require("@react-native-google-signin/google-signin");
  GoogleSignin = mod.GoogleSignin;
  statusCodes = mod.statusCodes;
  isErrorWithCode = mod.isErrorWithCode;

  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    offlineAccess: false,
  });
}

export const isGoogleAuthAvailable = true;

const signInToFirebase = async (idToken) => {
  if (!idToken) {
    throw new Error("Google sign-in did not return an ID token.");
  }

  const credential = GoogleAuthProvider.credential(idToken);
  return await signInWithCredential(auth, credential);
};

export function useGoogleAuth() {
  const [, , promptExpoGoGoogle] = Google.useAuthRequest({
    clientId: GOOGLE_EXPO_CLIENT_ID,
    responseType: "id_token",
    scopes: ["openid", "profile", "email"],
    redirectUri: GOOGLE_REDIRECT_URI,
    selectAccount: true,
  });

  const signInWithAuthSession = async () => {
    const response = await promptExpoGoGoogle();

    if (response?.type === "cancel" || response?.type === "dismiss") {
      return undefined;
    }
    if (response?.type !== "success") {
      const message =
        response?.params?.error_description ||
        response?.params?.error ||
        "Google sign-in was not completed.";
      throw new Error(message);
    }

    return await signInToFirebase(response.params?.id_token);
  };

  const signIn = async () => {
    if (isExpoGo) {
      return await signInWithAuthSession();
    }

    // Android needs Play Services; on iOS this resolves immediately.
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    let response;
    try {
      response = await GoogleSignin.signIn();
    } catch (error) {
      // User-cancelled / in-progress are not real failures — swallow them so
      // the calling screen just stops its spinner.
      if (
        isErrorWithCode(error) &&
        (error.code === statusCodes.SIGN_IN_CANCELLED ||
          error.code === statusCodes.IN_PROGRESS)
      ) {
        return undefined;
      }
      throw error;
    }

    // v13+ shape: { type: "success" | "cancelled", data }
    if (response?.type === "cancelled") return undefined;
    const idToken = response?.data?.idToken ?? response?.idToken;
    return await signInToFirebase(idToken);
  };

  return { signIn };
}
