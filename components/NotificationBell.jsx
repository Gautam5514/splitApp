import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNotifications } from "@/context/NotificationContext";
import { IconCircle, ListRow, RoundButton, useDesign } from "@/components/ui/Design";
import { TYPE } from "@/constants/design";
import { router } from "expo-router";
import {
    Bell,
    BellOff,
    CheckCheck,
    ReceiptText,
    UsersRound,
    X,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { Text } from "@/components/ui/Typography";

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
    const { colors, t } = useDesign();
    const insets = useSafeAreaInsets();
    const { notifications, hasUnread, markAllAsRead, markOneAsRead } =
        useNotifications();
    const [open, setOpen] = useState(false);
    const styles = getStyles(colors, t);

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    const handlePress = useCallback(
        (n) => {
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
        },
        [markOneAsRead]
    );

    const renderNotification = useCallback(
        ({ item: n }) => {
            const { Icon, color } = metaFor(n.type, colors);
            return (
                <ListRow
                    onPress={() => handlePress(n)}
                    leading={
                        <IconCircle size={44} tint={color + "1A"}>
                            <Icon size={18} color={color} />
                        </IconCircle>
                    }
                    title={n.message}
                    numberOfLines={2}
                    subtitle={timeAgo(n.createdAt)}
                    trailing={!n.isRead ? <View style={styles.unreadDot} /> : null}
                />
            );
        },
        [colors, styles, handlePress]
    );

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
                <Pressable style={[styles.overlay, { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 16 }]} onPress={() => setOpen(false)}>
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
                                <RoundButton onPress={() => setOpen(false)} label="Close" size={40}>
                                    <X size={18} color={colors.text} />
                                </RoundButton>
                            </View>
                        </View>

                        {notifications.length === 0 ? (
                            <View style={styles.empty}>
                                <BellOff size={28} color={colors.textSecondary} />
                                <Text style={styles.emptyText}>You{"'"}re all caught up</Text>
                            </View>
                        ) : (
                            <FlatList
                                style={styles.list}
                                data={notifications}
                                keyExtractor={(n, i) => n._id || String(i)}
                                renderItem={renderNotification}
                                showsVerticalScrollIndicator={false}
                                initialNumToRender={10}
                                windowSize={7}
                                removeClippedSubviews
                            />
                        )}
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}

const getStyles = (colors, t) => StyleSheet.create({
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
        backgroundColor: t.ink,
        alignItems: "center",
        justifyContent: "center",
    },
    badgeText: {
        color: t.onInk,
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
        // Use the solid card colour, not t.surface — in dark mode t.surface is
        // only 7%-opaque white, so as a floating modal panel the dimmed page
        // behind it bleeds through and the text overlaps. colors.card is a
        // fully opaque elevated surface in both themes.
        backgroundColor: colors.card,
        borderRadius: 28,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: t.outline,
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
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    panelTitle: {
        ...TYPE.sectionTitle,
        color: colors.text,
    },
    panelHeaderActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
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
        paddingBottom: 8,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: t.ink,
    },
});
