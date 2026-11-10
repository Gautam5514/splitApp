import { CountBadge, IconCircle, ListRow, PillButton, RoundButton, ScreenHeader, SectionLabel, useDesign } from "@/components/ui/Design";
import { Skeleton, SkeletonCircle } from "@/components/ui/Skeleton";
import TierBadge from "@/components/ui/TierBadge";
import { Text } from "@/components/ui/Typography";
import { R, TYPE } from "@/constants/design";
import { SCREEN_GUTTER } from "@/constants/layout";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useTabScreenBottomPadding } from "@/hooks/useSafeSpacing";
import { Alert } from "@/lib/alert";
import { api } from "@/lib/api";
import { auth } from "@/lib/firebaseClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import {
    Check,
    ChevronRight,
    Copy,
    FileText,
    Gift,
    HelpCircle,
    Info,
    LogOut,
    Mail,
    Palette,
    Plus,
    Settings,
    ShieldCheck,
    UserRound,
    Wallet,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image, RefreshControl, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PROFILE_CACHE = "profile_cache_v1";
const ME_CACHE = "me_cache_v1";
const APP_VERSION = "10.0.3"; // shown in the footer

const readCache = async (key) => {
    try {
        const raw = await AsyncStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null; // a corrupt cache must never block the screen
    }
};

