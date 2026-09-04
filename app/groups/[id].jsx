import AddExpenseModal from "@/components/AddExpenseModal";
import { Loader } from "@/components/Loader";
import GroupBalanceSection from "@/components/GroupBalanceSection";
import InviteModal from "@/components/InviteModal";
import MemberPicker from "@/components/MemberPicker";
import NotepadSection from "@/components/Notepad/NotepadSection";
import OcrViewModal from "@/components/OcrViewModal";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import socket, { connectSocket } from "@/lib/socket";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import {
    ArrowLeftCircle,
    Bus,
    CheckCircle,
    Coffee,
    CreditCard,
    Eye,
    FileText,
    Gift,
    Home,
    MapPin,
    Plane,
    Plus,
    Receipt,
    ShoppingBag,
    StarIcon,
    Trash2,
    TrendingUp,
    UserPlus,
    Users2,
    Utensils,
    Wallet2,
    X
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
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
    const { colors, theme } = useTheme();
    const params = useLocalSearchParams();
    const groupId = params?.id;
    const returnTo = params?.returnTo;

    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [adding, setAdding] = useState(false);
    const [expenses, setExpenses] = useState([]);
    const [balances, setBalances] = useState(null);
    const [pendingSettlements, setPendingSettlements] = useState([]);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showOcrModal, setShowOcrModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [selectedOcr, setSelectedOcr] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);
    const [showMemberExpensesModal, setShowMemberExpensesModal] = useState(false);
    const [userId, setUserId] = useState(null);
    const [prefillDesc, setPrefillDesc] = useState("");
    const [prefillCat, setPrefillCat] = useState("general");

    const triggerPrefilledExpense = (description, category) => {
        setPrefillDesc(description);
        setPrefillCat(category);
        setShowExpenseModal(true);
    };

    const handleCloseExpenseModal = () => {
        setShowExpenseModal(false);
        setPrefillDesc("");
        setPrefillCat("general");
    };

    const styles = getStyles(colors);

    const fetchGroup = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/groups/${groupId}`);
            setGroup(res.data);
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
        }
    };

    const fetchBalances = async () => {
        try {
            const res = await api.get(`/balances/${groupId}`);
            setBalances(res.data);
        } catch {
            console.error("Failed to fetch balances");
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

    const fetchPendingSettlements = async () => {
        try {
            const res = await api.get(`/expenses/settle/pending/${groupId}`);
            setPendingSettlements(res.data || []);
        } catch {
            // Non-critical - the Smart Settlements list still works without this.
        }
    };

    useEffect(() => {
        if (groupId) {
            fetchMe();
            fetchGroup();
            fetchExpenses();
            fetchBalances();
            fetchPendingSettlements();
        }
    }, [groupId]);

    // Live refresh: any confirm/reject/cancel from the other party (or from
    // this user on another device) pushes a "settlementUpdate" event to
    // everyone viewing this group, so balances/pending never go stale.
    useEffect(() => {
        if (!groupId) return;
        connectSocket();
        socket.emit("joinGroup", groupId);
        const onSettlementUpdate = (payload) => {
            if (String(payload?.groupId) !== String(groupId)) return;
            fetchBalances();
            fetchExpenses();
            fetchPendingSettlements();
        };
        socket.on("settlementUpdate", onSettlementUpdate);
        return () => {
            socket.off("settlementUpdate", onSettlementUpdate);
            socket.emit("leaveGroup", groupId);
        };
    }, [groupId]);

    const retryLoad = () => {
        fetchMe();
        fetchGroup();
        fetchExpenses();
        fetchBalances();
        fetchPendingSettlements();
    };

    const handleAddMembers = async (emails) => {
        if (!emails?.length) return;
        try {
            setAdding(true);
            const res = await api.post(`/groups/${groupId}/members`, { emails });
            setGroup(res.data);
        } catch (e) {
            console.error("Failed to add members");
        } finally {
            setAdding(false);
        }
    };

    const handleRemove = async (userId) => {
        try {
            const res = await api.delete(`/groups/${groupId}/members/${userId}`);
            setGroup(res.data);
        } catch (e) {
            console.error("Failed to remove member");
        }
    };

    const handleExpenseAdded = () => {
        handleCloseExpenseModal();
        fetchExpenses();
        fetchBalances();
    };

    // Settlements are two-party: this only files a claim. It never moves a
    // balance by itself - only the counterparty's confirm does (see
    // handleConfirmSettlement below). Prevents either side from unilaterally
    // marking a debt paid.
    const handleRequestSettlement = async (fromUser, toUser, amount, method, note) => {
        try {
            await api.post("/expenses/settle/request", {
                groupId,
                fromUserId: fromUser.userId,
                toUserId: toUser.userId,
                amount: Number(amount),
                method,
                note,
            });
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
                <View style={styles.loadingContainer}>
                    <Loader size={48} />
                    <Text style={styles.loadingText}>Loading group details…</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!group) {
        const isNetworkError = loadError === "network";
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                        {isNetworkError
                            ? "Couldn't reach the server. Check your connection and try again."
                            : "Group not found."}
                    </Text>
                    {isNetworkError && (
                        <TouchableOpacity onPress={retryLoad} style={styles.backButton}>
                            <Text style={styles.backButtonText}>Try Again</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={goBack} style={styles.backButton}>
                        <ArrowLeftCircle size={14} color={colors.primary} />
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={goBack} style={styles.backButtonHeader}>
                        <ArrowLeftCircle size={18} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle} numberOfLines={1}>{group.name}</Text>
                        <View style={styles.headerSubtitle}>
                            <StarIcon size={12} color="#EAB308" />
                            <Text style={styles.headerSubtitleText}>
                               created  by <Text style={styles.creatorName}>{group.createdBy?.name || "You"}</Text>
                            </Text>
                        </View>
                    </View>

                    {isCreator ? (
                        <View style={styles.headerActionsRight}>
                            <TouchableOpacity
                                onPress={() => setShowInviteModal(true)}
                                style={styles.inviteHeaderButton}
                            >
                                <UserPlus size={18} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleDeleteTrip}
                                style={styles.deleteTripHeaderButton}
                            >
                                <Trash2 size={18} color="#DC2626" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.headerSpacer} />
                    )}
                </View>

                {/* Adaptive Smart Widgets */}
                <View style={styles.section}>
                    {group.groupType === "roommate" ? (
                        <RoommateChecklistWidget
                            group={group}
                            expenses={expenses}
                            colors={colors}
                            styles={styles}
                            onAddBillPressed={triggerPrefilledExpense}
                        />
                    ) : (
                        <TripStatsWidget
                            group={group}
                            expenses={expenses}
                            colors={colors}
                            styles={styles}
                        />
                    )}
                </View>

                {/* Members Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                            <Users2 size={18} color={colors.primary} />
                            <Text style={styles.sectionTitle}>Group Members</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setShowExpenseModal(true)}
                            style={styles.addExpenseButton}
                        >
                            <Wallet2 size={16} color="white" />
                            <Text style={styles.addExpenseButtonText}>Add Expense</Text>
                        </TouchableOpacity>
                    </View>

                    {group.members?.length ? (
                        <View style={styles.membersGrid}>
                            {(group.members || []).map((m) => (
                                <View key={m._id} style={styles.memberCard}>
                                    {m.photoURL ? (
                                        <Image source={{ uri: m.photoURL }} style={styles.memberAvatar} />
                                    ) : (
                                        <View style={styles.memberAvatarPlaceholder}>
                                            <Text style={styles.memberAvatarText}>
                                                {m.name ? m.name.charAt(0).toUpperCase() : "U"}
                                            </Text>
                                        </View>
                                    )}

                                    <View style={styles.memberInfo}>
                                        <Text style={styles.memberName} numberOfLines={1}>
                                            {m.name || "Unnamed User"}
                                        </Text>
                                        <Text style={styles.memberEmail} numberOfLines={1}>
                                            {m.email}
                                        </Text>
                                    </View>

                                    {String(group.createdBy?._id) === String(m._id) ? (
                                        <View style={styles.creatorBadge}>
                                            <Text style={styles.creatorBadgeText}>Creator</Text>
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            onPress={() => handleRemove(m._id)}
                                            style={styles.removeButton}
                                        >
                                            <X size={14} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No members yet. Add some!</Text>
                        </View>
                    )}
                </View>

                {/* Add Members Section */}
                <View style={styles.section}>
                    <MemberPicker
                        groupId={groupId}
                        exclude={(group.members || []).map((m) => m.email)}
                        onSubmit={(selectedEmails) => handleAddMembers(selectedEmails)}
                    />
                </View>

                {/* Member Expenses Summary */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                            <Wallet2 size={18} color={colors.primary} />
                            <Text style={styles.sectionTitle}>Member Expenses</Text>
                        </View>
                    </View>

                    {expenses.length === 0 ? (
                        <View style={styles.emptyExpensesContainer}>
                            <View style={styles.emptyExpensesIcon}>
                                <Receipt size={22} color={colors.primary} />
                            </View>
                            <Text style={styles.emptyTitle}>No expenses yet</Text>
                            <Text style={styles.emptyText}>
                                Log your first bill and we&apos;ll split it automatically.
                            </Text>
                            <TouchableOpacity
                                style={styles.emptyExpensesCta}
                                onPress={() => setShowExpenseModal(true)}
                                activeOpacity={0.85}
                            >
                                <Plus size={16} color="#fff" />
                                <Text style={styles.emptyExpensesCtaText}>Add Expense</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.memberExpensesList}>
                            {(group.members || []).map((m) => {
                                const memberExpenses = expenses.filter(
                                    (e) => String(e.paidBy?._id) === String(m._id)
                                );
                                const total = memberExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
                                return (
                                    <TouchableOpacity
                                        key={m._id}
                                        style={styles.memberExpenseCard}
                                        onPress={() => {
                                            setSelectedMember({ member: m, memberExpenses });
                                            setShowMemberExpensesModal(true);
                                        }}
                                        activeOpacity={0.75}
                                    >
                                        <View style={styles.memberExpenseCardLeft}>
                                            {m.photoURL ? (
                                                <Image source={{ uri: m.photoURL }} style={styles.memberExpenseAvatar} />
                                            ) : (
                                                <View style={styles.memberExpenseAvatarPlaceholder}>
                                                    <Text style={styles.memberExpenseAvatarText}>
                                                        {m.name ? m.name.charAt(0).toUpperCase() : "U"}
                                                    </Text>
                                                </View>
                                            )}
                                            <View>
                                                <Text style={styles.memberExpenseName} numberOfLines={1}>
                                                    {m.name || "Unnamed"}
                                                </Text>
                                                <Text style={styles.memberExpenseSubtext}>
                                                    {memberExpenses.length} {memberExpenses.length === 1 ? "expense" : "expenses"}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.memberExpenseCardRight}>
                                            <Text style={styles.memberExpenseTotal}>₹{total}</Text>
                                            <Text style={styles.memberExpenseViewText}>View →</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* Balance Section */}
                <View style={styles.section}>
                    <GroupBalanceSection
                        balances={balances}
                        pendingSettlements={pendingSettlements}
                        meId={userId}
                        onRequestSettlement={handleRequestSettlement}
                        onConfirmSettlement={handleConfirmSettlement}
                        onRejectSettlement={handleRejectSettlement}
                        onCancelSettlement={handleCancelSettlement}
                    />
                </View>

                {/* Notepad */}
                <View style={styles.section}>
                    <NotepadSection groupId={groupId} />
                </View>
            </ScrollView>

            {/* Add Expense Modal */}
            {showExpenseModal && (
                <AddExpenseModal
                    group={group}
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

            {/* Invite Modal */}
            <InviteModal
                groupId={groupId}
                visible={showInviteModal}
                onClose={() => setShowInviteModal(false)}
            />

            {/* Member Expenses Modal */}
            <Modal
                visible={showMemberExpensesModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowMemberExpensesModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.sectionTitleRow}>
                                {selectedMember?.member.photoURL ? (
                                    <Image
                                        source={{ uri: selectedMember.member.photoURL }}
                                        style={styles.modalAvatar}
                                    />
                                ) : (
                                    <View style={styles.modalAvatarPlaceholder}>
                                        <Text style={styles.modalAvatarText}>
                                            {selectedMember?.member.name
                                                ? selectedMember.member.name.charAt(0).toUpperCase()
                                                : "U"}
                                        </Text>
                                    </View>
                                )}
                                <View>
                                    <Text style={styles.modalTitle}>
                                        {selectedMember?.member.name || "Member"}
                                    </Text>
                                    <Text style={styles.modalSubtitle}>
                                        {selectedMember?.memberExpenses.length}{" "}
                                        {selectedMember?.memberExpenses.length === 1 ? "expense" : "expenses"} •{" "}
                                        ₹{selectedMember?.memberExpenses.reduce((s, e) => s + (e.amount || 0), 0)}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowMemberExpensesModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <X size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
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
                                    <View style={styles.expenseCard}>
                                        <View style={styles.expenseLeft}>
                                            <View style={styles.expenseIcon}>
                                                <Icon size={18} color={colors.primary} />
                                            </View>
                                            <View style={styles.expenseDetails}>
                                                <Text style={styles.expenseDescription} numberOfLines={1}>
                                                    {exp.description}
                                                </Text>
                                                <Text style={styles.expenseInfo} numberOfLines={1}>
                                                    ₹{exp.amount}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.expenseRight}>
                                            <View style={styles.categoryBadge}>
                                                <Text style={styles.categoryBadgeText}>{exp.category}</Text>
                                            </View>
                                            {exp.ocrText && (
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setSelectedOcr(exp);
                                                        setShowOcrModal(true);
                                                    }}
                                                    style={styles.ocrButton}
                                                >
                                                    <Eye size={18} color={colors.textSecondary} />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                );
                            }}
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

function TripStatsWidget({ group, expenses, colors, styles }) {
    const [budget, setBudget] = useState("10000");
    const [duration, setDuration] = useState("5");
    const [isEditing, setIsEditing] = useState(false);
    const [inputBudget, setInputBudget] = useState("10000");
    const [inputDuration, setInputDuration] = useState("5");

    useEffect(() => {
        const loadStats = async () => {
            try {
                const storedBudget = await AsyncStorage.getItem(`splitApp_budget_${group._id}`);
                const storedDuration = await AsyncStorage.getItem(`splitApp_duration_${group._id}`);
                if (storedBudget !== null) {
                    setBudget(storedBudget);
                    setInputBudget(storedBudget);
                }
                if (storedDuration !== null) {
                    setDuration(storedDuration);
                    setInputDuration(storedDuration);
                }
            } catch (e) {
                console.error("Failed to load trip stats", e);
            }
        };
        loadStats();
    }, [group._id]);

    const handleSave = async () => {
        try {
            await AsyncStorage.setItem(`splitApp_budget_${group._id}`, inputBudget);
            await AsyncStorage.setItem(`splitApp_duration_${group._id}`, inputDuration);
            setBudget(inputBudget);
            setDuration(inputDuration);
            setIsEditing(false);
        } catch (e) {
            console.error("Failed to save trip stats", e);
        }
    };

    const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const budgetNum = parseFloat(budget) || 0;
    const durationNum = parseFloat(duration) || 1;
    const spentPercent = budgetNum > 0 ? Math.min((totalSpent / budgetNum) * 100, 100) : 0;
    const dailyAverage = totalSpent / durationNum;
    const remaining = budgetNum - totalSpent;

    return (
        <View style={styles.widgetCard}>
            <LinearGradient
                colors={["#4F46E5", "#6366F1"]}
                style={styles.widgetHeaderGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.widgetHeaderTitleRow}>
                    <Plane size={18} color="white" />
                    <Text style={styles.widgetHeaderTitle}>Trip Smart Dashboard</Text>
                </View>
                <View style={styles.widgetHeaderBadge}>
                    <Text style={styles.widgetHeaderBadgeText}>✈️ Trip Split</Text>
                </View>
            </LinearGradient>
            
            <View style={styles.widgetBody}>
                {isEditing ? (
                    <View style={styles.editRow}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.widgetSubLabel}>Total Budget (₹)</Text>
                            <TextInput
                                style={styles.widgetInput}
                                keyboardType="numeric"
                                value={inputBudget}
                                onChangeText={setInputBudget}
                                placeholder="Budget"
                                placeholderTextColor={colors.placeholder}
                            />
                        </View>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.widgetSubLabel}>Duration (Days)</Text>
                            <TextInput
                                style={styles.widgetInput}
                                keyboardType="numeric"
                                value={inputDuration}
                                onChangeText={setInputDuration}
                                placeholder="Days"
                                placeholderTextColor={colors.placeholder}
                            />
                        </View>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                            <Text style={{ color: "white", fontWeight: "600" }}>Save</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.budgetRow}>
                        <View>
                            <Text style={styles.widgetSubLabel}>Trip Budget</Text>
                            <Text style={styles.widgetHighlightValue}>₹{budget} <Text style={{ fontSize: 13, fontWeight: "normal", color: colors.textSecondary }}>for {duration} days</Text></Text>
                        </View>
                        <Text style={styles.editHintText}>Edit 📝</Text>
                    </TouchableOpacity>
                )}

                {/* Progress bar */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressLabelRow}>
                        <Text style={styles.progressMiniLabel}>Spent: ₹{totalSpent}</Text>
                        <Text style={styles.progressMiniLabel}>Limit: ₹{budget}</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${spentPercent}%`, backgroundColor: spentPercent > 90 ? "#EF4444" : "#4F46E5" }]} />
                    </View>
                </View>

                {/* Grid stats */}
                <View style={styles.gridStats}>
                    <View style={styles.statBox}>
                        <TrendingUp size={16} color="#4F46E5" style={{ marginBottom: 4 }} />
                        <Text style={styles.statLabel}>Daily Average</Text>
                        <Text style={styles.statValue}>₹{dailyAverage.toFixed(0)}/day</Text>
                    </View>
                    <View style={styles.statBox}>
                        <MapPin size={16} color={remaining < 0 ? "#EF4444" : "#10B981"} style={{ marginBottom: 4 }} />
                        <Text style={styles.statLabel}>{remaining < 0 ? "Over Budget" : "Remaining"}</Text>
                        <Text style={[styles.statValue, { color: remaining < 0 ? "#EF4444" : "#10B981" }]}>
                            ₹{Math.abs(remaining).toFixed(0)}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

