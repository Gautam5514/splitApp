import { useBottomSpacing } from "@/hooks/useSafeSpacing";
import { Alert } from "@/lib/alert";
import { SCREEN_GUTTER } from "@/constants/layout";
import { flatFill, flatSurface, SIZE, TYPE } from "@/constants/design";
import AddExpenseModal from "@/components/AddExpenseModal";
import { RowListSkeleton, StatCardsSkeleton } from "@/components/ui/Skeleton";
import GroupBalanceSection from "@/components/GroupBalanceSection";
import InviteModal from "@/components/InviteModal";
import AddPeopleSheet from "@/components/people/AddPeopleSheet";
import GroupSettingsSheet from "@/components/group/GroupSettingsSheet";
import GroupTypeCard from "@/components/group/GroupTypeCard";
import PendingMembers from "@/components/group/PendingMembers";
import StatementCard from "@/components/group/StatementCard";
import { formatMoney, groupTypeMeta } from "@/lib/groupPresets";
import NotepadSection from "@/components/Notepad/NotepadSection";
import OcrViewModal from "@/components/OcrViewModal";
import { Block, IconCircle, ListRow, PillButton, RoundButton, ScreenHeader, SectionLabel, useDesign } from "@/components/ui/Design";
import AutopilotButton from "@/components/autopilot/AutopilotButton";
import { useAuth } from "@/context/AuthContext";
import GroupAvatarSheet from "@/components/group/GroupAvatarSheet";
import TierBadge from "@/components/ui/TierBadge";
import { api } from "@/lib/api";
import { useRealtime } from "@/lib/useRealtime";
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
    MoreHorizontal,
    NotebookPen,
    Plus,
    Receipt,
    ShoppingBag,
    Trash2,
    UserPlus,
    Users,
    Utensils,
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

