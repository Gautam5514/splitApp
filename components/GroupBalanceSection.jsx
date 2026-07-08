import { useTheme } from "@/context/ThemeContext";
import {
    ArrowDownCircle,
    ArrowUpCircle,
    CheckCircle2,
    Coins,
    SmilePlus,
    Wallet2,
    Zap,
} from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function GroupBalanceSection({ balances, meId, onSettle }) {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    // Holds the suggestion index awaiting creditor confirmation
    const [pendingConfirm, setPendingConfirm] = useState(null);

    const hasBalances = balances?.balances?.length > 0;
    const hasSuggestions = balances?.suggestions?.length > 0;
    const canSettle = typeof onSettle === "function";

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Wallet2 size={18} color={colors.primary} />
                    <Text style={styles.headerTitle}>Balances</Text>
                </View>

                {hasBalances && (
                    <Text style={styles.headerCount}>
                        {balances.balances.length}{" "}
                        {balances.balances.length === 1 ? "entry" : "entries"}
                    </Text>
                )}
            </View>

            {/* No Balances */}
            {!hasBalances ? (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIcon}>
                        <Coins size={22} color={colors.primary} />
                    </View>
                    <Text style={styles.emptyText}>
                        No balances yet — add some expenses to see who owes whom.
                    </Text>
                </View>
            ) : (
                <View style={styles.balancesList}>
                    {balances.balances.map((b, i) => {
                        const bal = Number(b.balance) || 0;
                        const isUp = bal > 0.01;
                        const isDown = bal < -0.01;
                        return (
                            <View key={b.userId || i} style={styles.balanceItem}>
                                <View style={styles.balanceLeft}>
                                    {isUp ? (
                                        <ArrowUpCircle size={16} color={colors.success} />
                                    ) : isDown ? (
                                        <ArrowDownCircle size={16} color={colors.error} />
                                    ) : (
                                        <SmilePlus size={16} color={colors.textSecondary} />
                                    )}
                                    <Text style={styles.balanceName} numberOfLines={1}>
                                        {b.name}
                                    </Text>
                                </View>

                                <Text
                                    style={[
                                        styles.balanceAmount,
                                        isUp
                                            ? styles.balancePositive
                                            : isDown
                                                ? styles.balanceNegative
                                                : styles.balanceNeutral,
                                    ]}
                                >
                                    {isUp
                                        ? `+₹${Math.abs(bal).toFixed(0)}`
                                        : isDown
                                            ? `-₹${Math.abs(bal).toFixed(0)}`
                                            : "Settled"}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            )}

            {/* Smart Settlements */}
            {hasSuggestions && (
                <View style={styles.suggestionsContainer}>
                    <View style={styles.suggestionsTitleRow}>
                        <Zap size={14} color={colors.warning} />
                        <Text style={styles.suggestionsTitle}>Smart Settlements</Text>
                    </View>

                    <View style={styles.suggestionsList}>
                        {balances.suggestions.map((s, i) => {
                            const isDebtor =
                                meId != null && String(s.from.userId) === String(meId);
                            const isCreditor =
                                meId != null && String(s.to.userId) === String(meId);
                            const isAwaiting = pendingConfirm === i;
                            const amt = Number(s.amount).toFixed(0);

                            return (
                                <View key={i} style={styles.suggestionItem}>
                                    <Text style={styles.suggestionText}>
                                        <Text style={styles.suggestionFrom}>
                                            {isDebtor ? "You" : s.from.name}
                                        </Text>
                                        <Text style={styles.suggestionNormal}> owe </Text>
                                        <Text style={styles.suggestionAmount}>₹{amt}</Text>
                                        <Text style={styles.suggestionNormal}> to </Text>
                                        <Text style={styles.suggestionTo}>
                                            {isCreditor ? "You" : s.to.name}
                                        </Text>
                                    </Text>

                                    {/* Debtor — direct "I've Paid" */}
                                    {canSettle && isDebtor && (
                                        <TouchableOpacity
                                            activeOpacity={0.85}
                                            style={[styles.actionBtn, styles.payBtn]}
                                            onPress={() => onSettle(s.from, s.to, s.amount)}
                                        >
                                            <CheckCircle2 size={14} color={colors.success} />
                                            <Text style={styles.payBtnText}>
                                                I&apos;ve Paid ₹{amt}
                                            </Text>
                                        </TouchableOpacity>
                                    )}

                                    {/* Creditor — confirm received */}
                                    {canSettle && isCreditor && !isAwaiting && (
                                        <TouchableOpacity
                                            activeOpacity={0.85}
                                            style={[styles.actionBtn, styles.confirmBtn]}
                                            onPress={() => setPendingConfirm(i)}
                                        >
                                            <CheckCircle2 size={14} color={colors.warning} />
                                            <Text style={styles.confirmBtnText}>
                                                Confirm Payment Received
                                            </Text>
                                        </TouchableOpacity>
                                    )}

                                    {/* Creditor — inline confirmation */}
                                    {canSettle && isCreditor && isAwaiting && (
                                        <View style={styles.confirmBox}>
                                            <Text style={styles.confirmQuestion}>
                                                Has {s.from.name} actually paid you ₹{amt}?
                                            </Text>
                                            <View style={styles.confirmActions}>
                                                <TouchableOpacity
                                                    activeOpacity={0.85}
                                                    style={[styles.confirmChoice, styles.confirmYes]}
                                                    onPress={() => {
                                                        setPendingConfirm(null);
                                                        onSettle(s.from, s.to, s.amount);
                                                    }}
                                                >
                                                    <Text style={styles.confirmYesText}>
                                                        Yes, Confirm
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    activeOpacity={0.85}
                                                    style={[styles.confirmChoice, styles.confirmNo]}
                                                    onPress={() => setPendingConfirm(null)}
                                                >
                                                    <Text style={styles.confirmNoText}>
                                                        No, Cancel
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}

                                    {/* Third party — info only */}
                                    {canSettle && !isDebtor && !isCreditor && (
                                        <Text style={styles.thirdPartyNote}>
                                            Only the people involved can record this settlement
                                        </Text>
                                    )}

                                    {!canSettle && (
                                        <Text style={styles.suggestionNumber}>
                                            Suggestion #{i + 1}
                                        </Text>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </View>
            )}
        </View>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 20,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.primary,
    },
    headerCount: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    emptyContainer: {
        alignItems: "center",
        paddingVertical: 40,
    },
    emptyIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.inputBackground,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: "center",
    },
    balancesList: {
        gap: 12,
    },
    balanceItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: colors.inputBackground,
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    balanceLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flex: 1,
        marginRight: 8,
    },
    balanceName: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        flexShrink: 1,
    },
    balanceAmount: {
        fontSize: 14,
        fontWeight: "600",
    },
    balancePositive: {
        color: colors.success,
    },
    balanceNegative: {
        color: colors.error,
    },
    balanceNeutral: {
        color: colors.textSecondary,
    },
    suggestionsContainer: {
        marginTop: 28,
    },
    suggestionsTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 12,
    },
    suggestionsTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: colors.text,
    },
    suggestionsList: {
        gap: 12,
    },
    suggestionItem: {
        backgroundColor: colors.inputBackground,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        borderRadius: 12,
        gap: 10,
    },
    suggestionText: {
        fontSize: 13,
        lineHeight: 20,
    },
    suggestionFrom: {
        fontWeight: "700",
        color: colors.error,
    },
    suggestionNormal: {
        color: colors.textSecondary,
    },
    suggestionAmount: {
        fontWeight: "700",
        color: colors.text,
    },
    suggestionTo: {
        fontWeight: "700",
        color: colors.success,
    },
    suggestionNumber: {
        fontSize: 11,
        color: colors.textSecondary,
        textTransform: "uppercase",
    },
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
    },
    payBtn: {
        backgroundColor: colors.successLight,
        borderColor: colors.success,
    },
    payBtnText: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.success,
    },
    confirmBtn: {
        backgroundColor: "rgba(245,158,11,0.12)",
        borderColor: colors.warning,
    },
    confirmBtnText: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.warning,
    },
    confirmBox: {
        borderWidth: 1,
        borderColor: colors.warning,
        backgroundColor: "rgba(245,158,11,0.10)",
        borderRadius: 10,
        padding: 12,
        gap: 10,
    },
    confirmQuestion: {
        fontSize: 12,
        color: colors.text,
        fontWeight: "500",
        lineHeight: 18,
    },
    confirmActions: {
        flexDirection: "row",
        gap: 8,
    },
    confirmChoice: {
        flex: 1,
        paddingVertical: 9,
        borderRadius: 8,
        alignItems: "center",
    },
    confirmYes: {
        backgroundColor: colors.success,
    },
    confirmYesText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    confirmNo: {
        borderWidth: 1,
        borderColor: colors.border,
    },
    confirmNoText: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.textSecondary,
    },
    thirdPartyNote: {
        fontSize: 11,
        color: colors.textSecondary,
        textAlign: "center",
        paddingVertical: 2,
    },
});