function RoommateChecklistWidget({ group, expenses, colors, styles, onAddBillPressed }) {
    const [checkedItems, setCheckedItems] = useState({});

    useEffect(() => {
        const loadChecklist = async () => {
            try {
                const stored = await AsyncStorage.getItem(`splitApp_checklist_${group._id}`);
                if (stored !== null) {
                    setCheckedItems(JSON.parse(stored));
                }
            } catch (e) {
                console.error("Failed to load checklist", e);
            }
        };
        loadChecklist();
    }, [group._id]);

    const toggleItem = async (itemId) => {
        const updated = { ...checkedItems, [itemId]: !checkedItems[itemId] };
        setCheckedItems(updated);
        try {
            await AsyncStorage.setItem(`splitApp_checklist_${group._id}`, JSON.stringify(updated));
        } catch (e) {
            console.error("Failed to save checklist", e);
        }
    };

    const UTILITIES = [
        { id: "rent", name: "Monthly Rent", category: "rent" },
        { id: "wifi", name: "WiFi Bill", category: "bills" },
        { id: "electricity", name: "Electricity Bill", category: "bills" },
        { id: "water", name: "Water & Gas Bill", category: "bills" },
    ];

    return (
        <View style={styles.widgetCard}>
            <LinearGradient
                colors={["#059669", "#10B981"]}
                style={styles.widgetHeaderGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.widgetHeaderTitleRow}>
                    <Home size={18} color="white" />
                    <Text style={styles.widgetHeaderTitle}>Flatmate Smart Bills</Text>
                </View>
                <View style={styles.widgetHeaderBadge}>
                    <Text style={styles.widgetHeaderBadgeText}>🏠 Roommate Split</Text>
                </View>
            </LinearGradient>
            
            <View style={styles.widgetBody}>
                <Text style={styles.widgetSubLabel}>Monthly Utility & Bills Checklist</Text>
                <View style={styles.utilityList}>
                    {UTILITIES.map((util) => {
                        const isDone = !!checkedItems[util.id];
                        return (
                            <View key={util.id} style={styles.utilityItem}>
                                <TouchableOpacity
                                    style={styles.utilityItemLeft}
                                    onPress={() => toggleItem(util.id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[
                                        styles.utilityCheckbox,
                                        isDone && { backgroundColor: "#10B981", borderColor: "#10B981" }
                                    ]}>
                                        {isDone && <CheckCircle size={14} color="white" />}
                                    </View>
                                    <Text style={[
                                        styles.utilityName,
                                        isDone && { textDecorationLine: "line-through", color: colors.textSecondary }
                                    ]}>
                                        {util.name}
                                    </Text>
                                </TouchableOpacity>
                                
                                {!isDone ? (
                                    <TouchableOpacity
                                        style={styles.addBillQuickBtn}
                                        onPress={() => onAddBillPressed(util.name, util.category)}
                                    >
                                        <Plus size={12} color="white" />
                                        <Text style={styles.addBillQuickText}>Split</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <Text style={styles.utilityStatusLabel}>Settled</Text>
                                )}
                            </View>
                        );
                    })}
                </View>
            </View>
        </View>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 16,
        paddingBottom: 100,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: colors.text,
        marginBottom: 16,
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    backButtonText: {
        fontSize: 14,
        color: colors.primary,
        textDecorationLine: "underline",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 24,
        paddingVertical: 16,
        marginBottom: 16,
        gap: 12,
    },
    backButtonHeader: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: colors.background,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.border,
    },
    headerCenter: {
        flex: 1,
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: colors.primary,
    },
    headerSubtitle: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 2,
    },
    headerSubtitleText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    creatorName: {
        fontWeight: "600",
        color: colors.primary,
    },
    headerSpacer: {
        width: 34,
    },
    headerActionsRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    inviteHeaderButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: colors.primaryLight,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.primary,
    },
    deleteTripHeaderButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: "#FEE2E2",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#FCA5A5",
    },
    section: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        paddingHorizontal: 24,
    },
    sectionTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.primary,
    },
    addExpenseButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    addExpenseButtonText: {
        color: "white",
        fontSize: 14,
        fontWeight: "600",
    },
    membersGrid: {
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
        gap: 0,
    },
    memberCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        position: "relative",
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderColor: colors.border,
    },
    memberAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.border,
    },
    memberAvatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primaryLight,
        justifyContent: "center",
        alignItems: "center",
    },
    memberAvatarText: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.primary,
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 2,
    },
    memberEmail: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    creatorBadge: {
        backgroundColor: colors.primaryLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    creatorBadgeText: {
        fontSize: 10,
        fontWeight: "600",
        color: colors.primary,
    },
    removeButton: {
        padding: 4,
    },
    emptyContainer: {
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
        paddingVertical: 40,
        alignItems: "center",
    },
    emptyText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    expenseCount: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    emptyExpensesContainer: {
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
        paddingVertical: 40,
        alignItems: "center",
    },
    emptyExpensesIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.background, // Used background instead of F3F4F6
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 4,
    },
    emptyExpensesCta: {
        marginTop: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 10,
    },
    emptyExpensesCtaText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "700",
    },
    expensesList: {
        gap: 0,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
    },
    expenseCard: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderColor: colors.border,
        paddingVertical: 16,
        paddingHorizontal: 24,
    },
    expenseLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flex: 1,
    },
    expenseIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: "center",
        alignItems: "center",
    },
    expenseDetails: {
        flex: 1,
    },
    expenseDescription: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 4,
    },
    expenseInfo: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    expensePaidBy: {
        fontWeight: "600",
        color: colors.primary,
    },
    expenseRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    categoryBadge: {
        backgroundColor: colors.background,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    categoryBadgeText: {
        fontSize: 11,
        fontWeight: "600",
        color: colors.textSecondary,
        textTransform: "uppercase",
    },
    ocrButton: {
        padding: 4,
    },
    memberExpensesList: {
        gap: 0,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
    },
    memberExpenseCard: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderColor: colors.border,
        paddingVertical: 16,
        paddingHorizontal: 24,
    },
    memberExpenseCardLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flex: 1,
    },
    memberExpenseAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: colors.border,
    },
    memberExpenseAvatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primaryLight,
        justifyContent: "center",
        alignItems: "center",
    },
    memberExpenseAvatarText: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.primary,
    },
    memberExpenseName: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 2,
    },
    memberExpenseSubtext: {
        fontSize: 12,
        color: colors.textSecondary,
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
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalAvatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primaryLight,
        justifyContent: "center",
        alignItems: "center",
    },
    modalAvatarText: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.primary,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.text,
    },
    modalSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    modalCloseButton: {
        padding: 4,
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
        borderRadius: 12,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        marginHorizontal: 24,
    },
    widgetHeaderGradient: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
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
        backgroundColor: colors.inputBackground,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        color: colors.text,
        fontSize: 14,
        marginTop: 4,
    },
    saveBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        height: 38,
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
        backgroundColor: colors.border,
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
        backgroundColor: colors.inputBackground,
        borderRadius: 8,
        padding: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.border,
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
        backgroundColor: colors.inputBackground,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
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
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
    },
    addBillQuickText: {
        color: "white",
        fontSize: 12,
        fontWeight: "600",
    },
});
