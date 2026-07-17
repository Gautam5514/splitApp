import { useNotifications } from "@/context/NotificationContext";
import { useTheme } from "@/context/ThemeContext";
import { router } from "expo-router";
import {
    Bell,
    BellOff,
    CheckCheck,
    ReceiptText,
    UsersRound,
    X,
} from "lucide-react-native";
import { useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const timeAgo = (value) => {
    if (!value) return "Just now";
    const diff = Date.now() - new Date(value).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "Just now";
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}d ago`;
    return new Date(value).toLocaleDateString();
};

const metaFor = (type, colors) => {
    if (type === "expense") {
        return { Icon: ReceiptText, color: colors.success };
    }
    return { Icon: UsersRound, color: colors.primary };
};

export default function NotificationBell({ iconColor }) {
    const { colors } = useTheme();
    const { notifications, hasUnread, markAllAsRead, markOneAsRead } =
        useNotifications();
    const [open, setOpen] = useState(false);
    const styles = getStyles(colors);

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    const handlePress = (n) => {
        setOpen(false);
        markOneAsRead(n._id);
        const link = n.link || "";
        if (link.startsWith("/groups/")) {
            router.push(link);
        } else if (link && link !== "/dashboard") {
            router.push(link);
        } else {
            router.push("/(tabs)/home");
        }
    };

    return (
        <>
            <TouchableOpacity
                onPress={() => setOpen(true)}
                style={styles.bellBtn}
                activeOpacity={0.7}
            >
                <Bell size={22} color={iconColor || colors.textSecondary} />
                {hasUnread && (
                    <View style={styles.badge}>
                        {unreadCount > 0 && (
                            <Text style={styles.badgeText}>
                                {unreadCount > 9 ? "9+" : unreadCount}
                            </Text>
                        )}
                    </View>
                )}
            </TouchableOpacity>

            <Modal
                visible={open}
                transparent
                animationType="fade"
                onRequestClose={() => setOpen(false)}
            >
                <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
                    <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.panelHeader}>
                            <Text style={styles.panelTitle}>Notifications</Text>
                            <View style={styles.panelHeaderActions}>
                                {notifications.length > 0 && (
                                    <TouchableOpacity
                                        onPress={markAllAsRead}
                                        style={styles.markAllBtn}
                                        activeOpacity={0.7}
                                    >
                                        <CheckCheck size={14} color={colors.primary} />
                                        <Text style={styles.markAllText}>Mark all read</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    onPress={() => setOpen(false)}
                                    style={styles.closeBtn}
                                    activeOpacity={0.7}
                                >
                                    <X size={18} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {notifications.length === 0 ? (
                            <View style={styles.empty}>
                                <BellOff size={28} color={colors.textSecondary} />
                                <Text style={styles.emptyText}>You{"'"}re all caught up</Text>
                            </View>
                        ) : (
                            <ScrollView
                                style={styles.list}
                                showsVerticalScrollIndicator={false}
                            >
                                {notifications.map((n, i) => {
                                    const { Icon, color } = metaFor(n.type, colors);
                                    return (
                                        <TouchableOpacity
                                            key={n._id || i}
                                            style={styles.item}
                                            onPress={() => handlePress(n)}
                                            activeOpacity={0.7}
                                        >
                                            <View
                                                style={[
                                                    styles.itemIcon,
                                                    { backgroundColor: color + "1A" },
                                                ]}
                                            >
                                                <Icon size={16} color={color} />
                                            </View>
                                            <View style={styles.itemBody}>
                                                <Text style={styles.itemMessage} numberOfLines={2}>
                                                    {n.message}
                                                </Text>
                                                <Text style={styles.itemTime}>
                                                    {timeAgo(n.createdAt)}
                                                </Text>
                                            </View>
                                            {!n.isRead && <View style={styles.unreadDot} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}

const getStyles = (colors) => StyleSheet.create({
    bellBtn: {
        padding: 8,
        position: "relative",
    },
    badge: {
        position: "absolute",
        top: 4,
        right: 4,
        minWidth: 16,
        height: 16,
        paddingHorizontal: 3,
        borderRadius: 8,
        backgroundColor: colors.error,
        alignItems: "center",
        justifyContent: "center",
    },
    badgeText: {
        color: "#FFFFFF",
        fontSize: 9,
        fontWeight: "800",
    },
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.35)",
        justifyContent: "flex-start",
        alignItems: "flex-end",
        paddingTop: 90,
        paddingHorizontal: 12,
    },
    panel: {
        width: "92%",
        maxHeight: "70%",
        backgroundColor: colors.card,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 12,
    },
    panelHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    panelTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.text,
    },
    panelHeaderActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    markAllBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    markAllText: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.primary,
    },
    closeBtn: {
        padding: 4,
    },
    empty: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 48,
        gap: 10,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    list: {
        maxHeight: 420,
    },
    item: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    itemIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    itemBody: {
        flex: 1,
        gap: 3,
    },
    itemMessage: {
        fontSize: 13,
        fontWeight: "500",
        color: colors.text,
        lineHeight: 18,
    },
    itemTime: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
    },
});
