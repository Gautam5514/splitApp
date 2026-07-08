import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { io } from "socket.io-client";
import { auth } from "./firebaseClient";

const socket = io(process.env.EXPO_PUBLIC_API_URL, {
  transports: ["websocket"],
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  timeout: 10000,
});

const _getToken = async () => {
  const user = auth.currentUser;
  if (user) {
    try {
      return await user.getIdToken();
    } catch {
      return null;
    }
  }
  if (Platform.OS === "web") {
    return localStorage.getItem("token");
  }
  return SecureStore.getItemAsync("token");
};

export const connectSocket = async () => {
  const token = await _getToken();
  if (!token) return;

  if (socket.connected) {
    // Re-register with the latest token (handles token refresh)
    socket.emit("register", token);
    return;
  }

  socket.connect();

  socket.once("connect", () => {
    socket.emit("register", token);
  });
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

// Call this after a Firebase token refresh so the server knows the new identity
export const reconnectSocket = async () => {
  disconnectSocket();
  await connectSocket();
};

export default socket;
