import { DonutRing, SpendingAreaChart } from "@/components/Charts";
import CoinBadge from "@/components/CoinBadge";
import InviteModal from "@/components/InviteModal";
import { Loader } from "@/components/Loader";
import NotificationBell from "@/components/NotificationBell";
import { Block, PillButton, SectionLabel } from "@/components/ui/Design";
import { HomeSkeleton, Skeleton, SkeletonCircle } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import { Alert } from "@/lib/alert";
import { auth } from "@/lib/firebaseClient";
import { getGroupIcon } from "@/lib/groupIcons";
import { syncBalanceWidget } from "@/lib/homeScreenWidget";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import {
    ArrowRight,
    ArrowUpRight,
    Calendar,
    ChevronRight,
    Clock3,
    Landmark,
    PieChart as PieIcon,
    Plane,
    Plus,
    Receipt,
    ShoppingBag,
    Split,
    Ticket,
    Trash2,
    Users,
    Utensils,
    Wallet,
    Home as HomeIcon,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Dimensions,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { Text } from "@/components/ui/Typography";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTabScreenBottomPadding } from "@/hooks/useSafeSpacing";
import { SCREEN_GUTTER } from "@/constants/layout";

const SCREEN_W = Dimensions.get("window").width;

const CHART_CYAN = "#0891B2";
const FALLBACK_COLORS = ["#0891B2", "#0E7490", "#22D3EE", "#14b8a6", "#f59e0b", "#0284C7"];
const CATEGORY_META = {
    food: { color: "#ec4899", label: "Food & Dining" },
    travel: { color: "#0891B2", label: "Travel & Trips" },
    housing: { color: "#0E7490", label: "Rent & Bills" },
    shopping: { color: "#14b8a6", label: "Shopping" },
    entertainment: { color: "#f59e0b", label: "Leisure" },
    misc: { color: "#ef4444", label: "Other" },
};
const getCategoryLabel = (cat) => {
    const norm = cat?.toLowerCase() || "misc";
    return CATEGORY_META[norm]?.label || (cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : "Other");
};
const getCategoryColor = (cat, i) => {
    const norm = cat?.toLowerCase() || "misc";
    return CATEGORY_META[norm]?.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length];
};

// Icon per category for the Recent Activity list.
const CATEGORY_ICON = {
    food: Utensils,
    travel: Plane,
    housing: HomeIcon,
    shopping: ShoppingBag,
    entertainment: Ticket,
    misc: Wallet,
};
const getCategoryIcon = (cat) => CATEGORY_ICON[cat?.toLowerCase()] || Receipt;