// Live-update kinds that only change expenses/balances, never the group record.
const MONEY_ONLY_KINDS = new Set(["expense", "requested", "confirmed", "rejected", "cancelled"]);

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
    const [showAllExpenses, setShowAllExpenses] = useState(false);

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

    // Live refresh: any change in this group (new expense, settlement, member
    // change), from anyone or from this user on another device, pushes a
    // "groupUpdate" event so the screen never goes stale.
    useRealtime({
        event: "groupUpdate",
        groupId,
        enabled: !!groupId && !!token,
        onChange: (payload) => {
            fetchBalances();
            fetchExpenses();
            fetchPendingSettlements();
            fetchSummary();
            // Expense/settlement events only move money; anything else (members,
            // settings, photo, invites, completed, reconnect) can change the group itself.
            if (!MONEY_ONLY_KINDS.has(payload?.kind)) {
                fetchGroup();
                fetchPendingMembers();
            }
        },
    });

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
            "This group will move to Completed. You can still open it any time.",
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
                                e?.response?.data?.message || "Could not mark the group as completed. Please try again."
                            );
                        }
                    },
                },
            ]
        );
    };

    const handleDeleteTrip = () => {
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
                            router.replace("/(tabs)/trips");
                        } catch (e) {
                            Alert.alert(
                                "Error",
                                e?.response?.data?.message || "Could not delete the group. Please try again."
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
            <SafeAreaView style={styles.container} edges={["top"]}>
                <ScreenHeader flat back onBack={goBack} title=" " />
                <View>
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
                <ScreenHeader flat back onBack={goBack} title="Group" />
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

    const currency = group.settings?.currency || "INR";
    const members = group.members || [];
    const typeMeta = groupTypeMeta(group.groupType || "general");
    const typeLabel = typeMeta.key === "general" ? "Group" : typeMeta.label;
    const headerSubtitle = group.isCompleted
        ? "Completed"
        : `${typeLabel} · ${members.length} ${members.length === 1 ? "member" : "members"}`;

    // Balance per member (+ = gets money back, - = owes). null until loaded.
    const balanceOf = (id) => {
        if (!balances) return null;
        const row = (balances.balances || []).find((x) => String(x.userId) === String(id));
        return Number(row?.balance) || 0;
    };
    const myNet = balances && userId ? balanceOf(userId) : undefined;

    // Newest first when the API sends a date; otherwise keep the API's order.
    const whenOf = (e) => new Date(e.date || e.createdAt || 0).getTime() || 0;
    const sortedExpenses = [...expenses].sort((x, y) => whenOf(y) - whenOf(x));
    const visibleExpenses = showAllExpenses ? sortedExpenses : sortedExpenses.slice(0, EXPENSE_PREVIEW);
    const dayLabel = (e) => {
        const ts = whenOf(e);
        return ts ? new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "";
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <ScreenHeader
                flat
                back
                onBack={goBack}
                title={group.name}
                subtitle={headerSubtitle}
                right={
                    <View style={styles.headerActions}>
                        {!group.isCompleted && <AutopilotButton size={46} groupId={group._id} />}
                        <RoundButton flat label="Group actions" onPress={() => setShowMenu(true)}>
                            <MoreHorizontal size={20} color={colors.text} />
                        </RoundButton>
                    </View>
                }
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomSpacing }]}
                showsVerticalScrollIndicator={false}
            >
                {/* 1 · Where I stand + the group's numbers */}
                <GroupTypeCard
                    group={group}
                    summary={summary}
                    isCreator={isCreator}
                    myNet={myNet}
                    onOpenSettings={() => setShowSettings(true)}
                    onEditLook={() => setShowIconPicker(true)}
                />

                {/* 2 · The one main action (+ who's in the group) */}
                <View style={styles.quickRow}>
                    <TouchableOpacity
                        onPress={() => setShowExpenseModal(true)}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel="Add Expense"
                        style={styles.addExpenseBtn}
                    >
                        <Plus size={19} color={t.onInk} strokeWidth={2.8} />
                        <Text style={styles.addExpenseText}>Add Expense</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setShowMembers(true)}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel={`Members (${members.length})`}
                        style={styles.membersChip}
                    >
                        <View style={styles.faces}>
                            {members.slice(0, 3).map((m, i) => (
                                <View key={m._id || i} style={[styles.face, i > 0 && styles.faceOverlap]}>
                                    {m.photoURL ? (
                                        <Image source={{ uri: m.photoURL }} style={styles.faceImg} />
                                    ) : (
                                        <Text style={styles.faceText}>{(m.name || m.email || "?").charAt(0).toUpperCase()}</Text>
                                    )}
                                </View>
                            ))}
                            {!members.length && (
                                <View style={[styles.face, styles.faceEmpty]}>
                                    <Users size={14} color={colors.textSecondary} />
                                </View>
                            )}
                        </View>
                        {members.length > 3 ? <Text style={styles.membersMore}>+{members.length - 3}</Text> : null}
                    </TouchableOpacity>
                </View>

                {isCreator && (
                    <PendingMembers
                        groupId={groupId}
                        pending={pendingMembers}
                        onChanged={() => { fetchPendingMembers(); fetchGroup(); fetchBalances(); }}
                    />
                )}

                {/* 3 · Who pays whom (only shows when something is unsettled) */}
                <GroupBalanceSection
                    sections="settle"
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

                <StatementCard groupId={groupId} isCreator={isCreator} reloadKey={group.isCompleted ? 1 : 0} />

                {/* 4 · Expenses, newest first */}
                <SectionLabel
                    line
                    right={expenses.length > 0 ? <Text style={styles.sectionCount}>{expenses.length}</Text> : null}
                >
                    Expenses
                </SectionLabel>

                {!expensesLoaded ? (
                    <RowListSkeleton count={3} />
                ) : expenses.length === 0 ? (
                    <Block style={styles.emptyBlock}>
                        <IconCircle size={48} tint={t.fillStrong}>
                            <Receipt size={22} color={colors.primary} />
                        </IconCircle>
                        <Text style={styles.emptyTitle}>No expenses yet</Text>
                        <Text style={styles.emptyText}>
                            Tap Add Expense and we&apos;ll split the bill for you.
                        </Text>
                    </Block>
                ) : (
                    <View style={styles.listGap}>
                        {visibleExpenses.map((exp) => {
                            const Icon = categoryIcons[exp.category?.toLowerCase()] || FileText;
                            const paidByMe = userId && String(exp.paidBy?._id) === String(userId);
                            const payer = paidByMe ? "You" : (exp.paidBy?.name || "Someone");
                            const day = dayLabel(exp);
                            const openReceipt = exp.ocrText
                                ? () => { setSelectedOcr(exp); setShowOcrModal(true); }
                                : undefined;
                            return (
                                <ListRow
                                    key={exp._id}
                                    onPress={openReceipt}
                                    accessibilityLabel={`${exp.description}, ${formatMoney(exp.amount, currency)}, ${payer} paid${openReceipt ? ", view receipt" : ""}`}
                                    leading={
                                        <IconCircle size={44} tint={t.fillStrong}>
                                            <Icon size={18} color={colors.primary} />
                                        </IconCircle>
                                    }
                                    title={exp.description || "Expense"}
                                    subtitle={`${payer} paid${day ? ` · ${day}` : ""}`}
                                    trailing={
                                        <View style={styles.expenseRight}>
                                            {exp.ocrText ? <Eye size={15} color={colors.textSecondary} /> : null}
                                            <Text style={styles.rowAmount}>{formatMoney(exp.amount, currency)}</Text>
                                        </View>
                                    }
                                />
                            );
                        })}
                        {expenses.length > EXPENSE_PREVIEW && (
                            <TouchableOpacity
                                onPress={() => setShowAllExpenses((v) => !v)}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                style={styles.showAll}
                            >
                                <Text style={styles.showAllText}>
                                    {showAllExpenses ? "Show less" : `Show all ${expenses.length} expenses`}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* 5 · Everyone's balance; tap a person to see what they paid for */}
                {expenses.length > 0 && members.length > 0 && (
                    <>
                        <SectionLabel line>Balances</SectionLabel>
                        <View style={styles.listGap}>
                            {members.map((m) => {
                                const memberExpenses = expenses.filter(
                                    (e) => String(e.paidBy?._id) === String(m._id)
                                );
                                const total = memberExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
                                const bal = balanceOf(m._id);
                                const isUp = bal != null && bal > 0.01;
                                const isDown = bal != null && bal < -0.01;
                                const isMe = userId && String(m._id) === String(userId);
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
                                        title={`${m.name || "Unnamed"}${isMe ? " (you)" : ""}`}
                                        subtitle={`Paid ${formatMoney(total, currency)}`}
                                        trailing={
                                            bal == null ? null : (
                                                <View style={styles.balanceRight}>
                                                    <Text style={styles.balanceHint}>
                                                        {isUp ? "gets back" : isDown ? "owes" : "settled"}
                                                    </Text>
                                                    {isUp || isDown ? (
                                                        <Text style={[styles.rowAmount, { color: isUp ? colors.success : colors.error }]}>
                                                            {formatMoney(Math.round(Math.abs(bal)), currency)}
                                                        </Text>
                                                    ) : null}
                                                </View>
                                            )
                                        }
                                    />
                                );
                            })}
                        </View>
                    </>
                )}

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

                        {!isCreator && (
                            <View style={styles.actionGroup}>
                                <ActionItem
                                    styles={styles}
                                    chevronColor={colors.textSecondary}
                                    icon={<Users size={19} color={colors.primary} />}
                                    tint={colors.primaryLight}
                                    title="Members"
                                    onPress={() => { setShowMenu(false); setShowMembers(true); }}
                                    last
                                />
                            </View>
                        )}
                        {!isCreator && (
                            <View style={styles.actionGroup}>
                                <ActionItem
                                    styles={styles}
                                    icon={<LogOut size={19} color={colors.error} />}
                                    tint={isDark ? "rgba(248,113,113,0.16)" : "rgba(239,68,68,0.10)"}
                                    title="Leave group"
                                    danger
                                    onPress={() => { setShowMenu(false); handleLeave(); }}
                                    last
                                />
                            </View>
                        )}

                        {isCreator && (
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
                                    subtitle="Moves it to the Completed tab. Nothing is deleted."
                                    onPress={() => { setShowMenu(false); handleMarkCompleted(); }}
                                    last
                                />
                            )}
                        </View>
                        )}

                        {isCreator && (
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
                        )}
                    </View>
                </View>
            </Modal>

            {/* Members list sheet */}
            <Modal visible={showMembers} transparent animationType="slide" onRequestClose={() => setShowMembers(false)}>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={() => setShowMembers(false)}
                        accessibilityLabel="Close members"
                    />
                    <View style={[styles.modalSheet, { paddingBottom: sheetBottomPadding }]}>
                        <View style={styles.sheetHandle} />
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Members</Text>
                            <RoundButton flat label="Close" size={36} onPress={() => setShowMembers(false)}>
                                <X size={18} color={colors.textSecondary} />
                            </RoundButton>
                        </View>
                        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                            <Block padded={false} style={styles.plainBlock}>
                                {(group.members || []).map((m, idx, arr) => (
                                    <View
                                        key={m._id}
                                        style={[
                                            styles.memberRow,
                                            idx < arr.length - 1 && styles.memberRowDivider,
                                        ]}
                                    >
                                        {m.photoURL ? (
                                            <Image source={{ uri: m.photoURL }} style={styles.avatar} />
                                        ) : (
                                            <View style={styles.avatarPlaceholder}>
                                                <Text style={styles.avatarText}>{m.name ? m.name.charAt(0).toUpperCase() : "U"}</Text>
                                            </View>
                                        )}
                                        <View style={styles.memberRowText}>
                                            <View style={styles.memberNameRow}>
                                                <Text style={styles.memberName} numberOfLines={1}>
                                                    {m.name || "Unnamed User"}
                                                </Text>
                                                <TierBadge tier={m.eliteTier} />
                                            </View>
                                            <Text
                                                style={styles.memberEmail}
                                                numberOfLines={1}
                                                adjustsFontSizeToFit
                                                minimumFontScale={0.75}
                                            >
                                                {m.email}
                                            </Text>
                                        </View>
                                        <View style={styles.memberRowTrailing}>
                                            {String(group.createdBy?._id) === String(m._id) ? (
                                                <View style={styles.creatorBadge}>
                                                    <Text style={styles.creatorBadgeText}>Creator</Text>
                                                </View>
                                            ) : isCreator ? (
                                                <RoundButton flat label="Remove member" size={36} onPress={() => handleRemove(m._id, m.name)}>
                                                    <X size={15} color={colors.textSecondary} />
                                                </RoundButton>
                                            ) : null}
                                        </View>
                                    </View>
                                ))}
                            </Block>
                            {isCreator && (
                                <PillButton
                                    variant="secondary"
                                    onPress={() => { setShowMembers(false); setShowAddPeople(true); }}
                                    icon={<UserPlus size={16} color={colors.text} />}
                                    label="Add people"
                                    style={[styles.addPeopleBtn, flatFill(t)]}
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
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={() => setShowMemberExpensesModal(false)}
                        accessibilityLabel="Close"
                    />
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
                                        Paid by {selectedMember?.member.name || "member"}
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
                                    <Text style={styles.emptyText}>Hasn&apos;t paid for anything yet.</Text>
                                </View>
                            }
                            contentContainerStyle={styles.expensesList}
                            renderItem={({ item: exp }) => {
                                const key = exp.category?.toLowerCase() || "misc";
                                const Icon = categoryIcons[key] || FileText;
                                return (
                                    <ListRow
                                        style={{ paddingHorizontal: 0 }}
                                        leading={
                                            <IconCircle size={44} tint={t.fillStrong}>
                                                <Icon size={18} color={colors.primary} />
                                            </IconCircle>
                                        }
                                        title={exp.description}
                                        subtitle={formatMoney(exp.amount, currency)}
                                        trailing={
                                            <View style={styles.expenseRight}>
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

// Expenses shown before "Show all".
const EXPENSE_PREVIEW = 6;

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

    addPeopleBtn: { marginTop: 16, marginBottom: 24 },
    quickRow: { flexDirection: "row", gap: 10, paddingHorizontal: SCREEN_GUTTER, marginBottom: 24 },
    addExpenseBtn: {
        flex: 1, height: SIZE.button, borderRadius: SIZE.button / 2, paddingHorizontal: 12,
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        backgroundColor: t.ink,
    },
    addExpenseText: { fontSize: 16, fontWeight: "700", color: t.onInk, letterSpacing: -0.2 },
    membersChip: {
        height: SIZE.button, borderRadius: SIZE.button / 2, paddingHorizontal: 8,
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: t.fillStrong,
    },
    faces: { flexDirection: "row", alignItems: "center" },
    face: {
        width: 38, height: 38, borderRadius: 19, overflow: "hidden",
        alignItems: "center", justifyContent: "center",
        backgroundColor: isDark ? "#3A3A3C" : "#D5D8DE",
        borderWidth: 2, borderColor: colors.background,
    },
    faceOverlap: { marginLeft: -14 },
    faceImg: { width: "100%", height: "100%" },
    faceText: { color: colors.text, fontSize: 14, fontWeight: "700" },
    faceEmpty: { backgroundColor: "transparent", borderWidth: 0 },
    membersMore: { ...TYPE.secondary, fontWeight: "700", color: colors.text, marginRight: 6 },
    sectionCount: { ...TYPE.secondary, color: colors.textSecondary },
    listGap: { marginBottom: 20 },
    rowAmount: { fontSize: 16, fontWeight: "700", color: colors.text, letterSpacing: -0.2 },
    showAll: { paddingHorizontal: SCREEN_GUTTER, paddingVertical: 12 },
    showAllText: { ...TYPE.secondary, fontWeight: "600", color: colors.text },
    balanceRight: { alignItems: "flex-end", gap: 2 },
    balanceHint: { ...TYPE.meta, color: colors.textSecondary },
    emptyBlock: { ...flatFill(t), alignItems: "center", paddingVertical: 28 },
    plainBlock: { ...flatSurface, paddingVertical: 0 },
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
    headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    memberRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingHorizontal: 0,
        paddingVertical: 13,
    },
    memberRowDivider: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    memberRowText: {
        flex: 1,
        minWidth: 0,
        gap: 3,
    },
    memberNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    memberName: {
        flexShrink: 1,
        fontSize: 17,
        fontWeight: "600",
        color: colors.text,
    },
    memberEmail: {
        fontSize: 14.5,
        color: colors.textSecondary,
    },
    memberRowTrailing: {
        flexShrink: 0,
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
        backgroundColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.07)",
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
    emptyText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: "center",
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: colors.text,
        marginTop: 12,
        marginBottom: 4,
    },
    expensesList: {
        paddingBottom: 8,
    },
    expenseRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
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
        minHeight: "45%",
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
});
