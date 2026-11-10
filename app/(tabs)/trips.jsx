import InviteModal from "@/components/InviteModal";
import PendingInvitesList from "@/components/invites/PendingInvitesList";
import { normalizeInviteCode } from "@/lib/inviteCode";
import { Alert } from "@/lib/alert";
import { GroupListSkeleton } from "@/components/ui/Skeleton";
import BottomSheet from "@/components/ui/BottomSheet";
import { Block, PillButton, PillInput, RoundButton, Segmented } from "@/components/ui/Design";
import AutopilotButton from "@/components/autopilot/AutopilotButton";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import { useRealtime } from "@/lib/useRealtime";
import { router } from "expo-router";
import { getGroupIcon } from "@/lib/groupIcons";
import { formatMoney, groupTypeMeta } from "@/lib/groupPresets";
import { LinearGradient } from "expo-linear-gradient";
import {
    CheckCircle2,
    ChevronRight,
    KeyRound,
    MoreHorizontal,
    Search,
    Plus,
    ScanLine,
    Trash2,
    Users,
    X
} from "lucide-react-native";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    FlatList,
    Image,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { Text } from "@/components/ui/Typography";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTabScreenBottomPadding } from "@/hooks/useSafeSpacing";
import { SCREEN_GUTTER } from "@/constants/layout";

