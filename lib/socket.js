import * as SecureStore from "expo-secure-store";
import { AppState, Platform } from "react-native";
import { io } from "socket.io-client";
import { auth } from "./firebaseClient";
import { API_URL } from "./config";

// One shared socket for the whole app. It must survive the phone being locked,
// the app going to the background, and flaky mobile data, so:
//  - it never gives up reconnecting (the old 5-attempt limit meant a short
//    signal drop killed live updates until the app was force-closed);
//  - every (re)connect re-registers with a FRESH Firebase token (an expired
//    token made the server silently ignore the socket, so no updates arrived)
//    and re-joins every group room a screen is still showing;
//  - coming back to the foreground or getting the network back triggers a
//    "resync" so open screens refetch whatever they missed meanwhile.
const socket = io(API_URL, {
  transports: ["websocket"],
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
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

// ── Group rooms, ref-counted ────────────────────────────────────────────────
// Several screens can watch the same group at once (group screen + its chat
// pushed on top). Only the last one to close actually leaves the room -
// otherwise closing the chat silently stopped live updates on the group screen.
const groupRooms = new Map(); // groupId -> number of screens watching it

export const joinGroupRoom = (groupId) => {
  if (!groupId) return;
  const id = String(groupId);
  groupRooms.set(id, (groupRooms.get(id) || 0) + 1);
  if (socket.connected) socket.emit("joinGroup", id);
};

export const leaveGroupRoom = (groupId) => {
  if (!groupId) return;
  const id = String(groupId);
  const left = (groupRooms.get(id) || 0) - 1;
  if (left > 0) {
    groupRooms.set(id, left);
    return;
  }
  groupRooms.delete(id);
  if (socket.connected) socket.emit("leaveGroup", id);
};

// ── Resync: "you may have missed updates, refetch" ──────────────────────────
const resyncListeners = new Set();
export const onResync = (fn) => {
  resyncListeners.add(fn);
  return () => resyncListeners.delete(fn);
};
const emitResync = (reason) => {
  for (const fn of [...resyncListeners]) {
    try { fn(reason); } catch { /* one screen failing must not stop the rest */ }
  }
};

let hasConnectedBefore = false;
socket.on("connect", async () => {
  const token = await _getToken();
  if (!token || !socket.connected) return;
  socket.emit("register", token);
  // Rooms are per-connection on the server: re-join after every reconnect.
  // (The server queues these until "register" has been verified.)
  for (const id of groupRooms.keys()) socket.emit("joinGroup", id);
  if (hasConnectedBefore) emitResync("reconnect");
  hasConnectedBefore = true;
});

export const connectSocket = async () => {
  const token = await _getToken();
  if (!token) return;

  if (socket.connected) {
    // Re-register with the latest token (handles token refresh)
    socket.emit("register", token);
    return;
  }
  // `active` is true while socket.io is already (re)connecting on its own.
  if (!socket.active) socket.connect();
};

export const disconnectSocket = () => {
  if (socket.connected || socket.active) {
    socket.disconnect();
  }
};

// Call this after a Firebase token refresh so the server knows the new identity
export const reconnectSocket = async () => {
  disconnectSocket();
  await connectSocket();
};

// ── Foreground / background ─────────────────────────────────────────────────
// While the app is in the background the OS freezes JS and usually kills the
// connection without telling us, so the socket can look "connected" for up to
// a minute after coming back while receiving nothing. After a real background
// stint, start a clean connection (which triggers a resync on connect);
// after a short one, just refetch.
const STALE_AFTER_MS = 15000;
let backgroundedAt = null;
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "background" || state === "inactive") {
      if (backgroundedAt == null) backgroundedAt = Date.now();
      return;
    }
    if (state !== "active") return;
    const away = backgroundedAt == null ? 0 : Date.now() - backgroundedAt;
    backgroundedAt = null;
    if (!hasConnectedBefore) return; // never connected yet - nothing to catch up on
    if (away > STALE_AFTER_MS && socket.connected) {
      socket.disconnect();
      socket.connect();
    } else if (!socket.connected) {
      connectSocket();
    } else {
      emitResync("foreground");
    }
  });
}

export default socket;
