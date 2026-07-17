import { useTheme } from "@/context/ThemeContext";
import { Loader } from "@/components/Loader";
import { api } from "@/lib/api";
import { WEB_URL } from "@/lib/config";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import {
    AlertCircle,
    Check,
    CheckCircle2,
    Clock,
    Coins,
    Copy,
    Gift,
    MessageCircle,
    Share2,
    Sparkles,
    Trophy,
    Users,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
    Image,
    Linking,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const SHARE_MESSAGE =
    "Split expenses with friends, hassle-free. Join me on SplitEase and we both earn coins instantly!";

const STATUS_META = {
    pending: { label: "Pending", Icon: Clock, color: "#F59E0B" },
    qualified: { label: "Qualified", Icon: Clock, color: "#0EA5E9" },
    rewarded: { label: "Rewarded", Icon: CheckCircle2, color: "#10B981" },
    cancelled: { label: "Cancelled", Icon: AlertCircle, color: "#9CA3AF" },
};

export default function ReferralSection() {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [copied, setCopied] = useState(false);

    const referralLink = data?.referralCode
        ? `${WEB_URL}/invite/${data.referralCode}`
        : "";

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(false);
            const res = await api.get("/referrals/me");
            setData(res.data);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    const copyCode = async () => {
        if (!data?.referralCode) return;
        try {
            await Clipboard.setStringAsync(data.referralCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            // clipboard unavailable — share instead
            shareLink();
        }
    };

    const shareLink = async () => {
        if (!referralLink) return;
        try {
            await Share.share({
                title: "Join me on SplitEase",
                message: `${SHARE_MESSAGE} ${referralLink}`,
            });
        } catch {
            // user cancelled — no-op
        }
    };

    const shareWhatsApp = () => {
        if (!referralLink) return;
        const url = `https://wa.me/?text=${encodeURIComponent(`${SHARE_MESSAGE} ${referralLink}`)}`;
        Linking.openURL(url).catch(() => shareLink());
    };

    if (loading) {
        return (
            <View style={styles.loadingCard}>
                <Loader size={28} />
            </View>
        );
    }

    if (error || !data) {
        return (
            <View style={styles.errorCard}>
                <AlertCircle size={24} color={colors.textSecondary} />
                <Text style={styles.errorText}>Couldn{"'"}t load your referral details.</Text>
                <TouchableOpacity onPress={fetchData} activeOpacity={0.7}>
                    <Text style={styles.retryText}>Try again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const {
        referralCode,
        coins,
        totalEarned,
        successfulReferrals,
        invited = [],
        eliteClub,
    } = data;

    const tierBasis = eliteClub?.basisCoins ?? coins;
    const tierProgressPct = eliteClub?.nextTier
        ? Math.min(100, Math.round((tierBasis / eliteClub.nextTier.minCoins) * 100))
        : 100;

    return (
        <View style={{ gap: 16 }}>
            {/* Coin wallet */}
            <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                    <Gift size={16} color={colors.primary} />
                    <Text style={styles.cardTitle}>Referrals & Rewards</Text>
                </View>

                <LinearGradient
                    colors={["#1d1709", "#231a08", "#2e2006"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.walletCard}
                >
                    <View style={styles.walletRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.walletLabel}>COIN BALANCE</Text>
                            <View style={styles.walletAmountRow}>
                                <Text style={styles.walletAmount}>{coins ?? 0}</Text>
                                <Text style={styles.walletUnit}>coins</Text>
                            </View>
                            <View style={styles.walletStatsRow}>
                                <Text style={styles.walletStat}>
                                    <Text style={styles.walletStatBold}>{totalEarned ?? 0}</Text> lifetime
                                </Text>
                                <Text style={styles.walletStat}>
                                    <Text style={styles.walletStatBold}>{successfulReferrals ?? 0}</Text>{" "}
                                    referral{successfulReferrals === 1 ? "" : "s"}
                                </Text>
                            </View>
                        </View>

                        <LinearGradient
                            colors={["#FDE68A", "#F59E0B", "#B45309"]}
                            style={styles.medallion}
                        >
                            <Coins size={28} color="#78350F" />
                        </LinearGradient>
                    </View>

                    {eliteClub?.tier && (
                        <View style={styles.walletTierRow}>
                            <Trophy size={11} color="#FCD34D" />
                            <Text style={styles.walletTierText}>{eliteClub.tier.name} member</Text>
                        </View>
                    )}
                </LinearGradient>

                {/* Referral code ticket */}
                <View style={styles.ticket}>
                    <Text style={styles.ticketLabel}>YOUR REFERRAL CODE</Text>
                    <TouchableOpacity onPress={copyCode} style={styles.ticketCodeRow} activeOpacity={0.7}>
                        <Text style={styles.ticketCode}>{referralCode}</Text>
                        {copied ? (
                            <Check size={16} color={colors.success} strokeWidth={3} />
                        ) : (
                            <Copy size={15} color={colors.textSecondary} />
                        )}
                    </TouchableOpacity>
                    <Text style={styles.ticketHint}>
                        {copied ? "Copied to clipboard!" : "Tap the code to copy"}
                    </Text>
                </View>

                {/* Share actions */}
                <View style={styles.shareRow}>
                    <TouchableOpacity style={[styles.shareBtn, styles.whatsappBtn]} onPress={shareWhatsApp} activeOpacity={0.85}>
                        <MessageCircle size={14} color="#FFFFFF" />
                        <Text style={styles.shareBtnTextLight}>WhatsApp</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.shareBtn, styles.copyBtn]} onPress={copyCode} activeOpacity={0.85}>
                        {copied ? (
                            <Check size={14} color={colors.success} strokeWidth={3} />
                        ) : (
                            <Copy size={14} color={colors.text} />
                        )}
                        <Text style={styles.shareBtnTextDark}>{copied ? "Copied" : "Copy"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.shareBtn, styles.primaryShareBtn]} onPress={shareLink} activeOpacity={0.85}>
                        <Share2 size={14} color="#FFFFFF" />
                        <Text style={styles.shareBtnTextLight}>Share</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.shareNote}>
                    The moment a friend joins with your link, you both earn coins instantly.
                </Text>
            </View>

            {/* Elite Club */}
            {eliteClub?.tier && (
                <View style={styles.card}>
                    <View style={styles.cardTitleRow}>
                        <Trophy size={16} color={colors.warning} />
                        <Text style={styles.cardTitle}>Elite Club</Text>
                    </View>

                    <View style={styles.eliteHeaderRow}>
                        <View style={styles.rowCenter}>
                            <Sparkles size={14} color={colors.warning} />
                            <Text style={styles.eliteTierName}>{eliteClub.tier.name}</Text>
                        </View>
                        {eliteClub.nextTier && (
                            <Text style={styles.eliteToNext}>
                                {eliteClub.coinsToNext} coins to {eliteClub.nextTier.name}
                            </Text>
                        )}
                    </View>

                    {eliteClub.nextTier && (
                        <View style={styles.progressTrack}>
                            <LinearGradient
                                colors={["#06B6D4", "#F59E0B"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.progressFill, { width: `${tierProgressPct}%` }]}
                            />
                        </View>
                    )}

                    {eliteClub.tier.perks?.length > 0 && (
                        <View style={styles.perksRow}>
                            {eliteClub.tier.perks.map((perk) => (
                                <View key={perk} style={styles.perkChip}>
                                    <Text style={styles.perkText}>{perk}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            )}

            {/* Invited friends */}
            <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                    <Users size={16} color={colors.primary} />
                    <Text style={styles.cardTitle}>Invited Friends</Text>
                </View>

                {invited.length === 0 ? (
                    <View style={styles.invitedEmpty}>
                        <View style={styles.invitedEmptyIcon}>
                            <Gift size={24} color={colors.primary} />
                        </View>
                        <Text style={styles.invitedEmptyTitle}>You haven{"'"}t invited anyone yet</Text>
                        <Text style={styles.invitedEmptyDesc}>
                            Share your link with friends — you{"'"}ll both earn coins instantly when they join.
                        </Text>
                        <TouchableOpacity style={styles.invitedShareBtn} onPress={shareLink} activeOpacity={0.85}>
                            <Share2 size={13} color="#FFFFFF" />
                            <Text style={styles.invitedShareText}>Share your link</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View>
                        {invited.map((ref) => {
                            const meta = STATUS_META[ref.status] || STATUS_META.pending;
                            const StatusIcon = meta.Icon;
                            return (
                                <View key={ref.id} style={styles.invitedItem}>
                                    <View style={styles.invitedAvatar}>
                                        {ref.friend?.photoURL ? (
                                            <Image source={{ uri: ref.friend.photoURL }} style={styles.invitedAvatarImg} />
                                        ) : (
                                            <Users size={16} color={colors.textSecondary} />
                                        )}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <View style={styles.invitedNameRow}>
                                            <Text style={styles.invitedName} numberOfLines={1}>
                                                {ref.friend?.name || "Unknown user"}
                                            </Text>
                                            <View style={[styles.statusBadge, { backgroundColor: meta.color + "1A" }]}>
                                                <StatusIcon size={10} color={meta.color} />
                                                <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.invitedJoined}>
                                            Joined{" "}
                                            {ref.friend?.joinedAt
                                                ? new Date(ref.friend.joinedAt).toLocaleDateString()
                                                : "—"}
                                        </Text>
                                        {ref.status === "rewarded" && (
                                            <Text style={styles.invitedReward}>
                                                +{ref.referrerRewardAmount} coins earned
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </View>
        </View>
    );
}

const getStyles = (colors) => StyleSheet.create({
    loadingCard: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        padding: 32,
        alignItems: "center",
    },
    errorCard: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        padding: 24,
        alignItems: "center",
        gap: 8,
    },
    errorText: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
    retryText: { fontSize: 13, fontWeight: "700", color: colors.primary },

    card: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        padding: 18,
        gap: 16,
    },
    cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text },

    walletCard: {
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: "rgba(245,158,11,0.3)",
        overflow: "hidden",
    },
    walletRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    walletLabel: { fontSize: 10, letterSpacing: 2, fontWeight: "800", color: "rgba(253,230,138,0.7)" },
    walletAmountRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 4 },
    walletAmount: { fontSize: 38, fontWeight: "800", color: "#FFFBEB" },
    walletUnit: { fontSize: 12, fontWeight: "700", color: "rgba(253,230,138,0.6)", textTransform: "uppercase" },
    walletStatsRow: { flexDirection: "row", gap: 14, marginTop: 10, flexWrap: "wrap" },
    walletStat: { fontSize: 11, color: "rgba(254,243,199,0.55)", fontWeight: "500" },
    walletStatBold: { color: "rgba(254,243,199,0.9)", fontWeight: "800" },
    medallion: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 4,
        borderColor: "rgba(252,211,77,0.2)",
    },
    walletTierRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14 },
    walletTierText: { fontSize: 11, fontWeight: "700", color: "rgba(253,230,138,0.7)" },

    ticket: {
        borderRadius: 16,
        borderWidth: 2,
        borderStyle: "dashed",
        borderColor: "rgba(6,182,212,0.3)",
        backgroundColor: "rgba(6,182,212,0.04)",
        paddingVertical: 16,
        paddingHorizontal: 14,
        alignItems: "center",
    },
    ticketLabel: { fontSize: 10, letterSpacing: 2, fontWeight: "800", color: colors.textSecondary },
    ticketCodeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
    ticketCode: { fontSize: 26, fontWeight: "800", letterSpacing: 6, color: colors.text },
    ticketHint: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },

    shareRow: { flexDirection: "row", gap: 8 },
    shareBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 11,
        borderRadius: 12,
    },
    whatsappBtn: { backgroundColor: "#25D366" },
    copyBtn: { borderWidth: 1, borderColor: colors.border },
    primaryShareBtn: { backgroundColor: colors.primary },
    shareBtnTextLight: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
    shareBtnTextDark: { fontSize: 12, fontWeight: "700", color: colors.text },
    shareNote: { fontSize: 11, color: colors.textSecondary, textAlign: "center", marginTop: -4 },

    eliteHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    rowCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
    eliteTierName: { fontSize: 14, fontWeight: "700", color: colors.text },
    eliteToNext: { fontSize: 12, color: colors.textSecondary },
    progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.inputBackground, overflow: "hidden" },
    progressFill: { height: "100%", borderRadius: 4 },
    perksRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    perkChip: {
        backgroundColor: colors.inputBackground,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    perkText: { fontSize: 11, fontWeight: "500", color: colors.text },

    invitedEmpty: { alignItems: "center", gap: 8, paddingVertical: 16 },
    invitedEmptyIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primaryLight,
        justifyContent: "center",
        alignItems: "center",
    },
    invitedEmptyTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
    invitedEmptyDesc: { fontSize: 12, color: colors.textSecondary, textAlign: "center", maxWidth: 260 },
    invitedShareBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 10,
        marginTop: 4,
    },
    invitedShareText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },

    invitedItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    invitedAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.inputBackground,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    invitedAvatarImg: { width: "100%", height: "100%" },
    invitedNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    invitedName: { fontSize: 14, fontWeight: "600", color: colors.text, flexShrink: 1 },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    statusText: { fontSize: 10, fontWeight: "700" },
    invitedJoined: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    invitedReward: { fontSize: 11, color: colors.success, fontWeight: "700", marginTop: 2 },
});
