import { useModalBackdropPadding } from "@/hooks/useSafeSpacing";
import { PillButton, RoundButton, useDesign } from "@/components/ui/Design";
import { TYPE } from "@/constants/design";
import { Loader } from "@/components/Loader";
import { api } from "@/lib/api";
import { Alert } from "@/lib/alert";
import { WEB_URL } from "@/lib/config";
import { groupTypeMeta } from "@/lib/groupPresets";
import * as Clipboard from "expo-clipboard";
import GroupTypeIcon from "@/components/group/GroupTypeIcon";
import { AlertCircle, Check, Clock, Copy, Link2, MessageCircle, RefreshCw, Share2, ShieldCheck, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Linking, Modal, Pressable, Share, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ui/Typography";

/**
 * Invite sheet (same as web): the 6-character code big and easy to read out,
 * the link to share, and the safety info (expiry, approval, new code).
 */
export default function InviteModal({ groupId, visible, onClose }) {
    const { colors, t } = useDesign();
    const backdropPadding = useModalBackdropPadding(20);
    const styles = getStyles(colors, t);

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [copied, setCopied] = useState(null);
    const [resetting, setResetting] = useState(false);

    useEffect(() => {
        if (!visible || !groupId) return;
        let alive = true;
        setLoading(true);
        setErrorMsg("");
        api.post(`/groups/${groupId}/invite`)
            .then((res) => { if (alive) setData(res.data); })
            .catch((err) => {
                if (!alive) return;
                const msg = err?.response?.data?.message || "";
                setErrorMsg(msg.includes("Only creator") ? "Only the group creator can share invites." : "Couldn't create an invite. Please try again.");
            })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [visible, groupId]);

    const code = data?.inviteCode || "";
    const joinLink = data?.joinLink || (code ? `${WEB_URL}/join/${code}` : "");
    const meta = groupTypeMeta(data?.groupType);
    const shareText = `Join "${data?.groupName || "my group"}" on SplitEase to split expenses. Code: ${code} - or tap: ${joinLink}`;

    const copy = async (what) => {
        try {
            await Clipboard.setStringAsync(what === "code" ? code : joinLink);
            setCopied(what);
            setTimeout(() => setCopied(null), 1800);
        } catch {
            shareLink();
        }
    };
    const shareLink = async () => {
        try { await Share.share({ message: shareText, title: "SplitEase invite" }); } catch { /* cancelled */ }
    };
    const shareWhatsApp = () =>
        Linking.openURL(`https://wa.me/?text=${encodeURIComponent(shareText)}`).catch(() => shareLink());

    const resetLink = () =>
        Alert.alert("Make a new code?", "The current code and link will stop working.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "New code",
                style: "destructive",
                onPress: async () => {
                    try {
                        setResetting(true);
                        const res = await api.post(`/groups/${groupId}/invite/reset`);
                        setData((d) => ({ ...d, ...res.data }));
                    } catch {
                        Alert.alert("Couldn't reset the code", "Please try again.");
                    } finally {
                        setResetting(false);
                    }
                },
            },
        ]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={[styles.overlay, backdropPadding]} onPress={onClose}>
                <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                    {/* Header: which group */}
                    <View style={styles.header}>
                        <GroupTypeIcon type={data?.groupType} size={44} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.title} numberOfLines={1}>Invite to {data?.groupName || "group"}</Text>
                            <Text style={styles.muted}>
                                {data ? `${meta.label} · ${data.memberCount} member${data.memberCount !== 1 ? "s" : ""}` : "Share the code or link"}
                            </Text>
                        </View>
                        <RoundButton onPress={onClose} label="Close" size={38}>
                            <X size={17} color={colors.text} />
                        </RoundButton>
                    </View>

                    {loading ? (
                        <View style={styles.center}>
                            <Loader size={28} />
                            <Text style={styles.muted}>Creating invite…</Text>
                        </View>
                    ) : errorMsg ? (
                        <View style={styles.center}>
                            <AlertCircle size={24} color={colors.error} />
                            <Text style={styles.errorText}>{errorMsg}</Text>
                        </View>
                    ) : (
                        <>
                            {/* The code */}
                            <TouchableOpacity style={styles.codeCard} onPress={() => copy("code")} activeOpacity={0.8}
                                accessibilityLabel={`Invite code ${code.split("").join(" ")}. Tap to copy`}>
                                <Text style={styles.codeLabel}>INVITE CODE</Text>
                                <View style={styles.codeRow}>
                                    {code.split("").map((ch, i) => (
                                        <View key={i} style={[styles.codeBox, i === 2 && { marginRight: 10 }]}>
                                            <Text style={styles.codeChar}>{ch}</Text>
                                        </View>
                                    ))}
                                </View>
                                <View style={styles.inline}>
                                    {copied === "code" ? <Check size={14} color={colors.success} strokeWidth={3} /> : <Copy size={14} color={colors.primary} />}
                                    <Text style={[styles.linkAction, copied === "code" && { color: colors.success }]}>{copied === "code" ? "Copied" : "Tap to copy"}</Text>
                                </View>
                            </TouchableOpacity>

                            {/* The link */}
                            <TouchableOpacity style={styles.linkRow} onPress={() => copy("link")} activeOpacity={0.7} accessibilityLabel="Copy invite link">
                                <Link2 size={15} color={colors.textSecondary} />
                                <Text style={styles.linkText} numberOfLines={1}>{joinLink.replace(/^https?:\/\//, "")}</Text>
                                {copied === "link" ? <Check size={16} color={colors.success} strokeWidth={3} /> : <Copy size={16} color={colors.textSecondary} />}
                            </TouchableOpacity>

                            <View style={styles.actionsRow}>
                                <PillButton variant="secondary" label="WhatsApp" icon={<MessageCircle size={16} color="#25D366" />}
                                    onPress={shareWhatsApp} style={styles.actionBtn} />
                                <PillButton variant="primary" label="Share" icon={<Share2 size={16} color={t.onInk} />}
                                    onPress={shareLink} style={styles.actionBtn} />
                            </View>

                            {/* Safety */}
                            <View style={styles.metaRow}>
                                <View style={{ gap: 4, flex: 1 }}>
                                    {data?.expiresAt ? (
                                        <View style={styles.inline}>
                                            <Clock size={12} color={colors.textSecondary} />
                                            <Text style={styles.meta}>
                                                Expires {new Date(data.expiresAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                                            </Text>
                                        </View>
                                    ) : null}
                                    <View style={styles.inline}>
                                        <ShieldCheck size={12} color={colors.textSecondary} />
                                        <Text style={styles.meta}>{data?.joinApproval ? "You approve each join" : "Anyone with the code can join"}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={resetLink} disabled={resetting} style={styles.inline} accessibilityRole="button">
                                    <RefreshCw size={13} color={colors.error} />
                                    <Text style={[styles.meta, { color: colors.error, fontWeight: "700" }]}>{resetting ? "…" : "New code"}</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const getStyles = (colors, t) => StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", paddingHorizontal: 18 },
    sheet: {
        width: "100%", maxWidth: 420, backgroundColor: colors.background, borderRadius: 28,
        borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline, padding: 18, gap: 16,
    },
    header: { flexDirection: "row", alignItems: "center", gap: 12 },
    groupIcon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
    title: { ...TYPE.sectionTitle, color: colors.text },
    muted: { ...TYPE.secondary, color: colors.textSecondary },
    center: { alignItems: "center", gap: 10, paddingVertical: 28 },
    errorText: { fontSize: 14, color: colors.text, textAlign: "center" },

    codeCard: {
        alignItems: "center", gap: 12, paddingVertical: 16, borderRadius: 22,
        backgroundColor: t.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline,
    },
    codeLabel: { ...TYPE.label, fontSize: 11, letterSpacing: 2, color: colors.textSecondary },
    codeRow: { flexDirection: "row", gap: 6 },
    codeBox: {
        width: 40, height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center",
        backgroundColor: t.surfaceAlt, borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline,
    },
    codeChar: { fontSize: 26, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"] },
    inline: { flexDirection: "row", alignItems: "center", gap: 5 },
    linkAction: { fontSize: 12.5, fontWeight: "700", color: colors.primary },

    linkRow: {
        flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: t.surface,
        borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
    },
    linkText: { flex: 1, fontSize: 13, color: colors.textSecondary },
    actionsRow: { flexDirection: "row", gap: 10 },
    actionBtn: { flex: 1 },
    metaRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingTop: 2 },
    meta: { fontSize: 12, color: colors.textSecondary },
});
