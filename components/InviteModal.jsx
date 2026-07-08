import { useTheme } from "@/context/ThemeContext";
import { Loader } from "@/components/Loader";
import { api } from "@/lib/api";
import { WEB_URL } from "@/lib/config";
import * as Clipboard from "expo-clipboard";
import {
    AlertCircle,
    Check,
    Copy,
    Link2,
    MessageCircle,
    Share2,
    X,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
    Linking,
    Modal,
    Pressable,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const SHARE_TEXT = "Join my group on SplitEase and let's split expenses easily!";

export default function InviteModal({ groupId, visible, onClose }) {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const [loading, setLoading] = useState(true);
    const [inviteCode, setInviteCode] = useState("");
    const [joinLink, setJoinLink] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!visible || !groupId) return;
        let alive = true;
        const fetchInvite = async () => {
            setLoading(true);
            setErrorMsg("");
            try {
                const res = await api.post(`/groups/${groupId}/invite`);
                if (!alive) return;
                const data = res.data || {};
                const code =
                    data.inviteCode ||
                    (data.joinLink || "").split("/join/").pop().split("?")[0] ||
                    "";
                setInviteCode(code);
                setJoinLink(data.joinLink || `${WEB_URL}/join/${code}`);
            } catch (err) {
                if (!alive) return;
                const msg = err?.response?.data?.message || "";
                setErrorMsg(
                    msg.includes("Only creator")
                        ? "Only the group creator can generate invite links."
                        : "Failed to generate invite. Please try again."
                );
            } finally {
                if (alive) setLoading(false);
            }
        };
        fetchInvite();
        return () => {
            alive = false;
        };
    }, [visible, groupId]);

    const copyLink = async () => {
        if (!joinLink) return;
        try {
            await Clipboard.setStringAsync(joinLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            shareLink();
        }
    };

    const shareLink = async () => {
        if (!joinLink) return;
        try {
            await Share.share({ message: `${SHARE_TEXT} ${joinLink}`, title: "SplitEase invite" });
        } catch {
            // cancelled
        }
    };

    const shareWhatsApp = () => {
        if (!joinLink) return;
        const url = `https://wa.me/?text=${encodeURIComponent(`${SHARE_TEXT} ${joinLink}`)}`;
        Linking.openURL(url).catch(() => shareLink());
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.header}>
                        <View style={styles.headerTitleRow}>
                            <Link2 size={18} color={colors.primary} />
                            <Text style={styles.title}>Invite to group</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                            <X size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.center}>
                            <Loader size={28} />
                            <Text style={styles.muted}>Generating invite…</Text>
                        </View>
                    ) : errorMsg ? (
                        <View style={styles.center}>
                            <AlertCircle size={24} color={colors.error} />
                            <Text style={styles.errorText}>{errorMsg}</Text>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.subtitle}>
                                Share this code or link. Anyone who joins is added to the group instantly.
                            </Text>

                            <View style={styles.codeTicket}>
                                <Text style={styles.codeLabel}>INVITE CODE</Text>
                                <Text style={styles.codeText}>{inviteCode}</Text>
                            </View>

                            <TouchableOpacity style={styles.linkRow} onPress={copyLink} activeOpacity={0.7}>
                                <Text style={styles.linkText} numberOfLines={1}>{joinLink}</Text>
                                {copied ? (
                                    <Check size={16} color={colors.success} strokeWidth={3} />
                                ) : (
                                    <Copy size={16} color={colors.textSecondary} />
                                )}
                            </TouchableOpacity>

                            <View style={styles.actionsRow}>
                                <TouchableOpacity style={[styles.actionBtn, styles.whatsappBtn]} onPress={shareWhatsApp} activeOpacity={0.85}>
                                    <MessageCircle size={15} color="#FFFFFF" />
                                    <Text style={styles.actionTextLight}>WhatsApp</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionBtn, styles.primaryBtn]} onPress={shareLink} activeOpacity={0.85}>
                                    <Share2 size={15} color="#FFFFFF" />
                                    <Text style={styles.actionTextLight}>Share</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const getStyles = (colors) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    sheet: {
        width: "100%",
        maxWidth: 420,
        backgroundColor: colors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 20,
        gap: 16,
    },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    title: { fontSize: 17, fontWeight: "700", color: colors.text },
    closeBtn: { padding: 4 },
    center: { alignItems: "center", gap: 10, paddingVertical: 24 },
    muted: { fontSize: 13, color: colors.textSecondary },
    errorText: { fontSize: 14, color: colors.text, textAlign: "center" },
    subtitle: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
    codeTicket: {
        borderRadius: 14,
        borderWidth: 2,
        borderStyle: "dashed",
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight,
        paddingVertical: 16,
        alignItems: "center",
    },
    codeLabel: { fontSize: 10, letterSpacing: 2, fontWeight: "800", color: colors.textSecondary },
    codeText: { fontSize: 28, fontWeight: "800", letterSpacing: 4, color: colors.text, marginTop: 4 },
    linkRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: colors.inputBackground,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    linkText: { flex: 1, fontSize: 13, color: colors.text },
    actionsRow: { flexDirection: "row", gap: 10 },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 12,
        borderRadius: 12,
    },
    whatsappBtn: { backgroundColor: "#25D366" },
    primaryBtn: { backgroundColor: colors.primary },
    actionTextLight: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
});
