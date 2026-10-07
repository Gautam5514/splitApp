import { useBottomSpacing } from "@/hooks/useSafeSpacing";
import { Alert } from "@/lib/alert";
import { SCREEN_GUTTER } from "@/constants/layout";
import { surfaceStyle } from "@/constants/design";
import AddExpenseModal from "@/components/AddExpenseModal";
import { RowListSkeleton, StatCardsSkeleton } from "@/components/ui/Skeleton";
import GroupBalanceSection from "@/components/GroupBalanceSection";
import InviteModal from "@/components/InviteModal";
import AddPeopleSheet from "@/components/people/AddPeopleSheet";
import GroupSettingsSheet from "@/components/group/GroupSettingsSheet";
import GroupTypeCard from "@/components/group/GroupTypeCard";
import PendingMembers from "@/components/group/PendingMembers";
import { formatMoney, groupTypeMeta } from "@/lib/groupPresets";
import NotepadSection from "@/components/Notepad/NotepadSection";
import OcrViewModal from "@/components/OcrViewModal";
import { Block, IconCircle, ListRow, PillButton, RoundButton, ScreenHeader, SectionLabel, useDesign } from "@/components/ui/Design";
import { useAuth } from "@/context/AuthContext";
import GroupAvatarSheet from "@/components/group/GroupAvatarSheet";
import { api } from "@/lib/api";
import socket, { connectSocket } from "@/lib/socket";
import { router, useLocalSearchParams } from "expo-router";
import {
    Bus,
    CheckCircle2,
    ChevronRight,
    Coffee,
    LogOut,
    Settings2,
    CreditCard,
    Eye,
    FileText,
    Gift,
    Home,
    Camera,
    MoreVertical,
    NotebookPen,
    Plus,
    Receipt,
    ShoppingBag,
    Trash2,
    UserPlus,
    Users,
    Utensils,
    Wallet2,
    X
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
    FlatList,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { Text } from "@/components/ui/Typography";
import { SafeAreaView } from "react-native-safe-area-context";

const categoryIcons = {
    food: Utensils,
    travel: Bus,
    shopping: ShoppingBag,
    gift: Gift,
    bills: CreditCard,
    rent: Home,
    coffee: Coffee,
    misc: FileText,
};

export default function GroupDetailPage() {
    const { colors, isDark, t } = useDesign();
    const bottomSpacing = useBottomSpacing(100);
    const sheetBottomPadding = useBottomSpacing(20);
    const { token, loading: authLoading } = useAuth();
    const params = useLocalSearchParams();
    const groupId = params?.id;
    const returnTo = params?.returnTo;

    const [group, setGroup] = useState(null);
    // A ref (not `group`) because socket/effect callbacks hold stale closures.
    const hasGroupRef = useRef(false);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [expensesLoaded, setExpensesLoaded] = useState(false);
    const [balances, setBalances] = useState(null);
    const [pendingSettlements, setPendingSettlements] = useState([]);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showOcrModal, setShowOcrModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [selectedOcr, setSelectedOcr] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);
    const [showMemberExpensesModal, setShowMemberExpensesModal] = useState(false);
    const [userId, setUserId] = useState(null);
    const [prefillDesc, setPrefillDesc] = useState("");
    const [prefillCat, setPrefillCat] = useState("general");
    const [summary, setSummary] = useState(null);
    const [pendingMembers, setPendingMembers] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showAddPeople, setShowAddPeople] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showMembers, setShowMembers] = useState(false);

    const handleCloseExpenseModal = () => {
        setShowExpenseModal(false);
        setPrefillDesc("");
        setPrefillCat("general");
    };

    const styles = getStyles(colors, isDark, t);

    const fetchGroup = async () => {
        try {
            // Skeleton only until the group first arrives; refreshes keep the screen.
            if (!hasGroupRef.current) setLoading(true);
            const res = await api.get(`/groups/${groupId}`);
            setGroup(res.data);
            hasGroupRef.current = true;
            setLoadError(null);
        } catch (e) {
            console.error(
                "Failed to load group details:",
                groupId,
                e?.response?.status,
                e?.response?.data || e?.message
            );
            setLoadError(e?.response?.status === 404 ? "notfound" : "network");
        } finally {
            setLoading(false);
        }
    };

    const fetchExpenses = async () => {
        try {
            const res = await api.get(`/expenses/${groupId}`);
            setExpenses(res.data);
        } catch {
            console.error("Failed to fetch expenses");
        } finally {
            setExpensesLoaded(true);
        }
    };

    const fetchBalances = async () => {
        try {
            const res = await api.get(`/balances/${groupId}`);
            setBalances(res.data);
        } catch {
            console.error("Failed to fetch balances");
            setBalances((b) => b ?? { balances: [], suggestions: [] });
        }
    };

    const fetchMe = async () => {
        try {
            const res = await api.get("/users/me");
            setUserId(res?.data?._id || res?.data?.id || null);
        } catch {
            setUserId(null);
        }
    };

    // Type card data (budget, month totals, bills, missing receipts…)
    const fetchSummary = async () => {
        try {
            const res = await api.get(`/groups/${groupId}/summary`);
            setSummary(res.data);
        } catch {
            // Non-critical: the card stays in its loading state.
        }
    };

    // Creator-only: invites waiting to be accepted + join requests.
    const fetchPendingMembers = async () => {
        try {
            const res = await api.get(`/groups/${groupId}/invites`);
            setPendingMembers(res.data);
        } catch {
            setPendingMembers(null);
        }
    };

    const handleLeave = () => {
        Alert.alert(
            "Leave group?",
            "You can only leave once you're settled up. You'll need a new invite to come back.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Leave",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await api.post(`/groups/${groupId}/leave`);
                            router.replace("/(tabs)/trips");
                        } catch (e) {
                            Alert.alert("Couldn't leave", e?.response?.data?.message || "Please try again.");
                        }
                    },
                },
            ]
        );
    };

    const fetchPendingSettlements = async () => {
        try {
            const res = await api.get(`/expenses/settle/pending/${groupId}`);
            setPendingSettlements(res.data || []);
        } catch {
            // Non-critical - the Smart Settlements list still works without this.
        }
    };

    useEffect(() => {
        // Wait for Firebase to finish restoring the session (cold start, or a
        // fast deep-link straight into a group) before firing any request.
        // Without this gate, `/users/me` could go out with no auth token yet,
        // fail, and leave `userId` stuck at null for the rest of this screen's
        // life - which silently disables the settlement "I've Paid"/"Mark as
        // Received" buttons (they're gated on knowing who "me" is) even though
        // every other part of the screen looks fine. Web already guards this
        // the same way (see frontend/app/groups/[id]/page.jsx).
        if (authLoading) return;
        if (!groupId || !token) return;
        fetchMe();
        fetchGroup();
        fetchExpenses();
        fetchBalances();
        fetchPendingSettlements();
        fetchSummary();
        fetchPendingMembers();
    }, [groupId, token, authLoading]);

    // Live refresh: any confirm/reject/cancel from the other party (or from
    // this user on another device) pushes a "settlementUpdate" event to
    // everyone viewing this group, so balances/pending never go stale.
    useEffect(() => {
        if (!groupId || !token) return;
        connectSocket();
        socket.emit("joinGroup", groupId);
        const onSettlementUpdate = (payload) => {
            if (String(payload?.groupId) !== String(groupId)) return;
            fetchBalances();
            fetchExpenses();
            fetchPendingSettlements();
            fetchSummary();
        };
        socket.on("settlementUpdate", onSettlementUpdate);
        return () => {
            socket.off("settlementUpdate", onSettlementUpdate);
            socket.emit("leaveGroup", groupId);
        };
    }, [groupId, token]);

    const retryLoad = () => {
        fetchMe();
        fetchGroup();
        fetchExpenses();
        fetchBalances();
        fetchPendingSettlements();
        fetchSummary();
        fetchPendingMembers();
    };

    const handleRemove = (memberId, memberName) => {
        Alert.alert(
            "Remove member?",
            `${memberName || "This member"} will lose access to this group and its expenses. This can't be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const res = await api.delete(`/groups/${groupId}/members/${memberId}`);
                            setGroup(res.data);
                        } catch (e) {
                            Alert.alert(
                                "Couldn't remove member",
                                e?.response?.data?.message || "Please try again."
                            );
                        }
                    },
                },
            ]
        );
    };

    const handleExpenseAdded = () => {
        handleCloseExpenseModal();
        fetchExpenses();
        fetchBalances();
        fetchSummary();
    };

    // A debtor's "I paid" only files a claim - the creditor has to confirm it
    // (see handleConfirmSettlement below). A creditor's "I received it" is
    // settled by the server straight away.
    const handleRequestSettlement = async (fromUser, toUser, amount, method, note) => {
        try {
            const { data } = await api.post("/expenses/settle/request", {
                groupId,
                fromUserId: fromUser.userId,
                toUserId: toUser.userId,
                amount: Number(amount),
                method,
                note,
            });
            if (data?.status === "confirmed") {
                fetchExpenses();
                fetchBalances();
                fetchSummary();
            }
            fetchPendingSettlements();
        } catch (e) {
            Alert.alert(
                "Couldn't send request",
                e?.response?.data?.message || "Failed to send settlement request."
            );
        }
    };

    const handleConfirmSettlement = async (requestId) => {
        try {
            await api.post(`/expenses/settle/${requestId}/confirm`);
            fetchExpenses();
            fetchBalances();
            fetchSummary();
            fetchPendingSettlements();
        } catch (e) {
            Alert.alert(
                "Couldn't confirm",
                e?.response?.data?.message || "Failed to confirm settlement."
            );
        }
    };

    const handleRejectSettlement = async (requestId) => {
        try {
            await api.post(`/expenses/settle/${requestId}/reject`);
            fetchPendingSettlements();
        } catch (e) {
            Alert.alert(
                "Couldn't reject",
                e?.response?.data?.message || "Failed to reject settlement request."
            );
        }
    };

    const handleCancelSettlement = async (requestId) => {
        try {
            await api.post(`/expenses/settle/${requestId}/cancel`);
            fetchPendingSettlements();
        } catch (e) {
            Alert.alert(
                "Couldn't cancel",
                e?.response?.data?.message || "Failed to cancel settlement request."
            );
        }
    };

    const isCreator =
        group &&
        userId &&
        String(group.createdBy?._id || group.createdBy) === String(userId);


    const handleMarkCompleted = () => {
        Alert.alert(
            "Mark as completed?",
            "This trip will move to your completed trips. You can still view it, but it won't show as active anymore.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Mark Completed",
                    onPress: async () => {
                        try {
                            await api.put(`/groups/${groupId}/complete`, {});
                            fetchGroup();
                        } catch (e) {
                            Alert.alert(
                                "Error",
                                e?.response?.data?.message || "Could not mark trip as completed. Please try again."
                            );
                        }
                    },
                },
            ]
        );
    };

    const handleDeleteTrip = () => {
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
                            router.replace("/(tabs)/trips");
                        } catch (e) {
                            Alert.alert(
                                "Error",
                                e?.response?.data?.message || "Could not delete trip. Please try again."
                            );
                        }
                    },
                },
            ]
        );
    };

    const notepadEnabled = !!group?.settings?.notepadEnabled;

    const handleToggleNotepad = async () => {
        const next = !notepadEnabled;
        try {
            const res = await api.patch(`/groups/${groupId}/settings`, {
                settings: { notepadEnabled: next },
            });
            setGroup(res.data);
        } catch (e) {
            Alert.alert(
                "Couldn't update",
                e?.response?.data?.message || "Failed to update the notepad setting. Please try again."
            );
        }
    };

    const goBack = () => {
        if (returnTo === "trips") {
            router.replace("/(tabs)/trips");
            return;
        }
        router.back();
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={{ paddingTop: 16 }}>
                    <StatCardsSkeleton />
                    <RowListSkeleton count={5} />
                </View>
            </SafeAreaView>
        );
    }

    if (!group) {
        const isNetworkError = loadError === "network";
        return (
            <SafeAreaView style={styles.container} edges={["top"]}>
                <ScreenHeader back onBack={goBack} title="Group" />
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                        {isNetworkError
                            ? "Couldn't reach the server. Check your connection and try again."
                            : "Group not found."}
                    </Text>
                    {isNetworkError && (
                        <PillButton variant="primary" onPress={retryLoad} label="Try Again" style={styles.errorButton} />
                    )}
                    <PillButton variant="secondary" onPress={goBack} label="Back" style={styles.errorButton} />
                </View>
            </SafeAreaView>
        );
    }

    const typeMeta = groupTypeMeta(group.groupType);
    const currency = group.settings?.currency || "INR";
    const headerSubtitle = group.isCompleted
        ? "Completed"
        : `${typeMeta.label} · ${group.members?.length || 0} member${group.members?.length === 1 ? "" : "s"}`;

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <ScreenHeader
                back
                onBack={goBack}
                title={group.name}
                subtitle={headerSubtitle}
                right={
                    isCreator ? (
                        <RoundButton label="Group actions" onPress={() => setShowMenu(true)}>
                            <MoreVertical size={18} color={colors.text} />
                        </RoundButton>
                    ) : group.isCompleted ? (
                        <View style={styles.completedBadge}>
                            <CheckCircle2 size={12} color="#10B981" />
                            <Text style={styles.completedBadgeText}>Completed</Text>
                        </View>
                    ) : (
                        <RoundButton label="Leave group" onPress={handleLeave}>
                            <LogOut size={18} color={colors.error} />
                        </RoundButton>
                    )
                }
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomSpacing }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Type card (Trip budget / Roommates month / Business receipts) */}
                <GroupTypeCard
                    group={group}
                    summary={summary}
                    isCreator={isCreator}
                    onOpenSettings={() => setShowSettings(true)}
                    onEditLook={() => setShowIconPicker(true)}
                />

                {/* Two quick actions under the type card */}
                <View style={styles.quickRow}>
                    <PillButton
                        variant="secondary"
                        onPress={() => setShowMembers(true)}
                        icon={<Users size={16} color={colors.text} />}
                        label={`Members (${group.members?.length || 0})`}
                        style={styles.quickBtn}
                    />
                    <PillButton
                        variant="primary"
                        onPress={() => setShowExpenseModal(true)}
                        icon={<Wallet2 size={16} color={t.onInk} />}
                        label="Add Expense"
                        style={styles.quickBtn}
                    />
                </View>

                {isCreator && (
                    <PendingMembers
                        groupId={groupId}
                        pending={pendingMembers}
                        onChanged={() => { fetchPendingMembers(); fetchGroup(); fetchBalances(); }}
                    />
                )}

                {/* Member Expenses Summary */}
                <SectionLabel>Member Expenses</SectionLabel>

                {!expensesLoaded ? (
                    <RowListSkeleton count={3} />
                ) : expenses.length === 0 ? (
                    <Block>
                        <View style={styles.emptyExpensesContainer}>
                            <IconCircle size={48}>
                                <Receipt size={22} color={colors.primary} />
                            </IconCircle>
                            <Text style={styles.emptyTitle}>No expenses yet</Text>
                            <Text style={styles.emptyText}>
                                Log your first bill and we&apos;ll split it automatically.
                            </Text>
                            <PillButton
                                variant="primary"
                                onPress={() => setShowExpenseModal(true)}
                                icon={<Plus size={16} color={t.onInk} />}
                                label="Add Expense"
                                style={styles.emptyExpensesCta}
                            />
                        </View>
                    </Block>
                ) : (
                    <Block padded={false} style={styles.listBlock}>
                        {(group.members || []).map((m) => {
                            const memberExpenses = expenses.filter(
                                (e) => String(e.paidBy?._id) === String(m._id)
                            );
                            const total = memberExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
                            return (
                                <ListRow
                                    key={m._id}
                                    onPress={() => {
                                        setSelectedMember({ member: m, memberExpenses });
                                        setShowMemberExpensesModal(true);
                                    }}
                                    leading={
                                        m.photoURL ? (
                                            <Image source={{ uri: m.photoURL }} style={styles.avatar} />
                                        ) : (
                                            <View style={styles.avatarPlaceholder}>
                                                <Text style={styles.avatarText}>
                                                    {m.name ? m.name.charAt(0).toUpperCase() : "U"}
                                                </Text>
                                            </View>
                                        )
                                    }
                                    title={m.name || "Unnamed"}
                                    subtitle={`${memberExpenses.length} ${memberExpenses.length === 1 ? "expense" : "expenses"}`}
                                    trailing={
                                        <View style={styles.memberExpenseCardRight}>
                                            <Text style={styles.memberExpenseTotal}>{formatMoney(total, currency)}</Text>
                                            <Text style={styles.memberExpenseViewText}>View →</Text>
                                        </View>
                                    }
                                />
                            );
                        })}
                    </Block>
                )}

                {/* Balance Section */}
                <GroupBalanceSection
                    currency={currency}
                    groupName={group.name}
                    balances={balances}
                    loading={balances === null}
                    pendingSettlements={pendingSettlements}
                    meId={userId}
                    onRequestSettlement={handleRequestSettlement}
                    onConfirmSettlement={handleConfirmSettlement}
                    onRejectSettlement={handleRejectSettlement}
                    onCancelSettlement={handleCancelSettlement}
                />

                {/* Notepad — only when the creator has enabled it */}
                {notepadEnabled && <NotepadSection groupId={groupId} />}
            </ScrollView>

            {/* Add Expense Modal */}
            {showExpenseModal && (
                <AddExpenseModal
                    group={group}
                    meId={userId}
                    initialDescription={prefillDesc}
                    initialCategory={prefillCat}
                    onClose={handleCloseExpenseModal}
                    onSuccess={handleExpenseAdded}
                />
            )}

            {/* OCR Modal */}
            {showOcrModal && selectedOcr && (
                <OcrViewModal
                    ocrText={selectedOcr.ocrText}
                    imageUrl={selectedOcr.imageUrl}
                    onClose={() => setShowOcrModal(false)}
                />
            )}

            <AddPeopleSheet
                visible={showAddPeople}
                groupId={groupId}
                onClose={() => setShowAddPeople(false)}
                onShareLink={() => setShowInviteModal(true)}
                onDone={() => { fetchGroup(); fetchPendingMembers(); fetchBalances(); }}
            />
            {showSettings && (
                <GroupSettingsSheet
                    visible={showSettings}
                    group={group}
                    hasExpenses={expenses.length > 0}
                    onClose={() => setShowSettings(false)}
                    onSaved={(updated) => { setGroup((g) => ({ ...g, ...updated, members: g.members })); fetchSummary(); }}
                />
            )}

            {/* Invite Modal */}
            <InviteModal
                groupId={groupId}
                visible={showInviteModal}
                onClose={() => setShowInviteModal(false)}
            />

            {/* Group photo & icon */}
            <GroupAvatarSheet
                visible={showIconPicker}
                group={group}
                onClose={() => setShowIconPicker(false)}
                onChange={(patch) => setGroup((g) => ({ ...g, ...patch }))}
            />

            {/* Group actions menu (three-dot) */}
            <Modal visible={showMenu} transparent animationType="slide" onRequestClose={() => setShowMenu(false)}>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={() => setShowMenu(false)}
                        accessibilityLabel="Dismiss menu"
                    />
                    <View style={[styles.actionSheet, { paddingBottom: sheetBottomPadding }]}>
                        <View style={styles.sheetHandle} />

                        <View style={styles.actionGroup}>
                            <ActionItem
                                styles={styles}
                                chevronColor={colors.textSecondary}
                                icon={<Settings2 size={19} color={colors.primary} />}
                                tint={colors.primaryLight}
                                title="Group settings"
                                onPress={() => { setShowMenu(false); setShowSettings(true); }}
                            />
                            <ActionItem
                                styles={styles}
                                chevronColor={colors.textSecondary}
                                icon={<UserPlus size={19} color={colors.primary} />}
                                tint={colors.primaryLight}
                                title="Add people"
                                onPress={() => { setShowMenu(false); setShowAddPeople(true); }}
                            />
                            <ActionItem
                                styles={styles}
                                chevronColor={colors.textSecondary}
                                icon={<Camera size={19} color={colors.primary} />}
                                tint={colors.primaryLight}
                                title="Group photo & icon"
                                onPress={() => { setShowMenu(false); setShowIconPicker(true); }}
                            />
                            <ActionItem
                                styles={styles}
                                chevronColor={colors.textSecondary}
                                icon={<NotebookPen size={19} color={notepadEnabled ? "#10B981" : colors.primary} />}
                                tint={notepadEnabled ? "rgba(16,185,129,0.14)" : colors.primaryLight}
                                title={notepadEnabled ? "Disable notepad" : "Add notepad"}
                                onPress={() => { setShowMenu(false); handleToggleNotepad(); }}
                                last={group.isCompleted}
                            />
                            {!group.isCompleted && (
                                <ActionItem
                                    styles={styles}
                                    chevronColor={colors.textSecondary}
                                    icon={<CheckCircle2 size={19} color="#10B981" />}
                                    tint="rgba(16,185,129,0.14)"
                                    title="Mark as completed"
                                    onPress={() => { setShowMenu(false); handleMarkCompleted(); }}
                                    last
                                />
                            )}
                        </View>

                        <View style={styles.actionGroup}>
                            <ActionItem
                                styles={styles}
                                chevronColor={colors.textSecondary}
                                icon={<Trash2 size={19} color="#DC2626" />}
                                tint="rgba(220,38,38,0.12)"
                                title="Delete group"
                                danger
                                onPress={() => { setShowMenu(false); handleDeleteTrip(); }}
                                last
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Members list sheet */}
            <Modal visible={showMembers} transparent animationType="slide" onRequestClose={() => setShowMembers(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalSheet, { paddingBottom: sheetBottomPadding }]}>
                        <View style={styles.sheetHandle} />
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Members · {group.members?.length || 0}
                            </Text>
                            <RoundButton label="Close" size={36} onPress={() => setShowMembers(false)}>
                                <X size={18} color={colors.textSecondary} />
                            </RoundButton>
                        </View>
                        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                            <Block padded={false} style={styles.listBlock}>
                                {(group.members || []).map((m) => (
                                    <ListRow
                                        key={m._id}
                                        leading={
                                            m.photoURL ? (
                                                <Image source={{ uri: m.photoURL }} style={styles.avatar} />
                                            ) : (
                                                <View style={styles.avatarPlaceholder}>
                                                    <Text style={styles.avatarText}>{m.name ? m.name.charAt(0).toUpperCase() : "U"}</Text>
                                                </View>
                                            )
                                        }
                                        title={m.name || "Unnamed User"}
                                        subtitle={m.email}
                                        trailing={
                                            String(group.createdBy?._id) === String(m._id) ? (
                                                <View style={styles.creatorBadge}>
                                                    <Text style={styles.creatorBadgeText}>Creator</Text>
                                                </View>
                                            ) : isCreator ? (
                                                <RoundButton label="Remove member" size={36} onPress={() => handleRemove(m._id, m.name)}>
                                                    <X size={15} color={colors.textSecondary} />
                                                </RoundButton>
                                            ) : null
                                        }
                                    />
                                ))}
                            </Block>
                            {isCreator && (
                                <PillButton
                                    variant="secondary"
                                    onPress={() => { setShowMembers(false); setShowAddPeople(true); }}
                                    icon={<UserPlus size={16} color={colors.text} />}
                                    label="Add people"
                                    style={styles.addPeopleBtn}
                                />
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Member Expenses Modal */}
            <Modal
                visible={showMemberExpensesModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowMemberExpensesModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalSheet, { paddingBottom: sheetBottomPadding }]}>
                        <View style={styles.sheetHandle} />
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderLeft}>
                                {selectedMember?.member.photoURL ? (
                                    <Image
                                        source={{ uri: selectedMember.member.photoURL }}
                                        style={styles.avatar}
                                    />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarText}>
                                            {selectedMember?.member.name
                                                ? selectedMember.member.name.charAt(0).toUpperCase()
                                                : "U"}
                                        </Text>
                                    </View>
                                )}
                                <View style={styles.modalHeaderCopy}>
                                    <Text style={styles.modalTitle}>
                                        {selectedMember?.member.name || "Member"}
                                    </Text>
                                    <Text style={styles.modalSubtitle}>
                                        {selectedMember?.memberExpenses.length}{" "}
                                        {selectedMember?.memberExpenses.length === 1 ? "expense" : "expenses"} •{" "}
                                        {formatMoney(selectedMember?.memberExpenses.reduce((s, e) => s + (e.amount || 0), 0), currency)}
                                    </Text>
                                </View>
                            </View>
                            <RoundButton label="Close" size={36} onPress={() => setShowMemberExpensesModal(false)}>
                                <X size={18} color={colors.textSecondary} />
                            </RoundButton>
                        </View>

                        {/* Expense List */}
                        <FlatList
                            style={styles.modalScroll}
                            data={selectedMember?.memberExpenses || []}
                            keyExtractor={(exp) => exp._id}
                            showsVerticalScrollIndicator={false}
                            initialNumToRender={12}
                            windowSize={9}
                            removeClippedSubviews
                            ListEmptyComponent={
                                <View style={styles.modalEmpty}>
                                    <Receipt size={22} color={colors.primary} />
                                    <Text style={styles.emptyText}>No expenses from this member.</Text>
                                </View>
                            }
                            contentContainerStyle={styles.expensesList}
                            renderItem={({ item: exp }) => {
                                const key = exp.category?.toLowerCase() || "misc";
                                const Icon = categoryIcons[key] || FileText;
                                return (
                                    <ListRow
                                        leading={
                                            <IconCircle size={44}>
                                                <Icon size={18} color={colors.primary} />
                                            </IconCircle>
                                        }
                                        title={exp.description}
                                        subtitle={formatMoney(exp.amount, currency)}
                                        trailing={
                                            <View style={styles.expenseRight}>
                                                <View style={styles.categoryBadge}>
                                                    <Text style={styles.categoryBadgeText}>{exp.category}</Text>
                                                </View>
                                                {exp.ocrText && (
                                                    <RoundButton
                                                        label="View receipt"
                                                        size={36}
                                                        onPress={() => {
                                                            setSelectedOcr(exp);
                                                            setShowOcrModal(true);
                                                        }}
                                                    >
                                                        <Eye size={16} color={colors.textSecondary} />
                                                    </RoundButton>
                                                )}
                                            </View>
                                        }
                                    />
                                );
                            }}
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ── Premium full-width action row for the group three-dot sheet ───────────────
function ActionItem({ styles, icon, tint, title, subtitle, onPress, danger, last, chevronColor }) {
    return (
        <TouchableOpacity
            activeOpacity={0.6}
            onPress={onPress}
            style={[styles.actionItem, !last && styles.actionItemDivider]}
            accessibilityRole="button"
            accessibilityLabel={title}
        >
            <View style={[styles.actionIcon, { backgroundColor: tint }]}>{icon}</View>
            <View style={styles.actionItemCopy}>
                <Text style={[styles.actionItemTitle, danger && styles.actionItemTitleDanger]} numberOfLines={1}>
                    {title}
                </Text>
                {subtitle ? <Text style={styles.actionItemSub} numberOfLines={1}>{subtitle}</Text> : null}
            </View>
            <ChevronRight size={18} color={danger ? "#DC2626" : (chevronColor || "#9CA3AF")} />
        </TouchableOpacity>
    );
}

const getStyles = (colors, isDark, t) => StyleSheet.create({
    // Compact three-dot action sheet
    actionSheet: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
        paddingHorizontal: SCREEN_GUTTER,
        paddingTop: 8,
    },
    actionGroup: {
        backgroundColor: t.surfaceAlt || colors.card,
        borderRadius: 18,
        overflow: "hidden",
        marginBottom: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
    },
    actionItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        width: "100%",
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    actionItemDivider: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    actionIcon: {
        width: 38,
        height: 38,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
    },
    actionItemCopy: {
        flex: 1,
        minWidth: 0,
    },
    actionItemTitle: {
        fontSize: 15.5,
        fontWeight: "600",
        color: colors.text,
        letterSpacing: -0.2,
    },
    actionItemTitleDanger: {
        color: "#DC2626",
    },
    actionItemSub: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
    },

    addPeopleBtn: { marginHorizontal: SCREEN_GUTTER, marginTop: 12, marginBottom: 24 },
    quickRow: { flexDirection: "row", gap: 10, paddingHorizontal: SCREEN_GUTTER, marginBottom: 20 },
    quickBtn: { flex: 1 },
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 4,
        paddingBottom: 100,
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: SCREEN_GUTTER,
        gap: 12,
    },
    errorText: {
        fontSize: 16,
        color: colors.text,
        marginBottom: 8,
        textAlign: "center",
    },
    errorButton: {
        alignSelf: "stretch",
    },
    completedBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#D1FAE5",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
    },
    completedBadgeText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#10B981",
    },
    headerPill: {
        height: 40,
        paddingHorizontal: 14,
    },
    headerPillText: {
        fontSize: 14,
    },
    listBlock: {
        paddingVertical: 6,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: t.surfaceAlt,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.primary,
    },
    creatorBadge: {
        backgroundColor: t.surfaceAlt,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
    },
    creatorBadgeText: {
        fontSize: 10,
        fontWeight: "600",
        color: colors.primary,
    },
    emptyContainer: {
        paddingVertical: 24,
        alignItems: "center",
    },
    emptyText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: "center",
    },
    emptyExpensesContainer: {
        paddingVertical: 16,
        alignItems: "center",
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: colors.text,
        marginTop: 12,
        marginBottom: 4,
    },
    emptyExpensesCta: {
        marginTop: 16,
    },
    expensesList: {
        paddingBottom: 8,
    },
    expenseRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    categoryBadge: {
        backgroundColor: t.surfaceAlt,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 999,
    },
    categoryBadgeText: {
        fontSize: 11,
        fontWeight: "600",
        color: colors.textSecondary,
        textTransform: "uppercase",
    },
    memberExpenseCardRight: {
        alignItems: "flex-end",
        gap: 4,
    },
    memberExpenseTotal: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.primary,
    },
    memberExpenseViewText: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "flex-end",
    },
    modalSheet: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: SCREEN_GUTTER,
        paddingTop: 10,
        maxHeight: "80%",
    },
    sheetHandle: {
        alignSelf: "center",
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: t.outline,
        marginBottom: 12,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    modalHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flex: 1,
        minWidth: 0,
    },
    modalHeaderCopy: {
        flex: 1,
        minWidth: 0,
    },
    sheetTitleRow: {
        paddingHorizontal: 0,
        marginTop: 0,
        marginBottom: 0,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: colors.text,
    },
    modalSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
    },
    modalScroll: {
        flexGrow: 0,
    },
    modalEmpty: {
        alignItems: "center",
        paddingVertical: 40,
        gap: 12,
    },
    widgetCard: {
        ...surfaceStyle(t),
        marginHorizontal: SCREEN_GUTTER,
        marginBottom: 24,
        borderRadius: 22,
        overflow: "hidden",
    },
    widgetHeaderGradient: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    widgetHeaderTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    widgetHeaderTitle: {
        color: "white",
        fontSize: 15,
        fontWeight: "700",
    },
    widgetHeaderBadge: {
        backgroundColor: "rgba(255,255,255,0.25)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    widgetHeaderBadgeText: {
        color: "white",
        fontSize: 10,
        fontWeight: "600",
    },
    widgetBody: {
        padding: 16,
    },
    widgetSubLabel: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: "600",
        marginBottom: 6,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    widgetHighlightValue: {
        fontSize: 20,
        fontWeight: "800",
        color: colors.primary,
        marginTop: 2,
    },
    budgetRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    editRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        marginBottom: 16,
    },
    widgetInput: {
        backgroundColor: t.surfaceAlt,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: t.outline,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        color: colors.text,
        fontSize: 14,
        marginTop: 4,
    },
    saveBtn: {
        backgroundColor: t.ink,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        justifyContent: "center",
        alignItems: "center",
        height: 40,
    },
    widgetCta: {
        width: "100%",
        marginTop: 12,
    },
    editHintText: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: "600",
    },
    progressContainer: {
        marginBottom: 16,
    },
    progressLabelRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    progressMiniLabel: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: t.surfaceAlt,
        borderRadius: 3,
        overflow: "hidden",
    },
    progressBarFill: {
        height: "100%",
        borderRadius: 3,
    },
    gridStats: {
        flexDirection: "row",
        gap: 12,
    },
    statBox: {
        flex: 1,
        backgroundColor: t.surfaceAlt,
        borderRadius: 16,
        padding: 14,
        alignItems: "center",
    },
    statLabel: {
        fontSize: 11,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    statValue: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.text,
    },
    utilityList: {
        gap: 10,
    },
    utilityItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: t.surfaceAlt,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 16,
    },
    utilityItemLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flex: 1,
    },
    utilityCheckbox: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.textSecondary,
        justifyContent: "center",
        alignItems: "center",
    },
    utilityName: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
    },
    utilityStatusLabel: {
        fontSize: 12,
        color: "#10B981",
        fontWeight: "600",
    },
    addBillQuickBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#10B981",
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
    },
    addBillQuickText: {
        color: "white",
        fontSize: 12,
        fontWeight: "600",
    },
});
