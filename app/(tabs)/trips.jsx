import InviteModal from "@/components/InviteModal";
import { Loader } from "@/components/Loader";
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
    LogIn,
    Plane,
    Search,
    Plus,
    Trash2,
    UserPlus,
    Users,
    X
} from "lucide-react-native";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TripsPage() {
    const { token } = useAuth();
    const { colors } = useTheme();
    const [groups, setGroups] = useState([]);
    const [view, setView] = useState("all");
    const [userId, setUserId] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [inviteGroupId, setInviteGroupId] = useState(null);
    const [createType, setCreateType] = useState("trip");
    const [joinOpen, setJoinOpen] = useState(false);
    const [joinCode, setJoinCode] = useState("");

    const styles = useMemo(() => getStyles(colors), [colors]);

    const fetchMeAndGroups = useCallback(async () => {
        try {
            setLoading(true);
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
            setLoading(false);
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
            const res = await api.post("/groups", { name: searchQuery.trim(), groupType: createType });
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
                {/* Header Section */}
                <View style={[styles.header, { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }]}>
                    <View style={[styles.headerTextContainer, { flex: 1 }]}>
                        <View style={styles.titleRow}>
                            <Image
                                source={require("../../assets/images/logo-mark.png")}
                                style={styles.titleLogo}
                                resizeMode="contain"
                            />
                            <Text style={styles.title}>SplitEase</Text>
                        </View>
                        <Text style={styles.subtitle}>
                            Find owned and shared trips without digging through groups.
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => router.push("/create-group")}
                        activeOpacity={0.85}
                        style={{
                            flexDirection: "row", alignItems: "center", gap: 6,
                            backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 10,
                            borderRadius: 999, marginTop: 4,
                        }}
                    >
                        <Plus size={16} color="#fff" strokeWidth={2.6} />
                        <Text style={{ color: "#fff", fontSize: 13.5, fontWeight: "700" }}>New</Text>
                    </TouchableOpacity>
                </View>

                {/* Join with code */}
                {!joinOpen ? (
                    <TouchableOpacity
                        style={styles.joinCodeToggle}
                        onPress={() => setJoinOpen(true)}
                        activeOpacity={0.7}
                    >
                        <LogIn size={15} color={colors.primary} />
                        <Text style={styles.joinCodeToggleText}>Have an invite code? Join a group</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.joinCodeRow}>
                        <TextInput
                            placeholder="Enter invite code"
                            placeholderTextColor={colors.textSecondary || "#9CA3AF"}
                            style={styles.joinCodeInput}
                            value={joinCode}
                            onChangeText={setJoinCode}
                            autoCapitalize="none"
                            autoCorrect={false}
                            selectionColor={colors.primary}
                        />
                        <TouchableOpacity
                            onPress={() => {
                                const code = joinCode.trim();
                                if (!code) return;
                                setJoinOpen(false);
                                setJoinCode("");
                                router.push(`/join/${encodeURIComponent(code)}`);
                            }}
                            style={styles.joinCodeBtn}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.joinCodeBtnText}>Join</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setJoinOpen(false); setJoinCode(""); }} style={{ padding: 6 }}>
                            <X size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Unified Search & Create */}
                <View style={styles.unifiedInputContainer}>
                    <Search size={20} color={colors.textSecondary} />
                    <TextInput
                        placeholder={createType === "trip" ? "Search or name a new trip…" : "Search or name roommate split…"}
                        placeholderTextColor={colors.textSecondary || "#9CA3AF"}
                        style={styles.unifiedInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        selectionColor={colors.primary}
                        autoCapitalize="words"
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery("")} style={{ marginRight: 8, padding: 4 }}>
                            <X size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
                            onPress={createGroup}
                            disabled={creating}
                            style={[
                                styles.unifiedCreateBtn,
                                createType === "roommate" && { backgroundColor: "#10B981" },
                                creating && styles.unifiedCreateBtnDisabled,
                            ]}
                        >
                            {creating ? (
                                <Loader size={18} color="#fff" />
                            ) : (
                                <>
                                    <Plus size={14} color="white" strokeWidth={3} />
                                    <Text style={styles.unifiedCreateBtnText}>Create</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                {searchQuery.length > 0 && (
                    <View style={styles.typeSwitcherContainer}>
                        <TouchableOpacity
                            onPress={() => setCreateType("trip")}
                            style={[
                                styles.typeSwitcherButton,
                                createType === "trip" && styles.typeSwitcherActiveTrip,
                            ]}
                            activeOpacity={0.8}
                        >
                            <Plane size={14} color={createType === "trip" ? "white" : colors.textSecondary} />
                            <Text
                                style={[
                                    styles.typeSwitcherText,
                                    createType === "trip" && styles.typeSwitcherTextActive,
                                ]}
                            >
                                Trip Split
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setCreateType("roommate")}
                            style={[
                                styles.typeSwitcherButton,
                                createType === "roommate" && styles.typeSwitcherActiveRoom,
                            ]}
                            activeOpacity={0.8}
                        >
                            <Home size={14} color={createType === "roommate" ? "white" : colors.textSecondary} />
                            <Text
                                style={[
                                    styles.typeSwitcherText,
                                    createType === "roommate" && styles.typeSwitcherTextActive,
                                ]}
                            >
                                Roommate Split
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Search and filters */}
                {!loading && groups.length > 0 && (
                    <View style={styles.finder}>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.tabsContainer}
                        >
                            {filterTabs.map((tab) => {
                                const active = view === tab.key;
                                return (
                                    <TouchableOpacity
                                        key={tab.key}
                                        onPress={() => setView(tab.key)}
                                        style={[
                                            styles.tab,
                                            active ? styles.tabActive : styles.tabInactive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.tabText,
                                                active ? styles.tabTextActive : styles.tabTextInactive,
                                            ]}
                                        >
                                            {tab.label}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.tabCount,
                                                active ? styles.tabCountActive : styles.tabCountInactive,
                                            ]}
                                        >
                                            {tab.count}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {/* Loader */}
                {loading && (
                    <View style={styles.loadingContainer}>
                        <Loader size={48} />
                    </View>
                )}
        </>
    );

    const listEmpty = () => {
        if (loading) return null;
        if (groups.length === 0) {
            return (
                <View style={styles.emptyCard}>
                    <Users size={38} color={colors.primary} />
                    <Text style={styles.emptyTitle}>No groups yet</Text>
                    <Text style={styles.emptyText}>
                        Create your first group above and start splitting expenses.
                    </Text>
                    <Text style={styles.emptyQuote}>
                        &quot;Good trips become great when expenses stay fair.&quot;
                    </Text>
                </View>
            );
        }
        return (
            <View style={styles.emptyStateContainer}>
                <Search size={30} color={colors.textSecondary} />
                <Text style={styles.emptyStateTitle}>
                    {emptyTitleForView[view]}
                </Text>
                <Text style={styles.emptyStateText}>
                    {searchQuery
                        ? "Try a different trip name or member name."
                        : emptyTextForView[view]}
                </Text>
            </View>
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
        <SafeAreaView style={styles.container}>
            <FlatList
                data={loading ? [] : decoratedGroups}
                keyExtractor={(g) => g._id}
                renderItem={renderGroupCard}
                ListHeaderComponent={listHeader}
                ListEmptyComponent={listEmpty}
                contentContainerStyle={styles.scrollContent}
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
                                <UserPlus size={13} color="#7C3AED" />
                            )}
                            <Text style={[styles.ownerBadgeText, isCreator ? styles.ownedBadgeText : styles.sharedBadgeText]}>
                                {isCreator ? "Owned" : "Shared"}
                            </Text>
                        </View>
                        <View style={[
                            styles.typeBadge,
                            group.groupType === "roommate" ? styles.roommateBadge : styles.tripBadge
                        ]}>
                            {group.groupType === "roommate" ? (
                                <Home size={11} color="#047857" />
                            ) : (
                                <Plane size={11} color="#4F46E5" />
                            )}
                            <Text style={[
                                styles.typeBadgeText,
                                group.groupType === "roommate" ? styles.roommateBadgeText : styles.tripBadgeText
                            ]}>
                                {group.groupType === "roommate" ? "Roommate" : "Trip"}
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
                    <Trash2 size={15} color="#DC2626" />
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
        marginBottom: -25,
    },
    joinCodeToggle: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginHorizontal: 20,
        marginBottom: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
    },
    joinCodeToggleText: {
        fontSize: 13,
        fontWeight: "600",
        color: colors.primary,
    },
    joinCodeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginHorizontal: 20,
        marginBottom: 12,
    },
    joinCodeInput: {
        flex: 1,
        height: 46,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        paddingHorizontal: 14,
        fontSize: 14,
        color: colors.text,
    },
    joinCodeBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: 18,
        height: 46,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    joinCodeBtnText: {
        color: "#FFFFFF",
        fontWeight: "700",
        fontSize: 14,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 10,
        paddingBottom: 150, // Space for bottom nav and FAB
    },
    header: {
        marginBottom: 24,
        paddingHorizontal: 24,
    },
    headerTextContainer: {
        marginBottom: 16,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 4,
    },
    titleLogo: {
        width: 35,
        height: 28,
    },
    title: {
        fontSize: 28,
        fontWeight: "800",
        color: colors.primary,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    unifiedInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderTopWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 24,
        paddingVertical: 12,
        marginBottom: 20,
    },
    unifiedInput: {
        flex: 1,
        fontSize: 16,
        color: colors.text || '#000000',
        paddingVertical: 8,
        minHeight: 40,
        marginLeft: 10,
    },
    unifiedCreateBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: colors.primary,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
    },
    unifiedCreateBtnDisabled: {
        opacity: 0.5,
    },
    unifiedCreateBtnText: {
        color: "white",
        fontSize: 13,
        fontWeight: "700",
    },
    finder: {
        gap: 12,
        marginBottom: 20,
    },
    tabsContainer: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 24,
    },
    tab: {
        minWidth: 76,
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        flexDirection: "row",
        gap: 6,
    },
    tabActive: {
        backgroundColor: colors.primary,
        borderColor: "transparent",
    },
    tabInactive: {
        backgroundColor: colors.card,
        borderColor: colors.border,
    },
    tabText: {
        fontSize: 14,
        fontWeight: "600",
    },
    tabCount: {
        minWidth: 22,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 999,
        overflow: "hidden",
        textAlign: "center",
        fontSize: 11,
        fontWeight: "700",
    },
    tabTextActive: {
        color: "white",
    },
    tabTextInactive: {
        color: colors.textSecondary,
    },
    tabCountActive: {
        color: colors.primary,
        backgroundColor: "white",
    },
    tabCountInactive: {
        color: colors.textSecondary,
        backgroundColor: colors.inputBackground,
    },
    loadingContainer: {
        paddingVertical: 60,
        alignItems: "center",
    },
    emptyCard: {
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 24,
        paddingVertical: 60,
        alignItems: "center",
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.primary,
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
    groupsContainer: {
        gap: 14,
    },
    summaryRow: {
        flexDirection: "row",
        gap: 8,
        flexWrap: "wrap",
    },
    summaryItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    summaryText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: "700",
    },
    section: {
        gap: 0,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.primary,
        marginBottom: 4,
    },
    groupCard: {
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderColor: colors.border,
        paddingVertical: 20,
        paddingHorizontal: 24,
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
        backgroundColor: "#F3E8FF",
    },
    ownerBadgeText: {
        fontSize: 11,
        fontWeight: "800",
    },
    ownedBadgeText: {
        color: colors.primary,
    },
    sharedBadgeText: {
        color: "#7C3AED",
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
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
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
        fontSize: 14,
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
        borderRadius: 4,
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
        color: "#DC2626",
        fontSize: 14,
        fontWeight: "700",
    },
    emptyStateContainer: {
        paddingVertical: 60,
        paddingHorizontal: 24,
        alignItems: "center",
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderColor: colors.border,
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
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContent: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 24,
        width: "100%",
        maxWidth: 400,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: colors.text,
    },
    modalText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 16,
    },
    linkContainer: {
        backgroundColor: colors.background,
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    linkText: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: "500",
    },
    shareButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: colors.primary,
        padding: 14,
        borderRadius: 8,
        marginBottom: 12,
    },
    shareButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "600",
    },
    closeButton: {
        padding: 12,
        alignItems: "center",
    },
    closeButtonText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: "600",
    },
    // Type switcher styles
    typeSwitcherContainer: {
        flexDirection: "row",
        backgroundColor: "rgba(0,0,0,0.03)",
        borderRadius: 12,
        padding: 4,
        marginHorizontal: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    typeSwitcherButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 8,
        borderRadius: 8,
    },
    typeSwitcherActiveTrip: {
        backgroundColor: colors.primary,
    },
    typeSwitcherActiveRoom: {
        backgroundColor: "#10B981",
    },
    typeSwitcherText: {
        fontSize: 13,
        fontWeight: "600",
        color: colors.textSecondary,
    },
    typeSwitcherTextActive: {
        color: "white",
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
        backgroundColor: "#E0E7FF",
    },
    tripBadgeText: {
        color: "#4F46E5",
        fontSize: 11,
        fontWeight: "800",
    },
});