export default function TripsPage() {
    const { token } = useAuth();
    const { colors } = useTheme();
    const tabBottomPadding = useTabScreenBottomPadding();
    const [groups, setGroups] = useState([]);
    const [view, setView] = useState("active");
    const [userId, setUserId] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const loadedOnceRef = useRef(false);
    const [refreshTick, setRefreshTick] = useState(0); // lets PendingInvitesList reload after every fetch
    const [creating, setCreating] = useState(false);
    const [inviteGroupId, setInviteGroupId] = useState(null);
    const [joinOpen, setJoinOpen] = useState(false);
    const [joinCode, setJoinCode] = useState("");
    const [menuGroup, setMenuGroup] = useState(null); // group whose "⋯" sheet is open
    // groupId -> { net, currency }: my balance in each active group, shown on its row.
    const [netByGroup, setNetByGroup] = useState({});

    const styles = useMemo(() => getStyles(colors), [colors]);

    // "You owe / you get" per group. Reuses the per-group balances call the Home
    // tab already falls back to; capped so a long list never fans out too far.
    const loadNets = async (allGroups, uid) => {
        if (!uid) return;
        const active = allGroups.filter((g) => !isGroupCompleted(g)).slice(0, MAX_BALANCE_ROWS);
        const results = await Promise.all(
            active.map((g) => api.get(`/balances/${g._id}`).catch(() => null))
        );
        const next = {};
        results.forEach((res, i) => {
            const list = res?.data?.balances;
            if (!Array.isArray(list)) return;
            const mine = list.find((b) => String(b.userId) === String(uid));
            next[active[i]._id] = {
                net: Number(mine?.balance) || 0,
                currency: active[i].settings?.currency || "INR",
            };
        });
        setNetByGroup(next);
    };

    const fetchMeAndGroups = useCallback(async ({ silent = false } = {}) => {
        try {
            // Skeleton only on the very first load - a refresh (after completing,
            // accepting an invite...) must not wipe the list back to placeholders.
            if (!loadedOnceRef.current) setLoading(true);
            const [meRes, groupsRes] = await Promise.all([
                api.get("/users/me"),
                api.get("/groups"),
            ]);

            const id = meRes?.data?._id || meRes?.data?.id || null;
            setUserId(id);

            const allGroups = Array.isArray(groupsRes?.data) ? groupsRes.data : [];
            setGroups(allGroups);
            loadNets(allGroups, id); // not awaited: rows fill in when balances arrive
        } catch (err) {
            console.warn("Failed to fetch groups:", err?.message || err);
            // A background live refresh must not pop an error over the screen.
            if (!silent) Alert.alert("Error", "Failed to load groups. Please try again.");
        } finally {
            loadedOnceRef.current = true;
            setLoading(false);
            setRefreshTick((t) => t + 1);
        }
    }, []);

    useEffect(() => {
        if (!token) return;
        fetchMeAndGroups();
    }, [token, fetchMeAndGroups]);

    // Live: any change in any of my groups (new expense, member, completed,
    // created/deleted - from web or another phone) refreshes the list.
    useRealtime({
        event: "dashboardUpdate",
        enabled: !!token,
        onChange: () => fetchMeAndGroups({ silent: true }),
    });

    const getEntityId = (entity) => {
        if (!entity) return null;
        if (typeof entity === "string") return entity;
        return entity._id || entity.id || null;
    };

    const isSameId = (left, right) =>
        left != null && right != null && String(left) === String(right);

    const getCreatedById = (group) => getEntityId(group?.createdBy) || group?.createdBy;

    const isCreatedByCurrentUser = (group) =>
        isSameId(getCreatedById(group), userId);

    const isCurrentUserMember = (group) =>
        group?.members?.some((member) => isSameId(getEntityId(member), userId));

    const markCompleted = useCallback((groupId) => {
        Alert.alert(
            "Mark as completed?",
            "This group will move to Completed. You can still open it any time.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Mark Completed",
                    onPress: async () => {
                        try {
                            await api.put(`/groups/${groupId}/complete`, {});
                            fetchMeAndGroups();
                        } catch (err) {
                            Alert.alert(
                                "Error",
                                err?.response?.data?.message || "Could not mark the group as completed. Please try again."
                            );
                        }
                    },
                },
            ]
        );
    }, [fetchMeAndGroups]);

    const deleteTrip = useCallback((groupId) => {
        Alert.alert(
            "Delete group?",
            "This will delete the group with its expenses, notes, and group messages.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await api.delete(`/groups/${groupId}`);
                            fetchMeAndGroups();
                        } catch (err) {
                            Alert.alert(
                                "Error",
                                err?.response?.data?.message || "Could not delete the group. Please try again."
                            );
                        }
                    },
                },
            ]
        );
    }, [fetchMeAndGroups]);


    const openGroupMenu = useCallback((group) => setMenuGroup(group), []);

    const createGroup = async () => {
        if (!searchQuery.trim()) return;
        try {
            setCreating(true);
            const res = await api.post("/groups", { name: searchQuery.trim() });
            setInviteGroupId(res.data._id);
            fetchMeAndGroups();
            setSearchQuery("");
        } catch (err) {
            console.warn("Error creating group:", err?.message || err);
            Alert.alert("Error", "Could not create group. Please try again.");
        } finally {
            setCreating(false);
        }
    };

    const normalizedSearch = searchQuery.trim().toLowerCase();

    // Decorate + filter + sort once per relevant change instead of every render.
    const decoratedGroups = useMemo(() => groups
        .map((group) => {
            const isCreator = isCreatedByCurrentUser(group);
            const isJoined = isCurrentUserMember(group) && !isCreator;
            return { ...group, isCreator, isJoined };
        })
        .filter((group) => {
            if (view === "owned" && !group.isCreator) return false;
            if (view === "shared" && !group.isJoined) return false;
            // "All" shows active + completed; "Done" only completed; every other
            // view (Active - the default, Mine, Shared) hides completed groups.
            if (view === "completed" && !isGroupCompleted(group)) return false;
            if (view !== "completed" && view !== "all" && isGroupCompleted(group)) return false;
            if (!normalizedSearch) return true;

            const memberText = group.members
                ?.map((member) => member?.name || member?.email || "")
                .join(" ")
                .toLowerCase();
            return `${group.name || ""} ${memberText || ""}`.toLowerCase().includes(normalizedSearch);
        })
        .sort((a, b) =>
            new Date(b.updatedAt || b.createdAt || 0).getTime() -
            new Date(a.updatedAt || a.createdAt || 0).getTime()
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, userId, view, normalizedSearch]);

    const activeGroups = useMemo(() => groups.filter((g) => !isGroupCompleted(g)), [groups]);
    const completedGroups = useMemo(() => groups.filter((g) => isGroupCompleted(g)), [groups]);

    const viewTabs = [
        { value: "active", label: `Active · ${activeGroups.length}` },
        { value: "completed", label: `Completed · ${completedGroups.length}` },
    ];

    const emptyTitleForView = {
        active: "No active groups",
        all: "No groups found",
        owned: "No groups created by you",
        shared: "No shared groups",
        completed: "No completed groups yet",
    };

    const emptyTextForView = {
        active: "Create a group or join one with an invite code.",
        all: "Create a group or join one with an invite code.",
        owned: "Groups you create will show up here.",
        shared: "Groups other people added you to will show up here.",
        completed: "Groups you mark as completed are kept here.",
    };

    const listHeader = (
        <>
                {/* Header Section — big title + round "new" action */}
                <View style={styles.header}>
                    <View style={styles.headerText}>
                        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>Groups</Text>
                    </View>
                    <View style={styles.headerActions}>
                        <AutopilotButton size={46} />
                        <RoundButton onPress={() => router.push("/create-group")} label="Create a new group">
                            <Plus size={20} color={colors.text} strokeWidth={2.4} />
                        </RoundButton>
                    </View>
                </View>

                {/* Group invites waiting for my yes / no */}
                <PendingInvitesList compact onChanged={fetchMeAndGroups} refreshKey={refreshTick} />

                {/* One line: search / name · invite-code · filter dropdown */}
                <View style={styles.searchRow}>
                    <PillInput
                        placeholder="Search groups"
                        style={styles.searchPill}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="words"
                        autoCorrect={false}
                        icon={<Search size={19} color={colors.textSecondary} strokeWidth={2} />}
                        trailing={searchQuery.length > 0 ? (
                            <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <X size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        ) : null}
                    />

                    {normalizedSearch && !loading && decoratedGroups.length === 0 ? (
                        // Nothing matches what was typed → offer to create it.
                        <PillButton
                            label={creating ? undefined : "Create"}
                            onPress={createGroup}
                            disabled={creating}
                            loading={creating}
                            icon={creating ? undefined : <Plus size={14} color={colors.onPrimary} strokeWidth={3} />}
                            style={styles.createBtn}
                        />
                    ) : (
                        <>
                            {/* Invite-code button — opens the code input below. */}
                            <RoundButton
                                onPress={() => setJoinOpen((v) => !v)}
                                label="Have an invite code?"
                                active={joinOpen}
                                size={48}
                            >
                                <KeyRound size={19} color={joinOpen ? colors.onPrimary : colors.text} strokeWidth={2.1} />
                            </RoundButton>

                        </>
                    )}
                </View>

                {/* Invite-code input (revealed by the invite button) */}
                {joinOpen && (
                    <View style={styles.joinCodeRow}>
                        <PillInput
                            placeholder="Code or invite link, e.g. K7M2QX"
                            style={styles.joinCodeInput}
                            value={joinCode}
                            onChangeText={setJoinCode}
                            autoCapitalize="characters"
                            autoCorrect={false}
                        />
                        <PillButton
                            label="Join"
                            onPress={() => {
                                // A code ("k7m 2qx"), a pasted invite link or the whole
                                // shared message all work; nonsense goes to the full screen.
                                const code = normalizeInviteCode(joinCode);
                                if (!code) {
                                    if (joinCode.trim()) router.push("/join");
                                    return;
                                }
                                setJoinOpen(false);
                                setJoinCode("");
                                router.push(`/join/${encodeURIComponent(code)}`);
                            }}
                            style={styles.joinCodeBtn}
                        />
                        <RoundButton onPress={() => { setJoinOpen(false); router.push("/join/scan"); }} label="Scan invite QR code" size={48}>
                            <ScanLine size={19} color={colors.text} strokeWidth={2.1} />
                        </RoundButton>
                    </View>
                )}

                {/* Active | Completed — always visible, so finished groups are easy to find */}
                {!loading && groups.length > 0 && (
                    <Segmented options={viewTabs} value={view} onChange={setView} style={styles.viewTabs} />
                )}

                {/* Skeleton while the first load runs */}
                {loading && <GroupListSkeleton count={5} />}
        </>
    );

    const listEmpty = () => {
        if (loading) return null;
        if (groups.length === 0) {
            return (
                <Block style={styles.emptyCard}>
                    <Users size={38} color={colors.primary} />
                    <Text style={styles.emptyTitle}>No groups yet</Text>
                    <Text style={styles.emptyText}>
                        Start one for a trip, your flat or any shared bill. Got an invite code? Tap the key above.
                    </Text>
                    <PillButton
                        label="Create a group"
                        onPress={() => router.push("/create-group")}
                        icon={<Plus size={16} color={colors.onPrimary} strokeWidth={2.6} />}
                        style={styles.emptyCta}
                    />
                </Block>
            );
        }
        return (
            <Block style={styles.emptyStateContainer}>
                <Search size={30} color={colors.textSecondary} />
                <Text style={styles.emptyStateTitle}>
                    {emptyTitleForView[view]}
                </Text>
                <Text style={styles.emptyStateText}>
                    {searchQuery
                        ? `Nothing matches “${searchQuery.trim()}”. Tap Create to start a group with that name.`
                        : emptyTextForView[view]}
                </Text>
            </Block>
        );
    };

    const renderGroupCard = useCallback(({ item }) => (
        <GroupCard
            group={item}
            balance={netByGroup[item._id]}
            onMenu={item.isCreator ? openGroupMenu : undefined}
            colors={colors}
            styles={styles}
        />
    ), [openGroupMenu, netByGroup, colors, styles]);

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <FlatList
                data={loading ? [] : decoratedGroups}
                keyExtractor={(g) => g._id}
                renderItem={renderGroupCard}
                ListHeaderComponent={listHeader}
                ListEmptyComponent={listEmpty}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBottomPadding }]}
                showsVerticalScrollIndicator={false}
                initialNumToRender={8}
                windowSize={7}
                maxToRenderPerBatch={8}
                removeClippedSubviews
                keyboardShouldPersistTaps="handled"
            />

            {/* "⋯" on a card: what you can do with this group, in plain words */}
            <BottomSheet visible={!!menuGroup} onClose={() => setMenuGroup(null)} backgroundColor={colors.background}>
                {menuGroup && (
                    <View style={styles.menu}>
                        <Text style={styles.menuTitle} numberOfLines={1}>{menuGroup.name}</Text>
                        {!isGroupCompleted(menuGroup) && (
                            <TouchableOpacity
                                style={styles.menuItem}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                onPress={() => { const id = menuGroup._id; setMenuGroup(null); markCompleted(id); }}
                            >
                                <View style={[styles.menuIcon, { backgroundColor: colors.successLight }]}>
                                    <CheckCircle2 size={20} color={colors.success} />
                                </View>
                                <View style={styles.menuCopy}>
                                    <Text style={styles.menuItemTitle}>Mark as completed</Text>
                                    <Text style={styles.menuItemSub}>
                                        Trip or bill is over? Moves it to the Completed tab. Nothing is deleted.
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.menuItem}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            onPress={() => { const id = menuGroup._id; setMenuGroup(null); deleteTrip(id); }}
                        >
                            <View style={[styles.menuIcon, { backgroundColor: colors.errorLight }]}>
                                <Trash2 size={19} color={colors.error} />
                            </View>
                            <View style={styles.menuCopy}>
                                <Text style={[styles.menuItemTitle, { color: colors.error }]}>Delete group</Text>
                                <Text style={styles.menuItemSub}>
                                    Removes the group with all its expenses for everyone. Can&apos;t be undone.
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}
            </BottomSheet>

            {/* Invite Modal */}
            <InviteModal
                groupId={inviteGroupId}
                visible={!!inviteGroupId}
                onClose={() => setInviteGroupId(null)}
            />
        </SafeAreaView>
    );
}

