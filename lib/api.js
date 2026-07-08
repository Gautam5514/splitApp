// lib/api.js
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { auth } from "./firebaseClient";

export const api = axios.create({
  baseURL: `${process.env.EXPO_PUBLIC_API_URL}/api`,
  timeout: 15000, // 15s — prevents hanging forever on slow APK networks
});

// ── Request interceptor: attach the freshest available token ──────────────
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;

  if (user) {
    const idToken = await user.getIdToken();
    config.headers.Authorization = `Bearer ${idToken}`;
  } else {
    const stored =
      Platform.OS === "web"
        ? localStorage.getItem("token")
        : await SecureStore.getItemAsync("token");
    if (stored) config.headers.Authorization = `Bearer ${stored}`;
  }

  return config;
});

// ── Response interceptor: auto-refresh on 401 then retry once ────────────
let _isRefreshing = false;
let _failedQueue = [];

const _processQueue = (error, token = null) => {
  _failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  _failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (_isRefreshing) {
        return new Promise((resolve, reject) =>
          _failedQueue.push({ resolve, reject })
        ).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      _isRefreshing = true;

      try {
        const user = auth.currentUser;
        if (!user) throw new Error("No Firebase user");

        const fresh = await user.getIdToken(true); // force-refresh
        if (Platform.OS === "web") {
          localStorage.setItem("token", fresh);
        } else {
          await SecureStore.setItemAsync("token", fresh);
        }
        api.defaults.headers.common.Authorization = `Bearer ${fresh}`;
        _processQueue(null, fresh);
        original.headers.Authorization = `Bearer ${fresh}`;
        return api(original);
      } catch (err) {
        _processQueue(err, null);
        return Promise.reject(err);
      } finally {
        _isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};