// "2h ago", "Yesterday", "3d ago", then a short date.
const timeAgo = (value) => {
    if (!value) return "";
    const then = new Date(value).getTime();
    if (Number.isNaN(then)) return "";
    const mins = Math.round((Date.now() - then) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

// Home shows a short preview; the full list lives on the Trips tab.
const HOME_GROUP_LIMIT = 4;

const AVATAR_COLORS = ["#06B6D4", "#14B8A6", "#10B981", "#0EA5E9", "#8B5CF6"];

export default function Dashboard() {
    const { token, loading: authLoading } = useAuth();
    const { colors, theme } = useTheme();
    const tabBottomPadding = useTabScreenBottomPadding();
    const isDark = theme === "dark";
    const styles = getStyles(colors, isDark);

    const [analytics, setAnalytics] = useState(null);
    const [groups, setGroups] = useState([]);
    const [meId, setMeId] = useState(null);
    const [oweSummary, setOweSummary] = useState({ totalOwed: 0, totalOwe: 0 });
    const [loading, setLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const [quickSplits, setQuickSplits] = useState([]);

    const [userName, setUserName] = useState("User");
    const [profileImageUrl, setProfileImageUrl] = useState(null);

    const [inviteGroupId, setInviteGroupId] = useState(null);

    // ── Instant cache paint ────────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const [a, me, profile, g] = await Promise.all([
                    AsyncStorage.getItem("analytics_cache_v1"),
                    AsyncStorage.getItem("me_cache_v1"),
                    AsyncStorage.getItem("profile_cache_v1"),
                    AsyncStorage.getItem("groups_cache_v1"),
                ]);
                if (a) setAnalytics(JSON.parse(a));
                applyUser(me ? JSON.parse(me) : null, profile ? JSON.parse(profile) : null);
                if (g) {
                    setGroups(JSON.parse(g) || []);
                    setLoading(false);
                }
            } catch {
                // network will fill it
            }
        })();
    }, []);

    // ── Live fetch ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (authLoading || !token) return;
        let cancelled = false;

        (async () => {
            setIsFetching(true);
            try {
                const [analyticsRes, groupsRes, profileRes, meRes] = await Promise.allSettled([
                    api.get("/users/analytics"),
                    api.get("/groups"),
                    api.get("/profile"),
                    api.get("/users/me"),
                ]);
                if (cancelled) return;

                const me = meRes.status === "fulfilled" ? meRes.value.data : null;
                const profile = profileRes.status === "fulfilled" ? profileRes.value.data : null;
                applyUser(me, profile);
                if (me) AsyncStorage.setItem("me_cache_v1", JSON.stringify(me));
                if (profile) AsyncStorage.setItem("profile_cache_v1", JSON.stringify(profile));

                if (analyticsRes.status === "fulfilled") {
                    setAnalytics(analyticsRes.value.data);
                    AsyncStorage.setItem("analytics_cache_v1", JSON.stringify(analyticsRes.value.data));
                }

                fetchQuickSplits();

                const allGroups = groupsRes.status === "fulfilled" ? groupsRes.value.data || [] : [];
                setGroups(allGroups);
                AsyncStorage.setItem("groups_cache_v1", JSON.stringify(allGroups));

                const uid = me?._id || me?.id || null;
                setMeId(uid);
                computeOwe(allGroups, uid).then((sum) => {
                    if (cancelled) return;
                    setOweSummary(sum);
                    syncBalanceWidget(sum);
                });
            } catch {
                // keep cache
            } finally {
                if (!cancelled) {
                    setIsFetching(false);
                    setLoading(false);
                }
            }
        })();

        return () => { cancelled = true; };
    }, [token, authLoading]);

    const applyUser = (me, profile) => {
        const fb = auth?.currentUser;
        const n = profile?.name || me?.name || fb?.displayName;
        const img =
            profile?.profileImage?.url || me?.imageUrl || me?.photoURL ||
            me?.profileImage?.url || fb?.photoURL;
        if (n) setUserName(n);
        if (img) setProfileImageUrl(img);
    };

    const fetchQuickSplits = async () => {
        try {
            const res = await api.get("/quick-splits", { params: { limit: 5 } });
            setQuickSplits(res.data?.items || []);
        } catch {
            // Non-critical — the section just stays empty.
        }
    };

    const deleteQuickSplit = (qs) => {
        Alert.alert(
            "Delete quick split?",
            `"${qs.title}" will be removed. This can't be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        const prev = quickSplits;
                        setQuickSplits((list) => list.filter((q) => q.id !== qs.id));
                        try {
                            await api.delete(`/quick-splits/${qs.id}`);
                        } catch {
                            setQuickSplits(prev); // restore on failure
                        }
                    },
                },
            ]
        );
    };

    const computeOwe = async (allGroups, uid) => {
        if (!uid) return { totalOwed: 0, totalOwe: 0 };
        // One request for all groups; fall back to per-group on an older backend.
        try {
            const { data } = await api.get("/balances/summary");
            if (data) return { totalOwed: data.totalOwed || 0, totalOwe: data.totalOwe || 0 };
        } catch {
            // fall through
        }
        const active = allGroups.filter((g) => !isCompleted(g));
        const results = await Promise.all(
            active.map((g) => api.get(`/balances/${g._id}`).catch(() => ({ data: null })))
        );
        let totalOwed = 0, totalOwe = 0;
        results.forEach((res) => {
            const ub = res.data?.balances?.find((b) => String(b.userId) === String(uid));
            if (!ub) return;
            const bal = Number(ub.balance);
            if (bal > 0.01) totalOwed += bal;
            else if (bal < -0.01) totalOwe += Math.abs(bal);
        });
        return { totalOwed, totalOwe };
    };

    const refresh = async () => {
        try {
            const [groupsRes, meRes] = await Promise.all([api.get("/groups"), api.get("/users/me")]);
            const allGroups = groupsRes.data || [];
            setGroups(allGroups);
            AsyncStorage.setItem("groups_cache_v1", JSON.stringify(allGroups));
            const uid = meRes.data?._id || meRes.data?.id || meId;
            const summary = await computeOwe(allGroups, uid);
            setOweSummary(summary);
            syncBalanceWidget(summary);
        } catch {
            // ignore
        }
    };

    // A group made in the create-group wizard should show up when we come back.
    useFocusEffect(useCallback(() => { if (token) { refresh(); fetchQuickSplits(); } }, [token])); // eslint-disable-line react-hooks/exhaustive-deps

    const openGroup = (id) => router.push({ pathname: "/groups/[id]", params: { id, returnTo: "home" } });
    const { totalOwe, totalOwed } = oweSummary;

    const activeGroups = useMemo(() => groups.filter((g) => !isCompleted(g)), [groups]);

    const pieData = useMemo(
        () => (analytics?.categoryBreakdown || []).map((item, idx) => ({
            name: getCategoryLabel(item.category),
            value: Number(item.amount) || 0,
            color: getCategoryColor(item.category, idx),
        })),
        [analytics]
    );
    const totalCategorySpend = useMemo(() => pieData.reduce((s, i) => s + i.value, 0), [pieData]);
    const recentExpenses = useMemo(() => analytics?.recentExpenses || [], [analytics]);
    const hasTrends = useMemo(() => analytics?.trends?.some((t) => Number(t.amount) > 0), [analytics]);
    const showCharts = hasTrends || totalCategorySpend > 0;
    const chartW = SCREEN_W - SCREEN_GUTTER * 2 - 32;

    // Hooks above this line run every render; the early return is now safe.
    if (loading && groups.length === 0 && !analytics) {
        return (
            <View style={styles.mainWrapper}>
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
                <SafeAreaView style={styles.safeArea} edges={["top"]}>
                    <View style={styles.appBar}>
                        <View style={styles.userInfo}>
                            <SkeletonCircle size={44} />
                            <View style={{ marginLeft: 12 }}>
                                <Skeleton width={80} height={11} />
                                <Skeleton width={110} height={15} style={{ marginTop: 7 }} />
                            </View>
                        </View>
                        <View style={styles.appBarActions}>
                            <Skeleton width={56} height={32} radius={16} />
                            <SkeletonCircle size={32} style={{ marginLeft: 6 }} />
                        </View>
                    </View>
                </SafeAreaView>
                <View style={{ paddingTop: 12 }}>
                    <View style={{ height: 52 }} />
                    <HomeSkeleton />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.mainWrapper}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* App bar */}
            <SafeAreaView style={styles.safeArea} edges={["top"]}>
                <View style={styles.appBar}>
                    <View style={styles.userInfo}>
                        <View style={styles.avatarContainer}>
                            {profileImageUrl
                                ? <Image source={{ uri: profileImageUrl }} style={styles.avatarImage} />
                                : <Text style={styles.avatarText}>{userName ? userName.charAt(0).toUpperCase() : "U"}</Text>}
                        </View>
                        <View>
                            <Text style={styles.greeting}>Good {getTimeOfDay()},</Text>
                            <Text style={styles.userNameTop}>{userName?.split(" ")[0] || "User"}</Text>
                        </View>
                    </View>
                    <View style={styles.appBarActions}>
                        <CoinBadge />
                        <NotificationBell iconColor={colors.textSecondary} />
                    </View>
                </View>
            </SafeAreaView>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBottomPadding }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Create bar */}
                <View style={styles.createBarWrap}>
                    <PillButton
                        variant="secondary"
                        label="Quick Split"
                        onPress={() => router.push("/quick-split")}
                        icon={<Split size={16} color={colors.primary} strokeWidth={2.6} />}
                        style={styles.createBarBtn}
                    />
                    <PillButton
                        label="New group"
                        onPress={() => router.push("/create-group")}
                        icon={<Plus size={16} color={colors.onPrimary} strokeWidth={2.8} />}
                        style={styles.createBarBtn}
                    />
                </View>

                {isFetching && (
                    <View style={styles.syncPill}>
                        <Loader size={16} />
                        <Text style={styles.syncText}>Syncing…</Text>
                    </View>
                )}

                {/* Stat cards */}
                <View style={styles.statBlock}>
                    <View style={styles.statRow}>
                        <StatCard
                            styles={styles} label="Your Groups" value={`${groups.length}`}
                            subtext="Currently splitting" icon={<Users size={16} color="#0891B2" />}
                            iconBg="rgba(8,145,178,0.12)"
                        />
                        <StatCard
                            styles={styles} label="Spent This Month"
                            value={`₹${Number(analytics?.monthlySummary?.totalSpent || 0).toLocaleString("en-IN")}`}
                            subtext={analytics?.monthlySummary?.topCategory ? `Mostly on ${getCategoryLabel(analytics.monthlySummary.topCategory)}` : "Nothing spent yet"}
                            icon={<Calendar size={16} color="#10B981" />} iconBg="rgba(16,185,129,0.12)"
                        />
                    </View>
                    <View style={styles.statRow}>
                        <StatCard
                            styles={styles} label="You Owe"
                            value={`₹${Number(totalOwe).toLocaleString("en-IN")}`}
                            subtext={totalOwe > 0 ? "Time to settle up" : "All settled up"}
                            icon={<ArrowUpRight size={16} color="#F43F5E" />} iconBg="rgba(244,63,94,0.12)"
                            valueColor={totalOwe > 0 ? "#F43F5E" : colors.text}
                        />
                        <StatCard
                            styles={styles} label="You're Owed"
                            value={`₹${Number(totalOwed).toLocaleString("en-IN")}`}
                            subtext={totalOwed > 0 ? "Coming your way" : "Nothing pending"}
                            icon={<Landmark size={16} color="#10B981" />} iconBg="rgba(16,185,129,0.12)"
                            valueColor={totalOwed > 0 ? "#10B981" : colors.text}
                        />
                    </View>
                </View>

                {/* Active Trips & Groups — minimal rounded rows */}
                <SectionLabel
                    right={activeGroups.length > 0 ? (
                        <TouchableOpacity
                            style={styles.viewAll}
                            onPress={() => router.push("/(tabs)/trips")}
                            activeOpacity={0.7}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityRole="button"
                            accessibilityLabel={`View all ${activeGroups.length} groups`}
                        >
                            <Text style={styles.viewAllText}>View all</Text>
                            <ChevronRight size={16} color={colors.primary} strokeWidth={2.6} />
                        </TouchableOpacity>
                    ) : null}
                >
                    Active Trips & Groups
                </SectionLabel>

                {activeGroups.length > 0 ? (
                    <View style={styles.cardList}>
                        {activeGroups.slice(0, HOME_GROUP_LIMIT).map((g, i) => (
                            <GroupCard key={g._id} group={g} index={i} styles={styles} colors={colors} onOpen={openGroup} />
                        ))}
                    </View>
                ) : (
                    <Block style={styles.emptyCard}>
                        <View style={styles.emptyIconBox}><Users size={28} color={colors.primary} /></View>
                        <Text style={styles.emptyTitle}>No active trips yet</Text>
                        <Text style={styles.emptyText}>Create your first group and start splitting expenses with friends.</Text>
                        <PillButton
                            label="New Group"
                            onPress={() => router.push("/create-group")}
                            icon={<Plus size={16} color={colors.onPrimary} strokeWidth={2.6} />}
                            style={styles.emptyCta}
                        />
                    </Block>
                )}

                {/* Spending Trajectory */}
                {showCharts && hasTrends && (
                    <>
                        <SectionLabel>Spending Trajectory</SectionLabel>
                        <Block>
                            <View style={styles.cardHeadRow}>
                                <Landmark size={16} color={CHART_CYAN} />
                                <Text style={styles.cardSub}>Monthly breakdown of travel settlements this year</Text>
                            </View>
                            <SpendingAreaChart data={analytics.trends} width={chartW} height={210} color={CHART_CYAN} colors={colors} />
                        </Block>
                    </>
                )}

                {/* Expense Allocations */}
                {showCharts && pieData.length > 0 && (
                    <>
                        <SectionLabel>Expense Allocations</SectionLabel>
                        <Block>
                            <View style={styles.cardHeadRow}>
                                <PieIcon size={16} color="#14B8A6" />
                                <Text style={styles.cardSub}>Distribution of shares by top categories</Text>
                            </View>
                            <View style={styles.donutRow}>
                                <View style={styles.donutWrap}>
                                    <DonutRing data={pieData} size={140} strokeWidth={18} trackColor={colors.border} />
                                    <View style={styles.donutCenter} pointerEvents="none">
                                        <Text style={styles.donutCenterLabel}>SPENT</Text>
                                        <Text style={styles.donutCenterValue}>₹{totalCategorySpend.toLocaleString("en-IN")}</Text>
                                    </View>
                                </View>
                                <View style={styles.legend}>
                                    {pieData.map((item, idx) => {
                                        const pct = ((item.value / (totalCategorySpend || 1)) * 100).toFixed(0);
                                        return (
                                            <View key={idx} style={styles.legendRow}>
                                                <View style={styles.legendLeft}>
                                                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                                                    <Text style={styles.legendName} numberOfLines={1}>{item.name}</Text>
                                                </View>
                                                <Text style={styles.legendPct}>{pct}%</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        </Block>
                    </>
                )}

                {/* Recent Activity */}
                <SectionLabel>Recent Activity</SectionLabel>
                {recentExpenses.length > 0 ? (
                    <Block padded={false} style={styles.recentBlock}>
                        {recentExpenses.map((exp, i) => (
                            <RecentExpenseRow
                                key={exp.id}
                                exp={exp}
                                isLast={i === recentExpenses.length - 1}
                                styles={styles}
                                colors={colors}
                                onOpen={openGroup}
                            />
                        ))}
                    </Block>
                ) : (
                    <Block style={styles.emptyCard}>
                        <View style={[styles.emptyIconBox, { backgroundColor: "rgba(245,158,11,0.12)" }]}>
                            <Receipt size={26} color="#F59E0B" />
                        </View>
                        <Text style={styles.emptyTitle}>No expenses yet</Text>
                        <Text style={styles.emptyText}>Open a group and add your first expense — it&apos;ll show up here instantly.</Text>
                    </Block>
                )}

                {/* Recent Quick Splits */}
                {quickSplits.length > 0 && (
                    <>
                        <SectionLabel
                            right={
                                <TouchableOpacity
                                    onPress={() => router.push("/quick-split")}
                                    activeOpacity={0.7}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Text style={styles.viewAllText}>New</Text>
                                </TouchableOpacity>
                            }
                        >
                            Recent Quick Splits
                        </SectionLabel>
                        <Block padded={false} style={styles.recentBlock}>
                            {quickSplits.map((qs, i) => (
                                <View
                                    key={qs.id}
                                    style={[styles.qsRow, i !== quickSplits.length - 1 && styles.recentRowDivider, { borderBottomColor: colors.border }]}
                                >
                                    <TouchableOpacity
                                        activeOpacity={0.75}
                                        onPress={() => router.push({ pathname: "/quick-split", params: { id: qs.id } })}
                                        style={styles.recentOpen}
                                    >
                                        <View style={[styles.recentIcon, { backgroundColor: qs.settled ? "rgba(16,185,129,0.14)" : colors.primaryLight }]}>
                                            <Split size={18} color={qs.settled ? "#10B981" : colors.primary} />
                                        </View>
                                        <View style={styles.recentMiddle}>
                                            <Text style={styles.recentDesc} numberOfLines={1}>{qs.title}</Text>
                                            <Text style={styles.recentTime}>
                                                {qs.participants.length} {qs.participants.length === 1 ? "person" : "people"}
                                            </Text>
                                        </View>
                                        <Text style={styles.recentAmount} numberOfLines={1}>
                                            ₹{Number(qs.totalAmount).toLocaleString("en-IN")}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => deleteQuickSplit(qs)}
                                        style={styles.recentDeleteBtn}
                                        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Delete ${qs.title}`}
                                    >
                                        <Trash2 size={16} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </Block>
                    </>
                )}

            </ScrollView>

            <InviteModal groupId={inviteGroupId} visible={!!inviteGroupId} onClose={() => setInviteGroupId(null)} />
        </View>
    );
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ styles, label, value, subtext, icon, iconBg, valueColor }) {
    return (
        <View style={styles.statCard}>
            <View style={styles.statTop}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.statLabel}>{label}</Text>
                    <Text style={[styles.statValue, valueColor && { color: valueColor }]} numberOfLines={1}>{value}</Text>
                </View>
                <View style={[styles.statIcon, { backgroundColor: iconBg }]}>{icon}</View>
            </View>
            {subtext ? <Text style={styles.statSub} numberOfLines={1}>{subtext}</Text> : null}
        </View>
    );
}