export default function ProfilePage() {
    const { logout } = useAuth();
    const { colors, isDark, t } = useDesign();
    const { accent, setAccent } = useTheme();
    const tabBottomPadding = useTabScreenBottomPadding();
    const isFocused = useIsFocused();
    const styles = getStyles(colors, t);

    const [profile, setProfile] = useState({});
    const [googlePhoto, setGooglePhoto] = useState(null);
    const [loaded, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [coins, setCoins] = useState(null);
    const [tier, setTier] = useState(null); // Elite tier earned by referring friends
    const [inviteCount, setInviteCount] = useState(0);
    const [copied, setCopied] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const copyTimer = useRef(null);

    const avatarUrl = profile.profileImage?.url || googlePhoto || auth?.currentUser?.photoURL;
    const name = profile.name || auth?.currentUser?.displayName || "";
    const email = profile.email || auth?.currentUser?.email || "";
    const upiId = (profile.upiId || "").trim();
    const hasQr = !!profile.upiQr?.url;
    const showSkeleton = !loaded && !name;

    const load = useCallback(async () => {
        const [pRes, mRes, rRes, iRes] = await Promise.allSettled([
            api.get("/profile"),
            api.get("/users/me"),
            api.get("/referrals/me"),
            api.get("/invites"),
        ]);
        if (pRes.status === "fulfilled") {
            const data = pRes.value?.data || {};
            setProfile(data);
            setFailed(false);
            AsyncStorage.setItem(PROFILE_CACHE, JSON.stringify(data)).catch(() => {});
        } else {
            setFailed(true);
        }
        if (mRes.status === "fulfilled") {
            const me = mRes.value?.data;
            setGooglePhoto(me?.imageUrl || me?.photoURL || me?.profileImage?.url || null);
            AsyncStorage.setItem(ME_CACHE, JSON.stringify(me || {})).catch(() => {});
        }
        // Extras: nice to have, never block or break the screen.
        if (rRes.status === "fulfilled" && typeof rRes.value?.data?.coins === "number") setCoins(rRes.value.data.coins);
        if (rRes.status === "fulfilled") setTier(rRes.value?.data?.eliteClub?.tier?.key || null);
        if (iRes.status === "fulfilled") setInviteCount(Array.isArray(iRes.value?.data) ? iRes.value.data.length : 0);
        setLoaded(true);
    }, []);

    // Cached copy first (instant), then the network.
    useEffect(() => {
        (async () => {
            const [cp, cm] = await Promise.all([readCache(PROFILE_CACHE), readCache(ME_CACHE)]);
            if (cp) setProfile((p) => (Object.keys(p).length ? p : cp));
            if (cm) setGooglePhoto((g) => g || cm.imageUrl || cm.photoURL || cm.profileImage?.url || null);
        })();
        return () => clearTimeout(copyTimer.current);
    }, []);

    // Refetch every time the tab comes back into view, so a name / photo / UPI
    // change made on the edit screen shows up straight away.
    useEffect(() => {
        if (isFocused) load();
    }, [isFocused, load]);

    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    const copyUpi = async () => {
        try {
            await Clipboard.setStringAsync(upiId);
            Haptics.selectionAsync?.().catch?.(() => {});
            setCopied(true);
            clearTimeout(copyTimer.current);
            copyTimer.current = setTimeout(() => setCopied(false), 2000);
        } catch {
            Alert.alert("Couldn't copy", "Please copy your UPI ID from Personal details.");
        }
    };

    const doLogout = () => {
        Alert.alert("Log out", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Log out",
                style: "destructive",
                onPress: async () => {
                    setLoggingOut(true);
                    try {
                        await logout();
                        // Don't leave this person's name / photo / UPI for the next login.
                        await Promise.all([
                            AsyncStorage.removeItem(PROFILE_CACHE),
                            AsyncStorage.removeItem(ME_CACHE),
                            setAccent(null), // an unlocked theme belongs to the account, not the phone
                        ]).catch(() => {});
                    } finally {
                        setLoggingOut(false);
                        router.replace("/auth/login");
                    }
                },
            },
        ]);
    };

    const openEdit = () => router.push("/profile-edit");
    const row = (Icon, title, onPress, extra = {}) => (
        <ListRow
            style={styles.row}
            onPress={onPress}
            title={title}
            subtitle={extra.subtitle}
            leading={
                <IconCircle size={40} tint={t.fillStrong}>
                    <Icon size={18} color={colors.text} strokeWidth={2} />
                </IconCircle>
            }
            trailing={
                <View style={styles.rowTrailing}>
                    {extra.badge ? <CountBadge value={extra.badge} /> : null}
                    {extra.value ? <Text style={styles.rowValue} numberOfLines={1}>{extra.value}</Text> : null}
                    <ChevronRight size={20} color={colors.textSecondary} />
                </View>
            }
        />
    );

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            {isFocused && <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />}
            <ScrollView
                contentContainerStyle={{ paddingBottom: tabBottomPadding }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} />}
            >
                <ScreenHeader
                    title="Profile"
                    right={
                        <RoundButton label="Settings" onPress={() => router.push("/settings")}>
                            <Settings size={20} color={colors.text} strokeWidth={2.1} />
                        </RoundButton>
                    }
                />

                {/* Who I am + how people pay me */}
                <View style={styles.idCard}>
                    <TouchableOpacity
                        style={styles.idTop}
                        activeOpacity={0.75}
                        onPress={openEdit}
                        accessibilityRole="button"
                        accessibilityLabel={`Edit profile${name ? `, ${name}` : ""}`}
                    >
                        {showSkeleton ? (
                            <SkeletonCircle size={64} />
                        ) : avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={styles.avatar} accessibilityIgnoresInvertColors />
                        ) : (
                            <View style={[styles.avatar, styles.avatarFallback]}>
                                {name ? (
                                    <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
                                ) : (
                                    <UserRound size={28} color={t.onInk} />
                                )}
                            </View>
                        )}

                        <View style={styles.idText}>
                            {showSkeleton ? (
                                <>
                                    <Skeleton width={140} height={18} />
                                    <Skeleton width={190} height={12} style={{ marginTop: 8 }} />
                                </>
                            ) : (
                                <>
                                    <View style={styles.nameRow}>
                                        <Text style={styles.name} numberOfLines={1}>{name || "Add your name"}</Text>
                                        <TierBadge tier={tier} />
                                    </View>
                                    {email ? <Text style={styles.email} numberOfLines={1}>{email}</Text> : null}
                                </>
                            )}
                        </View>
                        <ChevronRight size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    {/* Couldn't load and nothing cached: say so, don't show made-up details */}
                    {loaded && failed && !name ? (
                        <View style={styles.idBottom}>
                            <Text style={[styles.payHint, { flex: 1 }]}>Couldn&apos;t load your profile. Check your connection.</Text>
                            <TouchableOpacity style={styles.chip} onPress={load} activeOpacity={0.75} accessibilityRole="button">
                                <Text style={styles.chipText}>Try again</Text>
                            </TouchableOpacity>
                        </View>
                    ) : loaded && !failed ? (
                        upiId ? (
                            <View style={styles.idBottom}>
                                <View style={styles.payIcon}><Wallet size={18} color={colors.text} strokeWidth={2} /></View>
                                <View style={styles.payText}>
                                    <Text style={styles.payLabel}>Friends pay you at</Text>
                                    <Text style={styles.payValue} numberOfLines={1}>{upiId}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.chip}
                                    onPress={copyUpi}
                                    activeOpacity={0.75}
                                    accessibilityRole="button"
                                    accessibilityLabel={copied ? "UPI ID copied" : "Copy UPI ID"}
                                >
                                    {copied ? <Check size={14} color={colors.success} strokeWidth={2.6} /> : <Copy size={14} color={colors.text} />}
                                    <Text style={[styles.chipText, copied && { color: colors.success }]}>{copied ? "Copied" : "Copy"}</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.idBottom}
                                onPress={openEdit}
                                activeOpacity={0.75}
                                accessibilityRole="button"
                                accessibilityLabel="Add your UPI ID so friends can pay you"
                            >
                                <View style={styles.payIcon}><Wallet size={18} color={colors.text} strokeWidth={2} /></View>
                                <View style={styles.payText}>
                                    <Text style={styles.payValue}>{hasQr ? "Add your UPI ID too" : "Add your UPI ID"}</Text>
                                    <Text style={styles.payHint}>So friends can pay you back in one tap</Text>
                                </View>
                                <View style={[styles.chip, styles.chipInk]}>
                                    <Plus size={14} color={t.onInk} strokeWidth={2.8} />
                                    <Text style={[styles.chipText, { color: t.onInk }]}>Add</Text>
                                </View>
                            </TouchableOpacity>
                        )
                    ) : null}
                </View>

                <SectionLabel line>Account</SectionLabel>
                <View style={styles.group}>
                    {row(UserRound, "Personal details", openEdit)}
                    {row(Mail, "Group invites", () => router.push("/invites"), { badge: inviteCount })}
                    {row(ShieldCheck, "Privacy & blocking", () => router.push("/privacy"))}
                </View>

                <SectionLabel line>Preferences</SectionLabel>
                <View style={styles.group}>
                    {row(Palette, "Appearance", () => router.push("/appearance"), { value: `${isDark ? "Black" : "White"}${accent?.name ? ` · ${accent.name}` : ""}` })}
                    {row(Gift, "Refer & earn", () => router.push("/rewards"), {
                        value: coins != null ? `${coins} ${coins === 1 ? "coin" : "coins"}` : undefined,
                    })}
                </View>

                <SectionLabel line>Help</SectionLabel>
                <View style={styles.group}>
                    {row(HelpCircle, "Help Center", () => router.push("/info/help-center"))}
                    {row(Info, "What SplitEase offers", () => router.push("/info/what-we-offer"))}
                    {row(FileText, "Privacy Policy", () => router.push("/info/privacy"))}
                </View>

                <PillButton
                    variant="danger"
                    label="Log Out"
                    onPress={doLogout}
                    loading={loggingOut}
                    icon={<LogOut size={18} color={colors.error} />}
                    style={styles.logout}
                />

                <Text style={styles.version}>SplitEase v{APP_VERSION}</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (colors, t) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // Identity card — same surface as the group cards on the Groups tab
    // Identity: sits straight on the canvas like the rows below (no card)
    idCard: { paddingHorizontal: SCREEN_GUTTER, marginBottom: 10 },
    idTop: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 6 },
    avatar: { width: 64, height: 64, borderRadius: 32 },
    avatarFallback: { backgroundColor: t.ink, alignItems: "center", justifyContent: "center" },
    avatarInitial: { fontSize: 24, fontWeight: "700", color: t.onInk },
    idText: { flex: 1, minWidth: 0, gap: 3 },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    name: { fontSize: 22, fontWeight: "700", color: colors.text, letterSpacing: -0.3, flexShrink: 1 },
    email: { ...TYPE.secondary, color: colors.textSecondary },
    idBottom: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 10 },
    payIcon: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: "center", justifyContent: "center",
        backgroundColor: t.fillStrong,
    },
    payText: { flex: 1, minWidth: 0, gap: 2 },
    payLabel: { ...TYPE.meta, color: colors.textSecondary },
    payValue: { fontSize: 15, fontWeight: "600", color: colors.text, letterSpacing: -0.1 },
    payHint: { ...TYPE.secondary, color: colors.textSecondary },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 36,
        paddingHorizontal: 14,
        borderRadius: R.pill,
        backgroundColor: t.fillStrong,
    },
    chipInk: { backgroundColor: t.ink },
    chipText: { ...TYPE.secondary, fontWeight: "600", color: colors.text },

    // Row groups: rows sit straight on the canvas under a lined heading (no cards)
    group: { marginBottom: 10 },
    row: { paddingVertical: 8 },
    rowTrailing: { flexDirection: "row", alignItems: "center", gap: 8, maxWidth: "50%" },
    rowValue: { ...TYPE.secondary, color: colors.textSecondary, flexShrink: 1 },

    logout: { marginHorizontal: SCREEN_GUTTER, marginTop: 10 },
    version: { ...TYPE.meta, color: colors.textSecondary, textAlign: "center", marginTop: 16 },
});
