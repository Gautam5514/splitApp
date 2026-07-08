// context/AuthContext.jsx
import { setAuthToken } from "@/lib/api";
import { auth } from "@/lib/firebaseClient";
import { unregisterStoredPushToken } from "@/lib/pushNotifications";
import * as SecureStore from "expo-secure-store";
import { onIdTokenChanged, signOut } from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Platform-specific storage functions
  const setStorageItem = async (key, value) => {
    try {
      if (Platform.OS === "web") {
        localStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (e) {
      console.error("Error setting storage item", e);
    }
  };

  const deleteStorageItem = async (key) => {
    try {
      if (Platform.OS === "web") {
        localStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (e) {
      console.error("Error deleting storage item", e);
    }
  };

  const getStorageItem = async (key) => {
    try {
      if (Platform.OS === "web") {
        return localStorage.getItem(key);
      } else {
        return await SecureStore.getItemAsync(key);
      }
    } catch (e) {
      console.error("Error getting storage item", e);
      return null;
    }
  };

  // Sync state and storage
  const updateAuthToken = async (newToken) => {
    if (newToken) {
      await setStorageItem("token", newToken);
      setAuthToken(newToken);
      setToken(newToken);
    } else {
      await deleteStorageItem("token");
      setAuthToken(null);
      setToken(null);
    }
  };

  // 1. Initial Load from Storage (Optimistic UI)
  useEffect(() => {
    const loadStoredToken = async () => {
      const stored = await getStorageItem("token");
      if (stored) {
        setToken(stored);
        setAuthToken(stored);
      }
    };
    loadStoredToken();
  }, []);

  // 2. Firebase Listener (Source of Truth)
  useEffect(() => {
    // onIdTokenChanged triggers on sign-in, sign-out, AND token refresh
    const unsub = onIdTokenChanged(auth, async (user) => {
      if (user) {
        try {
          // Force refresh if needed, but usually getIdToken() is efficient
          const idToken = await user.getIdToken();
          await updateAuthToken(idToken);
        } catch (error) {
          console.error("Error getting ID token:", error);
          await updateAuthToken(null);
        }
      } else {
        await updateAuthToken(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const logout = async () => {
    try {
      await unregisterStoredPushToken();
      await signOut(auth); // Properly sign out from Firebase
      // The listener will handle the state update (user becomes null)
    } catch (error) {
      console.error("Logout failed:", error);
      // Fallback manual cleanup
      await updateAuthToken(null);
    }
  };

  return (
    <AuthContext.Provider value={{ token, saveToken: updateAuthToken, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
