import InviteModal from "@/components/InviteModal";
import PendingInvitesList from "@/components/invites/PendingInvitesList";
import { Alert } from "@/lib/alert";
import { GroupListSkeleton } from "@/components/ui/Skeleton";
import { Block, PillButton, PillInput, RoundButton } from "@/components/ui/Design";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import { router } from "expo-router";
import {
    CalendarDays,
    CheckCircle,
    ChevronsRight,
    Crown,
    Home,
    KeyRound,
    ListFilter,
    Plane,
    Search,
    Plus,
    Trash2,
    UserPlus,
    Users,
    X
} from "lucide-react-native";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    FlatList,
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
    const [view, setView] = useState("all");
    const [userId, setUserId] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const loadedOnceRef = useRef(false);
    const [refreshTick, setRefreshTick] = useState(0); // lets PendingInvitesList reload after every fetch
    const [creating, setCreating] = useState(false);
    const [inviteGroupId, setInviteGroupId] = useState(null);
    const [joinOpen, setJoinOpen] = useState(false);
    const [joinCode, setJoinCode] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);

    const styles = useMemo(() => getStyles(colors), [colors]);

    const fetchMeAndGroups = useCallback(async () => {
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

            const allGroups = groupsRes?.data || [];
            setGroups(allGroups);
        } catch (err) {
            console.warn("Failed to fetch groups:", err?.message || err);
            Alert.alert("Error", "Failed to load groups. Please try again.");
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

    const markCompleted = useCallback(async (groupId) => {
        try {
            await api.put(`/groups/${groupId}/complete`, {});
            fetchMeAndGroups();
        } catch (_err) {
            console.error("Failed to mark as completed");
        }
    }, [fetchMeAndGroups]);

    const deleteTrip = useCallback((groupId) => {
        Alert.alert(
            "Delete trip?",
            "This will delete the trip with its expenses, notes, and group messages.",
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
                                err?.response?.data?.message || "Could not delete trip. Please try again."
                            );
                        }
                    },
                },
            ]
        );
    }, [fetchMeAndGroups]);


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
            if (view === "completed" && !isGroupCompleted(group)) return false;
            if (view !== "completed" && isGroupCompleted(group)) return false;
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

    const filterTabs = useMemo(() => [
        { key: "all", label: "All", count: activeGroups.length },
        { key: "owned", label: "Mine", count: activeGroups.filter(isCreatedByCurrentUser).length },
        { key: "shared", label: "Shared", count: activeGroups.filter((g) => isCurrentUserMember(g) && !isCreatedByCurrentUser(g)).length },
        { key: "completed", label: "Done", count: completedGroups.length },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [activeGroups, completedGroups, userId]);

    const emptyTitleForView = {
        all: "No active trips found",
        owned: "No trips created by you",
        shared: "No shared trips found",
        completed: "No completed trips yet",
    };

    const emptyTextForView = {
        all: "Create a trip or join one from an invite to see it here.",
        owned: "Trips you create will appear here with an owned badge.",
        shared: "Trips where another user added you will appear here.",
        completed: "Completed trips stay searchable here for later reference.",
    };

    const listHeader = (
        <>
                {/* Header Section — big title + round "new" action */}
                <View style={styles.header}>
                    <View style={styles.headerText}>
                        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>SplitEase</Text>
                        <Text style={styles.subtitle}>
                            Find owned and shared trips without digging through groups.
                        </Text>
                    </View>
                    <RoundButton onPress={() => router.push("/create-group")} label="Create a new group">
                        <Plus size={20} color={colors.text} strokeWidth={2.4} />
                    </RoundButton>
                </View>

                {/* Group invites waiting for my yes / no */}
                <PendingInvitesList compact onChanged={fetchMeAndGroups} refreshKey={refreshTick} />

                {/* One line: search / name · invite-code · filter dropdown */}
                <View style={styles.searchRow}>
                    <PillInput
                        placeholder="Search or name a group…"
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

                    {searchQuery.length > 0 ? (
                        // Typing a name → the row becomes "create this group".
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
                                onPress={() => { setJoinOpen((v) => !v); setFilterOpen(false); }}
                                label="Have an invite code?"
                                active={joinOpen}
                                size={48}
                            >
                                <KeyRound size={19} color={joinOpen ? colors.onPrimary : colors.text} strokeWidth={2.1} />
                            </RoundButton>

                            {/* Filter button — opens a full-width option list below. */}
                            <RoundButton
                                onPress={() => { setFilterOpen((v) => !v); setJoinOpen(false); }}
                                label="Filter groups"
                                active={filterOpen}
                                size={48}
                            >
                                <ListFilter size={19} color={filterOpen ? colors.onPrimary : colors.text} strokeWidth={2.1} />
                            </RoundButton>
                        </>
                    )}
                </View>

                {/* Filter options — simple pills in a line (not a boxed list). */}
                {filterOpen && (
                    <View style={styles.filterMenu}>
                        {filterTabs.map((tab) => {
                            const selected = view === tab.key;
                            return (
                                <TouchableOpacity
                                    key={tab.key}
                                    style={[styles.filterPill, selected && styles.filterPillActive]}
                                    onPress={() => { setView(tab.key); setFilterOpen(false); }}
                                    activeOpacity={0.75}
                                >
                                    <Text style={[styles.filterPillText, selected && styles.filterPillTextActive]}>
                                        {tab.label} {tab.count}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* Invite-code input (revealed by the invite button) */}
                {joinOpen && (
                    <View style={styles.joinCodeRow}>
                        <PillInput
                            placeholder="6-character code, e.g. K7M2QX"
                            style={styles.joinCodeInput}
                            value={joinCode}
                            onChangeText={setJoinCode}
                            autoCapitalize="characters"
                            autoCorrect={false}
                        />
                        <PillButton
                            label="Join"
                            onPress={() => {
                                // "k7m 2qx" -> "K7M2QX"; old long links pass through as typed.
                                const raw = joinCode.trim();
                                const compact = raw.replace(/[\s-]/g, "").toUpperCase();
                                const code = /^[A-Z2-9]{6}$/.test(compact) ? compact : raw;
                                if (!code) return;
                                setJoinOpen(false);
                                setJoinCode("");
                                router.push(`/join/${encodeURIComponent(code)}`);
                            }}
                            style={styles.joinCodeBtn}
                        />
                    </View>
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
                        Create your first group above and start splitting expenses.
                    </Text>
                    <Text style={styles.emptyQuote}>
                        &quot;Good trips become great when expenses stay fair.&quot;
                    </Text>
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
                        ? "Try a different trip name or member name."
                        : emptyTextForView[view]}
                </Text>
            </Block>
        );
    };

    const renderGroupCard = useCallback(({ item }) => (
        <GroupCard
            group={item}
            onMarkCompleted={markCompleted}
            onDeleteTrip={deleteTrip}
            isCreator={item.isCreator}
            view={view}
            colors={colors}
            styles={styles}
            isGroupCompleted={isGroupCompleted}
        />
    ), [markCompleted, deleteTrip, view, colors, styles]);

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

/* Group Card Component (memoized so unchanged rows skip re-render) */
const GroupCard = memo(function GroupCard({ group, isCreator = false, view = "all", onMarkCompleted, onDeleteTrip, colors, styles, isGroupCompleted }) {
    const handlePress = () => {
        // Navigate to group details
        router.push(`/groups/${group._id}`);
    };

    const handleCheckboxPress = () => {
        if (onMarkCompleted) {
            onMarkCompleted(group._id);
        }
    };

    const handleDeletePress = () => {
        if (onDeleteTrip) {
            onDeleteTrip(group._id);
        }
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            style={styles.groupCard}
            activeOpacity={0.7}
        >
            <View style={styles.groupCardHeader}>
                <View style={styles.groupTitleWrap}>
                    <View style={styles.badgeRow}>
                        <View style={[styles.ownerBadge, isCreator ? styles.ownedBadge : styles.sharedBadge]}>
                            {isCreator ? (
                                <Crown size={13} color={colors.primary} />
                            ) : (
                                <UserPlus size={13} color={colors.textSecondary} />
                            )}
                            <Text style={[styles.ownerBadgeText, isCreator ? styles.ownedBadgeText : styles.sharedBadgeText]}>
                                {isCreator ? "Owned" : "Shared"}
                            </Text>
                        </View>
                        <View style={[
                            styles.typeBadge,
                            group.groupType === "roommate"
                                ? styles.roommateBadge
                                : group.groupType === "trip"
                                    ? styles.tripBadge
                                    : styles.groupBadge
                        ]}>
                            {group.groupType === "roommate" ? (
                                <Home size={11} color="#047857" />
                            ) : group.groupType === "trip" ? (
                                <Plane size={11} color={colors.primary} />
                            ) : (
                                <Users size={11} color={colors.primary} />
                            )}
                            <Text style={[
                                styles.typeBadgeText,
                                group.groupType === "roommate"
                                    ? styles.roommateBadgeText
                                    : group.groupType === "trip"
                                        ? styles.tripBadgeText
                                        : styles.groupBadgeText
                            ]}>
                                {group.groupType === "roommate"
                                    ? "Roommate"
                                    : group.groupType === "trip"
                                        ? "Trip"
                                        : "Group"}
                            </Text>
                        </View>
                        {isGroupCompleted(group) && (
                            <View style={styles.doneBadge}>
                                <CheckCircle size={13} color="#059669" />
                                <Text style={styles.doneBadgeText}>Done</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.groupCardTitle} numberOfLines={2}>
                        {group.name}
                    </Text>
                </View>
                <ChevronsRight size={20} color={colors.textSecondary} />
            </View>

            <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                    <Users size={14} color={colors.textSecondary} />
                    <Text style={styles.groupCardMembers}>
                        {group.members?.length || 0} members
                    </Text>
                </View>
                {(group.updatedAt || group.createdAt) && (
                    <View style={styles.metaItem}>
                        <CalendarDays size={14} color={colors.textSecondary} />
                        <Text style={styles.groupCardMembers}>
                            {formatShortDate(group.updatedAt || group.createdAt)}
                        </Text>
                    </View>
                )}
            </View>

            {group.members?.length > 0 && (
                <Text style={styles.groupCardMembersList} numberOfLines={1}>
                    {group.members
                        .slice(0, 3)
                        .map((m) => m.name || m.email)
                        .join(", ")}
                    {group.members.length > 3 ? "…" : ""}
                </Text>
            )}

            {/* Mark Completed */}
            {isCreator && view !== "completed" && !isGroupCompleted(group) && (
                <TouchableOpacity
                    onPress={handleCheckboxPress}
                    style={styles.checkboxContainer}
                >
                    <View
                        style={[
                            styles.checkbox,
                            isGroupCompleted(group) && styles.checkboxChecked,
                        ]}
                    >
                        {isGroupCompleted(group) && (
                            <CheckCircle size={14} color={colors.primary} />
                        )}
                    </View>
                    <Text style={styles.checkboxLabel}>Mark as Completed</Text>
                </TouchableOpacity>
            )}

            {/* Completed Label */}
            {view === "completed" && (
                <View style={styles.completedLabel}>
                    <CheckCircle size={16} color={colors.primary} />
                    <Text style={styles.completedLabelText}>Trip Completed</Text>
                </View>
            )}

            {isCreator && (
                <TouchableOpacity
                    onPress={handleDeletePress}
                    style={styles.deleteTripButton}
                >
                    <Trash2 size={15} color={colors.error} />
                    <Text style={styles.deleteTripButtonText}>Delete Trip</Text>
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
});

const formatShortDate = (dateValue) => {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "Recent";

    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    });
};

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
    subtitle: {
        fontSize: 13.5,
        color: colors.textSecondary,
        marginTop: 4,
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
    filterMenu: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
        marginHorizontal: SCREEN_GUTTER,
        marginBottom: 12,
    },
    filterPill: {
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 999,
        backgroundColor: colors.card,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
    },
    filterPillActive: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primary,
    },
    filterPillText: {
        fontSize: 13.5,
        fontWeight: "600",
        color: colors.textSecondary,
    },
    filterPillTextActive: {
        color: colors.primary,
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
    emptyQuote: {
        fontSize: 12,
        color: colors.placeholder,
        fontStyle: "italic",
        textAlign: "center",
    },
    groupCard: {
        marginHorizontal: SCREEN_GUTTER,
        marginBottom: 12,
        borderRadius: 22,
        backgroundColor: colors.card,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        paddingVertical: 16,
        paddingHorizontal: 16,
        gap: 8,
    },
    groupCardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 10,
    },
    groupTitleWrap: {
        flex: 1,
        gap: 7,
    },
    badgeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
    },
    ownerBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    ownedBadge: {
        backgroundColor: colors.primaryLight,
    },
    sharedBadge: {
        backgroundColor: colors.primaryLight,
    },
    ownerBadgeText: {
        fontSize: 11,
        fontWeight: "800",
    },
    ownedBadgeText: {
        color: colors.primary,
    },
    sharedBadgeText: {
        color: colors.textSecondary,
    },
    doneBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: "#D1FAE5",
    },
    doneBadgeText: {
        color: "#047857",
        fontSize: 11,
        fontWeight: "800",
    },
    groupCardTitle: {
        fontSize: 16.5,
        fontWeight: "600",
        color: colors.text,
        letterSpacing: -0.2,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
    },
    metaItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    groupCardMembers: {
        fontSize: 13.5,
        color: colors.textSecondary,
    },
    groupCardMembersList: {
        fontSize: 12,
        color: colors.placeholder,
    },
    checkboxContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 8,
    },
    checkbox: {
        width: 18,
        height: 18,
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: 6,
        justifyContent: "center",
        alignItems: "center",
    },
    checkboxChecked: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primary,
    },
    checkboxLabel: {
        fontSize: 14,
        color: colors.text,
    },
    completedLabel: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 8,
    },
    completedLabelText: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.primary,
    },
    deleteTripButton: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: 6,
        marginTop: 8,
        paddingVertical: 6,
    },
    deleteTripButtonText: {
        color: colors.error,
        fontSize: 14,
        fontWeight: "700",
    },
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
    // Group Type badges
    typeBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    roommateBadge: {
        backgroundColor: "#D1FAE5",
    },
    roommateBadgeText: {
        color: "#047857",
        fontSize: 11,
        fontWeight: "800",
    },
    tripBadge: {
        backgroundColor: colors.primaryLight,
    },
    tripBadgeText: {
        color: colors.primary,
        fontSize: 11,
        fontWeight: "800",
    },
    groupBadge: {
        backgroundColor: colors.primaryLight,
    },
    groupBadgeText: {
        color: colors.primary,
        fontSize: 11,
        fontWeight: "800",
    },
});