/* Pure helper — module scope so the reference is stable across renders. */
const isGroupCompleted = (g) =>
    g?.isCompleted === true || g?.isCompleted === "true";

/* One group = one card: who/what on top, my balance in plain words below. */
const GroupCard = memo(function GroupCard({ group, balance, onMenu, colors, styles }) {
    const meta = groupTypeMeta(group.groupType || "general");
    const Icon = getGroupIcon(group.icon) || meta.Icon;
    const done = isGroupCompleted(group);
    const count = group.members?.length || 0;
    const typeLabel = meta.key === "general" ? "Group" : meta.label;
    const net = balance ? balance.net : null;
    const owes = net != null && net < -0.01;
    const gets = net != null && net > 0.01;
    const amount = net != null ? formatMoney(Math.round(Math.abs(net)), balance.currency) : "";
    const status = done ? "Completed"
        : owes ? `You owe ${amount}`
        : gets ? `You get back ${amount}`
        : net != null ? "All settled up" : "";
    const statusColor = done ? colors.textSecondary : owes ? colors.error : gets ? colors.success : colors.textSecondary;

    return (
        <TouchableOpacity
            onPress={() => router.push(`/groups/${group._id}`)}
            style={styles.groupCard}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Open ${group.name}${status ? `, ${status}` : ""}`}
        >
            <View style={styles.cardTop}>
                {group.photo?.url ? (
                    <Image source={{ uri: group.photo.url }} style={styles.groupAvatar} />
                ) : (
                    <LinearGradient colors={meta.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.groupAvatar}>
                        <Icon size={22} color="#fff" strokeWidth={2.2} />
                    </LinearGradient>
                )}

                <View style={styles.cardText}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{group.name}</Text>
                    <Text style={styles.cardSub} numberOfLines={1}>
                        {typeLabel} · {count} {count === 1 ? "member" : "members"}
                    </Text>
                </View>

                {onMenu ? (
                    <TouchableOpacity
                        onPress={() => onMenu(group)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.cardMenuBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`More options for ${group.name}`}
                    >
                        <MoreHorizontal size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                ) : null}
            </View>

            <View style={styles.cardBottom}>
                <View style={styles.cardStatus}>
                    {done ? <CheckCircle2 size={15} color={colors.textSecondary} /> : null}
                    <Text style={[styles.cardStatusText, { color: statusColor }]} numberOfLines={1}>
                        {status || " "}
                    </Text>
                </View>
                <View style={styles.cardOpen}>
                    <Text style={styles.cardOpenText}>Open</Text>
                    <ChevronRight size={16} color={colors.textSecondary} />
                </View>
            </View>
        </TouchableOpacity>
    );
});

const MAX_BALANCE_ROWS = 12;

const getStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    joinCodeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginHorizontal: SCREEN_GUTTER,
        marginBottom: 12,
    },
    joinCodeInput: {
        flex: 1,
    },
    joinCodeBtn: {
        paddingHorizontal: 20,
    },
    scrollContent: {
        paddingTop: 10,
        paddingBottom: 150, // Space for bottom nav and FAB
    },
    header: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 20,
        paddingHorizontal: SCREEN_GUTTER,
        paddingTop: 8,
    },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
    headerText: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        fontSize: 30,
        fontWeight: "700",
        color: colors.text,
        letterSpacing: -0.3,
    },
    searchRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: SCREEN_GUTTER,
        marginBottom: 16,
        zIndex: 20,
    },
    searchPill: {
        flex: 1,
    },
    createBtn: {
        paddingHorizontal: 18,
    },
    emptyCard: {
        alignItems: "center",
        paddingVertical: 48,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.text,
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: "center",
        marginBottom: 16,
    },
    emptyCta: {
        alignSelf: "stretch",
        marginTop: 4,
    },
    viewTabs: {
        marginHorizontal: SCREEN_GUTTER,
        marginBottom: 16,
    },
    groupCard: {
        marginHorizontal: SCREEN_GUTTER,
        marginBottom: 12,
        borderRadius: 22,
        backgroundColor: colors.card,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        overflow: "hidden",
    },
    cardTop: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 14,
    },
    groupAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    cardText: { flex: 1, minWidth: 0, gap: 3 },
    cardTitle: { fontSize: 17, fontWeight: "600", color: colors.text, letterSpacing: -0.2 },
    cardSub: { fontSize: 13.5, color: colors.textSecondary },
    cardMenuBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primaryLight,
    },
    cardBottom: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
    },
    cardStatus: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 6 },
    cardStatusText: { fontSize: 15, fontWeight: "700", letterSpacing: -0.2, flexShrink: 1 },
    cardOpen: { flexDirection: "row", alignItems: "center", gap: 2 },
    cardOpenText: { fontSize: 13.5, fontWeight: "600", color: colors.textSecondary },
    menu: { paddingBottom: 8 },
    menuTitle: { fontSize: 17, fontWeight: "700", color: colors.text, marginBottom: 8 },
    menuItem: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12 },
    menuIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    menuCopy: { flex: 1, minWidth: 0, gap: 2 },
    menuItemTitle: { fontSize: 16.5, fontWeight: "600", color: colors.text, letterSpacing: -0.2 },
    menuItemSub: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 18 },
    emptyStateContainer: {
        paddingVertical: 48,
        alignItems: "center",
    },
    emptyStateTitle: {
        marginTop: 12,
        marginBottom: 6,
        fontSize: 16,
        fontWeight: "800",
        color: colors.text,
    },
    emptyStateText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: "center",
    },
});
