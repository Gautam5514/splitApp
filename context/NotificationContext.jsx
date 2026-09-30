import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import socket, { connectSocket } from "@/lib/socket";
import * as Notifications from "expo-notifications";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { AppState, Platform } from "react-native";

const NotificationContext = createContext({
    notifications: [],
    hasUnread: false,
    refresh: () => {},
    markAllAsRead: () => {},
    markOneAsRead: () => {},
});

const isMongoObjectId = (value) =>
    typeof value === "string" && /^[a-f\d]{24}$/i.test(value);

export function NotificationProvider({ children }) {
    const { token } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [hasUnread, setHasUnread] = useState(false);
    const seenRef = useRef(new Set());

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await api.get("/notifications");
            const list = res.data || [];
            setNotifications(list);
            setHasUnread(list.some((n) => !n.isRead));
        } catch (err) {
            // Non-critical — header just shows no badge.
            console.log("Failed to load notifications:", err?.message);
        }
    }, []);

    // Initial load + reload when auth changes.
    useEffect(() => {
        if (!token) {
            setNotifications([]);
            setHasUnread(false);
            return;
        }
        fetchNotifications();
    }, [token, fetchNotifications]);

    // Re-fetch when app returns to the foreground.
    useEffect(() => {
        if (!token) return;
        const sub = AppState.addEventListener("change", (state) => {
            if (state === "active") fetchNotifications();
        });
        return () => sub.remove();
    }, [token, fetchNotifications]);

    // Push token registration is owned solely by usePushNotifications (mounted
    // once in app/_layout.jsx) — a duplicate call used to live here too, and
    // the two racing registrations were creating two token entries per device
    // in the backend, causing every push to be delivered twice.

    // Keep the in-app bell in sync when a system notification arrives or is tapped.
    useEffect(() => {
        if (Platform.OS === "web") return;
        const received = Notifications.addNotificationReceivedListener(() => {
            setHasUnread(true);
            fetchNotifications();
        });
        const response = Notifications.addNotificationResponseReceivedListener(() => {
            fetchNotifications();
        });
        return () => {
            received.remove();
            response.remove();
        };
    }, [fetchNotifications]);

    // Real-time socket notifications (shares the app-wide socket instance).
    useEffect(() => {
        if (!token) return;
        connectSocket();

        const onNotification = (notif) => {
            const key = notif._id || notif.message;
            if (seenRef.current.has(key)) return;
            seenRef.current.add(key);
            setTimeout(() => seenRef.current.delete(key), 3500);

            setNotifications((prev) => [notif, ...prev]);
            setHasUnread(true);
        };

        socket.on("notification", onNotification);
        return () => socket.off("notification", onNotification);
    }, [token]);

    const markAllAsRead = useCallback(async () => {
        // Optimistic clear.
        setNotifications([]);
        setHasUnread(false);
        try {
            await api.put("/notifications/mark-read", {});
        } catch (err) {
            console.log("Failed to mark all read:", err?.message);
        }
    }, []);

    const markOneAsRead = useCallback(async (id) => {
        setNotifications((prev) => {
            const next = prev.filter((n) => n._id !== id);
            setHasUnread(next.some((n) => !n.isRead));
            return next;
        });
        if (!isMongoObjectId(id)) return;
        try {
            await api.put(`/notifications/${id}/read`, {});
        } catch (err) {
            console.log("Failed to mark read:", err?.message);
        }
    }, []);

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                hasUnread,
                refresh: fetchNotifications,
                markAllAsRead,
                markOneAsRead,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    return useContext(NotificationContext);
}
