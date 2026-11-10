import { useTheme } from "@/context/ThemeContext";
import { SCREEN_GUTTER } from "@/constants/layout";
import { R, TYPE } from "@/constants/design";
import { Loader } from "@/components/Loader";
import CoinIcon from "@/components/icons/CoinIcon";
import { PillButton, SectionLabel, useDesign } from "@/components/ui/Design";
import { api } from "@/lib/api";
import { WEB_URL } from "@/lib/config";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
    AlertCircle,
    Check,
    CheckCircle2,
    ChevronRight,
    Clock,
    Copy,
    MessageCircle,
    Palette,
    Share2,
    Trophy,
    UserRound,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
    Image,
    Linking,
    Share,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { Text } from "@/components/ui/Typography";

const SHARE_MESSAGE =
    "Split expenses with friends, hassle-free. Join me on SplitEase and we both earn coins instantly!";

const STATUS_META = {
    pending: { label: "Pending", Icon: Clock, color: "#F59E0B" },
    qualified: { label: "Qualified", Icon: Clock, color: "#0EA5E9" },
    rewarded: { label: "Rewarded", Icon: CheckCircle2, color: "#10B981" },
    cancelled: { label: "Cancelled", Icon: AlertCircle, color: "#9CA3AF" },
};

export default function ReferralSection({ refreshKey = 0 }) {
    const { colors } = useTheme();
    const { t } = useDesign();
    const copyTimer = useRef(null);
    const styles = getStyles(colors, t);

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [copied, setCopied] = useState(false);

    const referralLink = data?.referralCode
        ? `${WEB_URL}/invite/${data.referralCode}`
        : "";

    useEffect(() => () => clearTimeout(copyTimer.current), []);

    useEffect(() => {
        // refreshKey > 0 = pull-to-refresh: reload quietly without the spinner.
        fetchData(refreshKey > 0);
    }, [refreshKey]);

    const fetchData = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
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
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            setCopied(true);
            clearTimeout(copyTimer.current);
            copyTimer.current = setTimeout(() => setCopied(false), 1800);
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
            <View style={styles.state}>
                <Loader size={28} />
            </View>
        );
    }

    if (error || !data) {
        return (
            <View style={styles.state}>
                <AlertCircle size={24} color={colors.textSecondary} />
                <Text style={styles.stateText}>Couldn{"'"}t load your referral details.</Text>
                <PillButton variant="secondary" label="Try again" onPress={() => fetchData()} style={styles.stateBtn} />
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
        rewards,
    } = data;

    const tierBasis = eliteClub?.basisCoins ?? coins;
    const tierProgressPct = eliteClub?.nextTier
        ? Math.min(100, Math.round((tierBasis / eliteClub.nextTier.minCoins) * 100))
        : 100;

    return (
        <View>
            {/* The one hero on the page: the coin wallet */}
            <LinearGradient
                colors={["#1d1709", "#231a08", "#2e2006"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.wallet}
            >
                <View style={styles.walletRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.walletLabel}>Coin balance</Text>
                        <Text style={styles.walletAmount}>{coins ?? 0}</Text>
                    </View>
                    <CoinIcon size={64} />
                </View>

                <View style={styles.walletDivider} />

                <View style={styles.walletStats}>
                    <View style={styles.walletStat}>
                        <Text style={styles.walletStatValue}>{totalEarned ?? 0}</Text>
                        <Text style={styles.walletStatLabel}>earned so far</Text>
                    </View>
                    <View style={styles.walletStat}>
                        <Text style={styles.walletStatValue}>{successfulReferrals ?? 0}</Text>
                        <Text style={styles.walletStatLabel}>{successfulReferrals === 1 ? "friend joined" : "friends joined"}</Text>
                    </View>
                    {eliteClub?.tier ? (
                        <View style={styles.walletStat}>
                            <View style={styles.walletTier}>
                                <Trophy size={13} color="#FCD34D" />
                                <Text style={styles.walletStatValue} numberOfLines={1}>{eliteClub.tier.name}</Text>
                            </View>
                            <Text style={styles.walletStatLabel}>your tier</Text>
                        </View>
                    ) : null}
                </View>
            </LinearGradient>

            {/* Code + share */}
            <SectionLabel line>Your code</SectionLabel>
            <View style={styles.section}>
                <TouchableOpacity
                    onPress={copyCode}
                    style={styles.codeRow}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={copied ? "Referral code copied" : `Copy referral code ${referralCode}`}
                >
                    <Text style={styles.code} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{referralCode}</Text>
                    <View style={styles.chip}>
                        {copied ? <Check size={14} color={colors.success} strokeWidth={2.6} /> : <Copy size={14} color={colors.text} />}
                        <Text style={[styles.chipText, copied && { color: colors.success }]}>{copied ? "Copied" : "Copy"}</Text>
                    </View>
                </TouchableOpacity>

                <Text style={styles.note}>
                    {rewards
                        ? `When a friend joins with your link, you get ${rewards.referrerCoins} coins and they get ${rewards.referredCoins}.`
                        : "When a friend joins with your link, you both get coins straight away."}
                </Text>

                <View style={styles.shareRow}>
                    <PillButton
                        style={styles.shareBtn}
                        onPress={shareLink}
                        icon={<Share2 size={16} color={t.onInk} />}
                        label="Share invite"
                    />
                    <PillButton
                        style={styles.shareBtn}
                        variant="secondary"
                        onPress={shareWhatsApp}
                        icon={<MessageCircle size={16} color="#25D366" />}
                        label="WhatsApp"
                    />
                </View>
            </View>

            {/* Elite Club */}
            {eliteClub?.tier && (
                <>
                    <SectionLabel line right={<Text style={styles.headRight}>{eliteClub.tier.name}</Text>}>Elite Club</SectionLabel>
                    <View style={styles.section}>
                        {eliteClub.nextTier ? (
                            <>
                                <View style={styles.progressTrack}>
                                    <View style={[styles.progressFill, { width: `${Math.max(tierProgressPct, 2)}%`, backgroundColor: t.ink }]} />
                                </View>
                                <Text style={styles.note}>
                                    {eliteClub.coinsToNext} coins to {eliteClub.nextTier.name}
                                    {eliteClub.friendsToNext > 0
                                        ? ` · invite ${eliteClub.friendsToNext} more ${eliteClub.friendsToNext === 1 ? "friend" : "friends"}`
                                        : ""}
                                </Text>
                            </>
                        ) : (
                            <Text style={styles.note}>You{"'"}re at the top tier.</Text>
                        )}

                        {eliteClub.tier.perks?.length > 0 && (
                            <View style={styles.perks}>
                                {eliteClub.tier.perks.map((perk) => (
                                    <View key={perk} style={styles.perkRow}>
                                        <Check size={15} color={colors.success} />
                                        <Text style={styles.perkText}>{perk}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                        <TouchableOpacity
                            onPress={() => router.push("/appearance")}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            style={styles.linkRow}
                        >
                            <Palette size={16} color={colors.text} />
                            <Text style={styles.linkText}>Spend coins on accent themes</Text>
                            <ChevronRight size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </>
            )}

            {/* Invited friends */}
            <SectionLabel line right={invited.length > 0 ? <Text style={styles.headRight}>{invited.length}</Text> : null}>
                Invited friends
            </SectionLabel>
            <View style={styles.section}>
                {invited.length === 0 ? (
                    <Text style={styles.note}>
                        No one yet. Share your code above — friends who join will show up here.
                    </Text>
                ) : (
                    invited.map((ref) => {
                        const meta = STATUS_META[ref.status] || STATUS_META.pending;
                        const StatusIcon = meta.Icon;
                        return (
                            <View key={ref.id} style={styles.friend}>
                                <View style={styles.friendAvatar}>
                                    {ref.friend?.photoURL ? (
                                        <Image source={{ uri: ref.friend.photoURL }} style={styles.friendAvatarImg} />
                                    ) : (
                                        <UserRound size={18} color={colors.textSecondary} />
                                    )}
                                </View>
                                <View style={styles.friendText}>
                                    <Text style={styles.friendName} numberOfLines={1}>
                                        {ref.friend?.name || "Unknown user"}
                                    </Text>
                                    <Text style={styles.friendSub} numberOfLines={1}>
                                        {ref.status === "rewarded"
                                            ? `+${ref.referrerRewardAmount} coins earned`
                                            : `Joined ${ref.friend?.joinedAt ? new Date(ref.friend.joinedAt).toLocaleDateString() : "—"}`}
                                    </Text>
                                </View>
                                <View style={styles.status}>
                                    <StatusIcon size={13} color={meta.color} />
                                    <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                                </View>
                            </View>
                        );
                    })
                )}
            </View>
        </View>
    );
}

const getStyles = (colors, t) => StyleSheet.create({
    state: { paddingVertical: 48, paddingHorizontal: SCREEN_GUTTER, alignItems: "center", gap: 12 },
    stateText: { ...TYPE.body, color: colors.textSecondary, textAlign: "center" },
    stateBtn: { paddingHorizontal: 28 },

    // Wallet: the only card on the page
    wallet: {
        marginHorizontal: SCREEN_GUTTER,
        marginBottom: 20,
        borderRadius: R.block,
        padding: 20,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(245,158,11,0.35)",
        overflow: "hidden",
    },
    walletRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    walletLabel: { ...TYPE.secondary, color: "rgba(253,230,138,0.75)" },
    walletAmount: { fontSize: 44, fontWeight: "700", color: "#FFFBEB", letterSpacing: -1, marginTop: 2 },
    walletDivider: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(253,230,138,0.22)", marginVertical: 16 },
    walletStats: { flexDirection: "row", gap: 12 },
    walletStat: { flex: 1, minWidth: 0, gap: 2 },
    walletTier: { flexDirection: "row", alignItems: "center", gap: 5 },
    walletStatValue: { fontSize: 16.5, fontWeight: "700", color: "#FFFBEB", flexShrink: 1 },
    walletStatLabel: { ...TYPE.meta, color: "rgba(254,243,199,0.6)" },

    // Sections sit straight on the canvas under a lined heading (no cards)
    section: { paddingHorizontal: SCREEN_GUTTER, gap: 12, marginBottom: 18 },
    headRight: { ...TYPE.secondary, color: colors.textSecondary },
    note: { ...TYPE.secondary, lineHeight: 20, color: colors.textSecondary },

    codeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    code: { flex: 1, fontSize: 30, fontWeight: "700", letterSpacing: 5, color: colors.text },
    chip: {
        flexDirection: "row", alignItems: "center", gap: 6,
        height: 36, paddingHorizontal: 14, borderRadius: R.pill,
        backgroundColor: t.fillStrong,
    },
    chipText: { ...TYPE.secondary, fontWeight: "600", color: colors.text },
    shareRow: { flexDirection: "row", gap: 10 },
    shareBtn: { flex: 1, paddingHorizontal: 12 },

    progressTrack: { height: 8, borderRadius: 4, backgroundColor: t.fillStrong, overflow: "hidden" },
    progressFill: { height: "100%", borderRadius: 4 },
    perks: { gap: 8 },
    linkRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
    linkText: { flex: 1, fontSize: 15, fontWeight: "500", color: colors.text },
    perkRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    perkText: { flex: 1, fontSize: 14.5, color: colors.text },

    friend: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 2 },
    friendAvatar: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: t.fillStrong,
        justifyContent: "center", alignItems: "center", overflow: "hidden",
    },
    friendAvatarImg: { width: "100%", height: "100%" },
    friendText: { flex: 1, minWidth: 0, gap: 2 },
    friendName: { ...TYPE.rowTitle, color: colors.text },
    friendSub: { ...TYPE.secondary, color: colors.textSecondary },
    status: { flexDirection: "row", alignItems: "center", gap: 5 },
    statusText: { ...TYPE.meta, fontWeight: "600" },
});
