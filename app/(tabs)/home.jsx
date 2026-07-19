import { DonutRing, SpendingAreaChart } from "@/components/Charts";
import CoinBadge from "@/components/CoinBadge";
import InviteModal from "@/components/InviteModal";
import { Loader } from "@/components/Loader";
import NotificationBell from "@/components/NotificationBell";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import { auth } from "@/lib/firebaseClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import {
    ArrowRight,
    ArrowUpRight,
    Calendar,
    CheckCircle,
    ChevronRight,
    Landmark,
    LogOut,
    PieChart as PieIcon,
    Plus,
    ShieldCheck,
    Trash2,
    Users,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Dimensions,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

const AVATAR_COLORS = ["#06B6D4", "#14B8A6", "#10B981", "#0EA5E9", "#8B5CF6"];

export default function Dashboard() {
    const { logout, token, loading: authLoading } = useAuth();
    const { colors, theme } = useTheme();
    const isDark = theme === "dark";
    const styles = getStyles(colors, isDark);

    const [analytics, setAnalytics] = useState(null);
    const [groups, setGroups] = useState([]);
    const [meId, setMeId] = useState(null);
    const [oweSummary, setOweSummary] = useState({ totalOwed: 0, totalOwe: 0 });
    const [loading, setLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);

    const [userName, setUserName] = useState("User");
    const [profileImageUrl, setProfileImageUrl] = useState(null);

    const [name, setName] = useState("");
    const [creating, setCreating] = useState(false);
    const [inputFocused, setInputFocused] = useState(false);
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

                const allGroups = groupsRes.status === "fulfilled" ? groupsRes.value.data || [] : [];
                setGroups(allGroups);
                AsyncStorage.setItem("groups_cache_v1", JSON.stringify(allGroups));

                const uid = me?._id || me?.id || null;
                setMeId(uid);
                computeOwe(allGroups, uid).then((sum) => !cancelled && setOweSummary(sum));
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

    const computeOwe = async (allGroups, uid) => {
        if (!uid) return { totalOwed: 0, totalOwe: 0 };
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
            setOweSummary(await computeOwe(allGroups, uid));
        } catch {
            // ignore
        }
    };

    const createGroup = async () => {
        const trimmed = name.trim();
        if (!trimmed) return;
        try {
            setCreating(true);
            const res = await api.post("/groups", { name: trimmed });
            setInviteGroupId(res.data._id);
            setName("");
            refresh();
        } catch (err) {
            Alert.alert("Error", err?.response?.data?.message || "Could not create group.");
        } finally {
            setCreating(false);
        }
    };

    const markCompleted = (id) =>
        api.put(`/groups/${id}/complete`, {}).then(refresh).catch(() => Alert.alert("Error", "Failed to complete."));

    const deleteTrip = (id, groupName) =>
        Alert.alert(`Delete "${groupName}"?`, "All expenses, notes and messages will be permanently lost.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: "destructive",
                onPress: () => api.delete(`/groups/${id}`).then(refresh).catch((e) =>
                    Alert.alert("Error", e?.response?.data?.message || "Failed to delete.")),
            },
        ]);

    const openGroup = (id) => router.push({ pathname: "/groups/[id]", params: { id, returnTo: "home" } });
    const handleLogout = async () => { await logout(); router.replace("/auth/login"); };

    const isCreator = (g) => {
        const cid = getEntityId(g?.createdBy) || g?.createdBy;
        return meId != null && String(cid) === String(meId);
    };

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
    const hasTrends = useMemo(() => analytics?.trends?.some((t) => Number(t.amount) > 0), [analytics]);
    const showCharts = hasTrends || totalCategorySpend > 0;
    const chartW = SCREEN_W - 40 - 32;

    // Hooks above this line run every render; the early return is now safe.
    if (loading && groups.length === 0 && !analytics) {
        return <View style={styles.full}><Loader size={52} label="Analyzing your budget…" /></View>;
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
                        <TouchableOpacity onPress={handleLogout} style={styles.iconBtn}>
                            <LogOut size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Create bar */}
                <View style={styles.block}>
                    <View style={[styles.createBar, inputFocused && { borderColor: colors.primary }]}>
                        <View style={styles.createBarIcon}>
                            <Users size={18} color={inputFocused ? colors.primary : colors.textSecondary} />
                        </View>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            placeholder="New group / trip name…"
                            placeholderTextColor={colors.placeholder}
                            style={styles.createBarInput}
                            selectionColor={colors.primary}
                            returnKeyType="done"
                            onFocus={() => setInputFocused(true)}
                            onBlur={() => setInputFocused(false)}
                            onSubmitEditing={createGroup}
                        />
                        <TouchableOpacity
                            onPress={createGroup}
                            disabled={creating || !name.trim()}
                            style={[styles.createBarBtn, (creating || !name.trim()) && { opacity: 0.45 }]}
                            activeOpacity={0.85}
                        >
                            {creating ? <Loader size={16} color="#fff" /> : <Plus size={16} color="#fff" strokeWidth={2.8} />}
                            <Text style={styles.createBarBtnText}>{creating ? "Adding" : "Add Trip"}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {isFetching && (
                    <View style={styles.syncPill}>
                        <Loader size={16} />
                        <Text style={styles.syncText}>Syncing…</Text>
                    </View>
                )}

                {/* Stat cards */}
                <View style={styles.statGrid}>
                    <StatCard
                        styles={styles} label="Total Groups" value={`${groups.length}`}
                        subtext="Active split groups" icon={<Users size={16} color="#0891B2" />}
                        iconBg="rgba(8,145,178,0.12)"
                    />
                    <StatCard
                        styles={styles} label="This Month"
                        value={`₹${Number(analytics?.monthlySummary?.totalSpent || 0).toLocaleString("en-IN")}`}
                        subtext={analytics?.monthlySummary?.topCategory ? `Top: ${getCategoryLabel(analytics.monthlySummary.topCategory)}` : "No spending this month"}
                        icon={<Calendar size={16} color="#10B981" />} iconBg="rgba(16,185,129,0.12)"
                    />
                    <StatCard
                        styles={styles} label="You Have to Pay"
                        value={`₹${Number(totalOwe).toLocaleString("en-IN")}`}
                        subtext={totalOwe > 0 ? "Pending across groups" : "Nothing to pay"}
                        icon={<ArrowUpRight size={16} color="#F43F5E" />} iconBg="rgba(244,63,94,0.12)"
                        valueColor={totalOwe > 0 ? "#F43F5E" : colors.text}
                    />
                    <StatCard
                        styles={styles} label="You're Owed"
                        value={`₹${Number(totalOwed).toLocaleString("en-IN")}`}
                        subtext={totalOwed > 0 ? "Pending from others" : "Nothing owed to you"}
                        icon={<Landmark size={16} color="#10B981" />} iconBg="rgba(16,185,129,0.12)"
                        valueColor={totalOwed > 0 ? "#10B981" : colors.text}
                    />
                </View>

                {/* Spending Trajectory */}
                {showCharts && hasTrends && (
                    <View style={styles.chartCard}>
                        <View style={styles.cardHeadRow}>
                            <Landmark size={16} color={CHART_CYAN} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardTitle}>Spending Trajectory</Text>
                                <Text style={styles.cardSub}>Monthly breakdown of travel settlements this year</Text>
                            </View>
                        </View>
                        <SpendingAreaChart data={analytics.trends} width={chartW} height={210} color={CHART_CYAN} colors={colors} />
                    </View>
                )}

                {/* Expense Allocations */}
                {showCharts && pieData.length > 0 && (
                    <View style={styles.chartCard}>
                        <View style={styles.cardHeadRow}>
                            <PieIcon size={16} color="#14B8A6" />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardTitle}>Expense Allocations</Text>
                                <Text style={styles.cardSub}>Distribution of shares by top categories</Text>
                            </View>
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
                    </View>
                )}

                {/* Active Trips & Groups */}
                <View style={[styles.block, { marginTop: 8 }]}>
                    <View style={styles.sectionHead}>
                        <View style={styles.sectionHeadLeft}>
                            <Users size={18} color={colors.primary} />
                            <View>
                                <Text style={styles.sectionTitle}>Active Trips & Groups</Text>
                                <Text style={styles.sectionSub}>
                                    {activeGroups.length > 0
                                        ? `${activeGroups.length} active room${activeGroups.length !== 1 ? "s" : ""}, tap any to manage`
                                        : "Create a group to start splitting"}
                                </Text>
                            </View>
                        </View>
                        {activeGroups.length > 0 && (
                            <TouchableOpacity style={styles.viewAll} onPress={() => router.push("/(tabs)/trips")}>
                                <Text style={styles.viewAllText}>View all</Text>
                                <ChevronRight size={15} color={colors.primary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {activeGroups.length > 0 ? (
                        activeGroups.slice(0, 6).map((g, i) => (
                            <GroupCard
                                key={g._id} group={g} index={i} creator={isCreator(g)}
                                styles={styles} colors={colors}
                                onOpen={openGroup} onMarkCompleted={markCompleted} onDelete={deleteTrip}
                            />
                        ))
                    ) : (
                        <View style={styles.emptyCard}>
                            <View style={styles.emptyIconBox}><Users size={28} color={colors.primary} /></View>
                            <Text style={styles.emptyTitle}>No active trips yet</Text>
                            <Text style={styles.emptyText}>Create your first group and start splitting expenses with friends.</Text>
                            <TouchableOpacity style={styles.emptyCta} onPress={() => router.push("/create-group")} activeOpacity={0.85}>
                                <Plus size={16} color="#fff" strokeWidth={2.6} />
                                <Text style={styles.emptyCtaText}>New Group</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
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
const CARD_GRADIENTS = ["#0891B2", "#14b8a6", "#0E7490", "#0284C7", "#10b981", "#7C3AED"];

function GroupCard({ group, index, creator, styles, colors, onOpen, onMarkCompleted, onDelete }) {
    const members = group.members || [];
    const names = members.map((m) => m.name || m.email);
    const accent = CARD_GRADIENTS[index % CARD_GRADIENTS.length];

    return (
        <View style={styles.card}>
            <TouchableOpacity activeOpacity={0.85} onPress={() => onOpen(group._id)} style={styles.cardBody}>
                <View style={styles.cardTopRow}>
                    <View style={styles.cardLeft}>
                        <View style={[styles.cardLetter, { backgroundColor: accent }]}>
                            <Text style={styles.cardLetterText}>{group.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardName} numberOfLines={1}>{group.name}</Text>
                            <Text style={styles.cardMeta}>{members.length} member{members.length !== 1 ? "s" : ""}</Text>
                        </View>
                    </View>
                    {creator ? (
                        <View style={styles.adminBadge}>
                            <ShieldCheck size={10} color="#10B981" />
                            <Text style={styles.adminText}>Admin</Text>
                        </View>
                    ) : (
                        <View style={styles.memberBadge}>
                            <Text style={styles.memberBadgeText}>Member</Text>
                        </View>
                    )}
                    <ArrowRight size={16} color={colors.textSecondary} style={{ marginLeft: 6 }} />
                </View>

                {members.length > 0 && (
                    <View style={styles.avatarRow}>
                        <View style={styles.avatarStack}>
                            {members.slice(0, 4).map((m, i) => {
                                const photo = m.photoURL || m.profileImage?.url;
                                const label = (m.name || m.email || "?").charAt(0).toUpperCase();
                                return (
                                    <View key={m._id || i} style={[styles.memberAvatar, { marginLeft: i === 0 ? 0 : -9, backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }]}>
                                        {photo ? <Image source={{ uri: photo }} style={styles.memberAvatarImg} /> : <Text style={styles.memberAvatarText}>{label}</Text>}
                                    </View>
                                );
                            })}
                            {members.length > 4 && (
                                <View style={[styles.memberAvatar, styles.memberMore, { marginLeft: -9 }]}>
                                    <Text style={styles.memberMoreText}>+{members.length - 4}</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.memberNames} numberOfLines={1}>
                            {names.slice(0, 2).join(", ")}{names.length > 2 ? ` +${names.length - 2} more` : ""}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>

            {creator && (
                <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => onMarkCompleted(group._id)} activeOpacity={0.7}>
                        <CheckCircle size={13} color="#10B981" />
                        <Text style={styles.actionText}>Complete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => onDelete(group._id, group.name)} activeOpacity={0.7}>
                        <Trash2 size={13} color={colors.error} />
                        <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const isCompleted = (g) => g?.isCompleted === true || g?.isCompleted === "true";
const getEntityId = (e) => (!e ? null : typeof e === "string" ? e : e._id || e.id || null);
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

    appBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12 },
    userInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
    avatarContainer: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary,
        justifyContent: "center", alignItems: "center", overflow: "hidden",
    },
    avatarImage: { width: "100%", height: "100%", borderRadius: 22 },
    avatarText: { color: "#fff", fontSize: 18, fontWeight: "700" },
    greeting: { fontSize: 12, color: colors.textSecondary, fontWeight: "500" },
    userNameTop: { fontSize: 18, fontWeight: "800", color: colors.text },
    appBarActions: { flexDirection: "row", alignItems: "center", gap: 4 },
    iconBtn: {
        width: 38, height: 38, borderRadius: 19, backgroundColor: colors.card,
        justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: colors.border,
    },

    scrollView: { flex: 1 },
    scrollContent: { paddingTop: 6, paddingBottom: 110 },
    block: { paddingHorizontal: 20, marginBottom: 16 },

    // Create bar
    createBar: {
        flexDirection: "row", alignItems: "center", height: 56, borderRadius: 8,
        backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border,
        paddingLeft: 14, paddingRight: 6,
    },
    createBarIcon: { marginRight: 8 },
    createBarInput: { flex: 1, height: "100%", paddingVertical: 0, fontSize: 15, fontWeight: "500", color: colors.text },
    createBarBtn: { flexDirection: "row", alignItems: "center", gap: 6, height: 42, paddingHorizontal: 14, borderRadius: 6, backgroundColor: CHART_CYAN },
    createBarBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

    syncPill: {
        alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, marginBottom: 16,
    },
    syncText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },

    // Stat cards
    statGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 20, gap: 12, marginBottom: 16 },
    statCard: {
        width: (SCREEN_W - 40 - 12) / 2, backgroundColor: colors.card,
        borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 14,
    },
    statTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
    statLabel: { fontSize: 11.5, color: colors.textSecondary, fontWeight: "500" },
    statValue: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: 4, letterSpacing: -0.5 },
    statIcon: { width: 34, height: 34, borderRadius: 8, justifyContent: "center", alignItems: "center" },
    statSub: { fontSize: 11, color: colors.textSecondary, marginTop: 10 },

    // Chart cards
    chartCard: {
        marginHorizontal: 20, marginBottom: 16, backgroundColor: colors.card,
        borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 16,
    },
    cardHeadRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 14 },
    cardTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
    cardSub: { fontSize: 11.5, color: colors.textSecondary, marginTop: 2 },

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

    // Section header
    sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
    sectionHeadLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
    sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
    sectionSub: { fontSize: 11.5, color: colors.textSecondary, marginTop: 2 },
    viewAll: { flexDirection: "row", alignItems: "center", gap: 2 },
    viewAllText: { fontSize: 13, fontWeight: "700", color: colors.primary },

    // Group card
    card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginBottom: 12, overflow: "hidden" },
    cardBody: { padding: 14, gap: 12 },
    cardTopRow: { flexDirection: "row", alignItems: "center" },
    cardLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
    cardLetter: { width: 42, height: 42, borderRadius: 8, justifyContent: "center", alignItems: "center" },
    cardLetterText: { color: "#fff", fontSize: 18, fontWeight: "900" },
    cardName: { fontSize: 15, fontWeight: "800", color: colors.text },
    cardMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    adminBadge: {
        flexDirection: "row", alignItems: "center", gap: 3,
        backgroundColor: isDark ? "rgba(16,185,129,0.15)" : "#ECFDF5",
        borderWidth: 1, borderColor: isDark ? "rgba(16,185,129,0.3)" : "#A7F3D0",
        paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
    },
    adminText: { fontSize: 10, fontWeight: "700", color: "#10B981" },
    memberBadge: {
        backgroundColor: isDark ? "rgba(99,102,241,0.15)" : "#EEF2FF",
        borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
    },
    memberBadgeText: { fontSize: 10, fontWeight: "700", color: colors.primary },

    avatarRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    avatarStack: { flexDirection: "row" },
    memberAvatar: {
        width: 26, height: 26, borderRadius: 13, justifyContent: "center", alignItems: "center",
        overflow: "hidden", borderWidth: 2, borderColor: colors.card,
    },
    memberAvatarImg: { width: "100%", height: "100%" },
    memberAvatarText: { color: "#fff", fontSize: 10, fontWeight: "700" },
    memberMore: { backgroundColor: isDark ? "#374151" : "#E5E7EB" },
    memberMoreText: { color: colors.textSecondary, fontSize: 9, fontWeight: "700" },
    memberNames: { flex: 1, fontSize: 11.5, color: colors.textSecondary },

    cardActions: { flexDirection: "row", gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 14, paddingVertical: 10 },
    actionBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
        paddingVertical: 9, borderRadius: 6, borderWidth: 1, borderColor: colors.border,
    },
    actionBtnDanger: { borderColor: isDark ? "rgba(248,113,113,0.3)" : "#FECACA" },
    actionText: { fontSize: 12, fontWeight: "700", color: colors.text },

    // Empty
    emptyCard: {
        backgroundColor: colors.card, borderWidth: 1, borderStyle: "dashed", borderColor: colors.border,
        borderRadius: 8, paddingVertical: 36, paddingHorizontal: 24, alignItems: "center",
    },
    emptyIconBox: { width: 56, height: 56, borderRadius: 8, backgroundColor: colors.primaryLight, justifyContent: "center", alignItems: "center", marginBottom: 14 },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 4 },
    emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: "center", lineHeight: 19 },
    emptyCta: {
        flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16,
        backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 8,
    },
    emptyCtaText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