// ── Group card ───────────────────────────────────────────────────────────────
const CARD_GRADIENTS = [
    ["#06B6D4", "#0E7490"],
    ["#2DD4BF", "#0F766E"],
    ["#818CF8", "#4F46E5"],
    ["#38BDF8", "#0369A1"],
    ["#34D399", "#047857"],
    ["#C084FC", "#7C3AED"],
];

// Member faces: up to 4 shown as-is; with more than 4, show 3 faces + "+N".
const MAX_FACES = 4;

function GroupCard({ group, index, styles, colors, onOpen }) {
    const members = group.members || [];
    const [from, to] = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
    const GroupIcon = getGroupIcon(group.icon);
    const groupPhoto = group.photo?.url;

    const faces = members.length > MAX_FACES ? members.slice(0, MAX_FACES - 1) : members;
    const extra = members.length - faces.length;
    const open = () => onOpen(group._id);

    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={open}
            style={styles.card}
            accessibilityRole="button"
            accessibilityLabel={`Open ${group.name}`}
        >
            {/* Group avatar: uploaded photo if there is one, otherwise icon / initial */}
            {groupPhoto ? (
                <Image source={{ uri: groupPhoto }} style={styles.groupAvatar} />
            ) : (
                <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.groupAvatar}>
                    {GroupIcon ? (
                        <GroupIcon size={20} color="#fff" strokeWidth={2.2} />
                    ) : (
                        <Text style={styles.groupAvatarText}>{group.name.charAt(0).toUpperCase()}</Text>
                    )}
                </LinearGradient>
            )}

            <View style={styles.cardMiddle}>
                <Text style={styles.cardName} numberOfLines={1}>{group.name}</Text>
                {members.length > 0 && (
                    <View style={styles.faces}>
                        {faces.map((m, i) => {
                            const photo = m.photoURL || m.profileImage?.url;
                            const label = (m.name || m.email || "?").charAt(0).toUpperCase();
                            return (
                                <View
                                    key={m._id || i}
                                    style={[styles.face, i > 0 && styles.faceOverlap, { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }]}
                                >
                                    {photo ? <Image source={{ uri: photo }} style={styles.faceImg} /> : <Text style={styles.faceText}>{label}</Text>}
                                </View>
                            );
                        })}
                        {extra > 0 && (
                            <View style={[styles.face, styles.faceOverlap, styles.faceMore]}>
                                <Text style={styles.faceMoreText}>{`+${extra}`}</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>

            {/* The one action: open the group */}
            <TouchableOpacity
                onPress={open}
                style={styles.openBtn}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`Open ${group.name}`}
            >
                <ArrowRight size={17} color={colors.onPrimary} strokeWidth={2.6} />
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

// ── Recent expense row ─────────────────────────────────────────────────────
function RecentExpenseRow({ exp, isLast, styles, colors, onOpen }) {
    const CatIcon = getCategoryIcon(exp.category);
    const accent = getCategoryColor(exp.category, 0);
    const amountLabel = `${exp.currency ? exp.currency + " " : "₹"}${Number(exp.amount).toLocaleString("en-IN")}`;
    return (
        <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => exp.groupId && onOpen(exp.groupId)}
            style={[styles.recentRow, !isLast && styles.recentRowDivider, { borderBottomColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={`${exp.description}, ${amountLabel} in ${exp.groupName}`}
        >
            <View style={[styles.recentIcon, { backgroundColor: `${accent}22` }]}>
                <CatIcon size={19} color={accent} strokeWidth={2.2} />
            </View>

            <View style={styles.recentMiddle}>
                <Text style={styles.recentDesc} numberOfLines={1}>{exp.description}</Text>
                <View style={styles.recentMetaRow}>
                    <View style={[styles.recentChip, { backgroundColor: colors.background }]}>
                        <Users size={9} color={colors.textSecondary} />
                        <Text style={styles.recentChipText} numberOfLines={1}>{exp.groupName}</Text>
                    </View>
                    <Clock3 size={9} color={colors.textSecondary} />
                    <Text style={styles.recentTime}>{timeAgo(exp.date)}</Text>
                </View>
            </View>

            <View style={styles.recentRight}>
                <Text style={styles.recentAmount} numberOfLines={1}>{amountLabel}</Text>
                <Text style={styles.recentPaidBy} numberOfLines={1}>
                    {exp.paidByMe ? "You paid" : `${exp.paidByName} paid`}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const isCompleted = (g) => g?.isCompleted === true || g?.isCompleted === "true";
const getTimeOfDay = () => {
    const h = new Date().getHours();
    if (h < 12) return "Morning";
    if (h < 18) return "Afternoon";
    return "Evening";
};

// ── Styles ───────────────────────────────────────────────────────────────────
const getStyles = (colors, isDark) => StyleSheet.create({
    mainWrapper: { flex: 1, backgroundColor: colors.background },
    full: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
    safeArea: { backgroundColor: colors.background, zIndex: 10 },

    appBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: SCREEN_GUTTER, paddingVertical: 12 },
    userInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
    avatarContainer: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary,
        justifyContent: "center", alignItems: "center", overflow: "hidden",
    },
    avatarImage: { width: "100%", height: "100%", borderRadius: 22 },
    avatarText: { color: colors.onPrimary, fontSize: 18, fontWeight: "700" },
    greeting: { fontSize: 12, color: colors.textSecondary, fontWeight: "500" },
    userNameTop: { fontSize: 18, fontWeight: "800", color: colors.text },
    appBarActions: { flexDirection: "row", alignItems: "center", gap: 4 },

    scrollView: { flex: 1 },
    scrollContent: { paddingTop: 6, paddingBottom: 110 },

    // Create bar
    createBarWrap: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: SCREEN_GUTTER, marginBottom: 20 },
    createBarInput: { flex: 1 },
    createBarBtn: { flex: 1 },

    syncPill: {
        alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "#FFFFFF",
        borderWidth: StyleSheet.hairlineWidth, borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(20,20,20,0.08)",
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, marginBottom: 16,
    },
    syncText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },

    // Stat cards — 4 standalone tiles with one clean border each (no card-in-card)
    statBlock: { paddingHorizontal: SCREEN_GUTTER, marginBottom: 24 },
    statRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
    statCard: {
        flex: 1, borderRadius: 18, padding: 15,
        backgroundColor: colors.card,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)",
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: isDark ? 0 : 0.05,
        shadowRadius: 12,
        elevation: isDark ? 0 : 2,
    },
    statTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
    statLabel: { fontSize: 10.5, color: colors.textSecondary, fontWeight: "600", letterSpacing: 0.2 },
    statValue: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: 4, letterSpacing: -0.5 },
    statIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center" },
    statSub: { fontSize: 10, color: colors.textSecondary, marginTop: 10 },

    // Chart blocks
    cardHeadRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
    cardSub: { fontSize: 11.5, color: colors.textSecondary, flex: 1 },

    donutRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    donutWrap: { width: 140, height: 140, justifyContent: "center", alignItems: "center" },
    donutCenter: { position: "absolute", alignItems: "center", justifyContent: "center" },
    donutCenterLabel: { fontSize: 8, fontWeight: "700", color: colors.textSecondary, letterSpacing: 1.5 },
    donutCenterValue: { fontSize: 15, fontWeight: "800", color: colors.text, marginTop: 2 },
    legend: { flex: 1, gap: 9, paddingLeft: 6 },
    legendRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    legendLeft: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendName: { fontSize: 11.5, color: colors.textSecondary, fontWeight: "500", flex: 1 },
    legendPct: { fontSize: 11.5, color: colors.text, fontWeight: "700" },

    // Active trips — rows are soft rounded pills
    viewAll: { flexDirection: "row", alignItems: "center", gap: 2 },
    viewAllText: { fontSize: 13.5, fontWeight: "700", color: colors.primary },

    cardList: { gap: 10, paddingHorizontal: SCREEN_GUTTER, marginBottom: 24 },
    card: {
        flexDirection: "row", alignItems: "center", gap: 12,
        paddingVertical: 10, paddingLeft: 10, paddingRight: 10,
        borderRadius: 24,
        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#EEF2F7",
    },
    groupAvatar: {
        width: 48, height: 48, borderRadius: 24, overflow: "hidden",
        alignItems: "center", justifyContent: "center",
    },
    groupAvatarText: { color: "#fff", fontSize: 19, fontWeight: "900" },
    cardMiddle: { flex: 1, gap: 6 },
    cardName: { fontSize: 15.5, fontWeight: "700", color: colors.text, letterSpacing: -0.2 },
    faces: { flexDirection: "row", alignItems: "center" },
    face: {
        width: 24, height: 24, borderRadius: 12, overflow: "hidden",
        alignItems: "center", justifyContent: "center",
        borderWidth: 2, borderColor: isDark ? "#2A2D33" : "#EEF2F7",
    },
    faceOverlap: { marginLeft: -7 },
    faceImg: { width: "100%", height: "100%" },
    faceText: { color: "#fff", fontSize: 10, fontWeight: "800" },
    faceMore: { backgroundColor: isDark ? "#3A3F47" : "#D8DEE8" },
    faceMoreText: { color: colors.text, fontSize: 9.5, fontWeight: "800" },
    openBtn: {
        width: 38, height: 38, borderRadius: 19,
        alignItems: "center", justifyContent: "center",
        backgroundColor: colors.primary,
    },

    // Empty
    emptyCard: { alignItems: "center", paddingVertical: 28 },
    emptyIconBox: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryLight, justifyContent: "center", alignItems: "center", marginBottom: 14 },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 4 },
    emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: "center", lineHeight: 19 },
    emptyCta: { marginTop: 16, paddingHorizontal: 20 },

    // Recent activity
    recentBlock: {},
    recentRow: {
        flexDirection: "row", alignItems: "center", gap: 12,
        paddingHorizontal: 14, paddingVertical: 12,
    },
    recentRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth },
    qsRow: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 14, paddingRight: 8,
    },
    recentOpen: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
    recentDeleteBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 10 },
    recentIcon: {
        width: 42, height: 42, borderRadius: 13,
        alignItems: "center", justifyContent: "center",
    },
    recentMiddle: { flex: 1, minWidth: 0, gap: 5 },
    recentDesc: { fontSize: 14.5, fontWeight: "700", color: colors.text, letterSpacing: -0.2 },
    recentMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    recentChip: {
        flexDirection: "row", alignItems: "center", gap: 3,
        paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, maxWidth: 130,
    },
    recentChipText: { fontSize: 10, fontWeight: "600", color: colors.textSecondary },
    recentTime: { fontSize: 10.5, fontWeight: "500", color: colors.textSecondary },
    recentRight: { alignItems: "flex-end", gap: 3, marginLeft: 4 },
    recentAmount: { fontSize: 15, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
    recentPaidBy: { fontSize: 10, fontWeight: "500", color: colors.textSecondary },
});
