import { Skeleton, SkeletonCircle } from "@/components/ui/Skeleton";
import { useTheme } from "@/context/ThemeContext";
import { Block, IconCircle, ListRow, PillButton, PillInput, SectionLabel } from "@/components/ui/Design";
import { surfaceStyle, tokens } from "@/constants/design";
import {
    ArrowDownCircle,
    ArrowUpCircle,
    CheckCircle2,
    Clock,
    Coins,
    Copy,
    Check,
    Download,
    QrCode,
    SmilePlus,
    Smartphone,
    X,
    Zap,
} from "lucide-react-native";
import { Alert } from "@/lib/alert";
import { formatMoney } from "@/lib/groupPresets";
import { useState } from "react";
import { Image, Linking, Modal, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { Text } from "@/components/ui/Typography";

export default function GroupBalanceSection({
    balances,
    loading = false,
    pendingSettlements,
    meId,
    currency = "INR",
    groupName = "",
    onRequestSettlement,
    onConfirmSettlement,
    onRejectSettlement,
    onCancelSettlement,
}) {
    const { colors, theme } = useTheme();
    const isDark = theme === "dark";
    const t = tokens(colors, isDark);
    const styles = getStyles(colors, t);

    // Holds the suggestion index whose payment-method picker is open
    const [activeForm, setActiveForm] = useState(null);
    const [method, setMethod] = useState("cash");
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);
    // The suggestion whose payment sheet (UPI + QR) is open, or null.
    const [payTarget, setPayTarget] = useState(null);
    const [copied, setCopied] = useState(false);

    const copyUpi = async (upiId) => {
        try {
            await Clipboard.setStringAsync(String(upiId));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            Alert.alert("Couldn't copy", "Please copy the UPI ID manually.");
        }
    };

    // No file-system/media-library dep in the app, so "download" opens the QR
    // image in the in-app browser where the user can long-press → Save image.
    const openQr = async (url) => {
        try {
            await WebBrowser.openBrowserAsync(url);
        } catch {
            Linking.openURL(url).catch(() => Alert.alert("Couldn't open", "Try again or ask for the UPI ID instead."));
        }
    };

    const money = (v) => formatMoney(v, currency);
    // upi:// deep link - opens GPay/PhonePe/Paytm with payee + amount filled in.
    const payViaUpi = (s) => {
        const url = `upi://pay?pa=${encodeURIComponent(s.to.upiId)}&pn=${encodeURIComponent(s.to.name || "")}&am=${Number(s.amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(`SplitEase: ${groupName}`.slice(0, 50))}`;
        Linking.openURL(url).catch(() => Alert.alert("No UPI app found", "Install a UPI app like GPay or PhonePe, or pay another way."));
    };

    const hasBalances = balances?.balances?.length > 0;
    const hasSuggestions = balances?.suggestions?.length > 0;
    const canSettle = typeof onRequestSettlement === "function";

    const findPendingFor = (s) =>
        pendingSettlements?.find(
            (r) =>
                String(r.fromUserId._id) === String(s.from.userId) &&
                String(r.toUserId._id) === String(s.to.userId)
        );

    const openForm = (i) => {
        setActiveForm(i);
        setMethod("cash");
        setNote("");
    };
    const closeForm = () => setActiveForm(null);

    const submitRequest = async (s) => {
        setSubmitting(true);
        await onRequestSettlement(s.from, s.to, s.amount, method, note.trim());
        setSubmitting(false);
        closeForm();
    };

    return (
        <View>
            {/* Header */}
            <SectionLabel
                right={
                    hasBalances ? (
                        <Text style={styles.headerCount}>
                            {balances.balances.length}{" "}
                            {balances.balances.length === 1 ? "entry" : "entries"}
                        </Text>
                    ) : null
                }
            >
                Balances
            </SectionLabel>

            {/* Still fetching: skeleton, not the "No balances" message */}
            {loading ? (
                <Block>
                    <View style={{ gap: 14, paddingVertical: 6 }}>
                        {[0, 1, 2].map((i) => (
                            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                <SkeletonCircle size={36} />
                                <Skeleton width="45%" height={13} />
                                <View style={{ flex: 1 }} />
                                <Skeleton width={56} height={13} />
                            </View>
                        ))}
                    </View>
                </Block>
            ) : !hasBalances ? (
                <Block>
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIcon}>
                            <Coins size={22} color={colors.primary} />
                        </View>
                        <Text style={styles.emptyText}>
                            No balances yet — add some expenses to see who owes whom.
                        </Text>
                    </View>
                </Block>
            ) : (
                <Block padded={false} style={styles.balancesBlock}>
                    {balances.balances.map((b, i) => {
                        const bal = Number(b.balance) || 0;
                        const isUp = bal > 0.01;
                        const isDown = bal < -0.01;
                        return (
                            <ListRow
                                key={b.userId || i}
                                leading={
                                    <IconCircle size={40}>
                                        {isUp ? (
                                            <ArrowUpCircle size={18} color={colors.success} />
                                        ) : isDown ? (
                                            <ArrowDownCircle size={18} color={colors.error} />
                                        ) : (
                                            <SmilePlus size={18} color={colors.textSecondary} />
                                        )}
                                    </IconCircle>
                                }
                                title={b.name}
                                trailing={
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
                                            ? `+${money(Math.abs(bal))}`
                                            : isDown
                                                ? `-${money(Math.abs(bal))}`
                                                : "Settled"}
                                    </Text>
                                }
                            />
                        );
                    })}
                </Block>
            )}

            {/* Smart Settlements */}
            {hasSuggestions && (
                <>
                    <SectionLabel
                        right={<Zap size={16} color={colors.warning} />}
                    >
                        Smart Settlements
                    </SectionLabel>

                    <View style={styles.suggestionsList}>
                        {balances.suggestions.map((s, i) => {
                            const isDebtor =
                                meId != null && String(s.from.userId) === String(meId);
                            const isCreditor =
                                meId != null && String(s.to.userId) === String(meId);
                            const pending = findPendingFor(s);
                            const isFormOpen = activeForm === i;
                            const amt = Number(s.amount).toFixed(0);

                            return (
                                <Block key={i} style={styles.suggestionItem}>
                                    <Text style={styles.suggestionText}>
                                        <Text style={styles.suggestionFrom}>
                                            {isDebtor ? "You" : s.from.name}
                                        </Text>
                                        <Text style={styles.suggestionNormal}> owe </Text>
                                        <Text style={styles.suggestionAmount}>{money(amt)}</Text>
                                        <Text style={styles.suggestionNormal}> to </Text>
                                        <Text style={styles.suggestionTo}>
                                            {isCreditor ? "You" : s.to.name}
                                        </Text>
                                    </Text>

                                    {pending ? (
                                        <PendingSettlementRow
                                            pending={pending}
                                            meId={meId}
                                            money={money}
                                            colors={colors}
                                            styles={styles}
                                            onConfirm={onConfirmSettlement}
                                            onReject={onRejectSettlement}
                                            onCancel={onCancelSettlement}
                                        />
                                    ) : isFormOpen ? (
                                        <View style={styles.confirmBox}>
                                            {isCreditor && (
                                                <Text style={[styles.confirmQuestion, { fontWeight: "700" }]}>
                                                    Are you sure you received {money(amt)}? This will mark it as settled.
                                                </Text>
                                            )}
                                            <Text style={styles.confirmQuestion}>
                                                How did you {isDebtor ? "pay" : "receive"}?
                                            </Text>
                                            <View style={styles.methodRow}>
                                                {[
                                                    { key: "cash", label: "Cash" },
                                                    { key: "online", label: "Online" },
                                                ].map((m) => (
                                                    <TouchableOpacity
                                                        key={m.key}
                                                        activeOpacity={0.85}
                                                        style={[
                                                            styles.methodBtn,
                                                            method === m.key && styles.methodBtnActive,
                                                        ]}
                                                        onPress={() => setMethod(m.key)}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.methodBtnText,
                                                                method === m.key && styles.methodBtnTextActive,
                                                            ]}
                                                        >
                                                            {m.label}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                            <PillInput
                                                value={note}
                                                onChangeText={setNote}
                                                maxLength={200}
                                                placeholder="Add a note (optional) — e.g. UPI ref no."
                                                placeholderTextColor={colors.textSecondary}
                                            />
                                            <View style={styles.confirmActions}>
                                                <PillButton
                                                    variant="primary"
                                                    disabled={submitting}
                                                    onPress={() => submitRequest(s)}
                                                    label={submitting ? (isCreditor ? "Settling…" : "Sending…") : isCreditor ? "Yes, I Received It" : "Send Request"}
                                                    style={styles.confirmChoice}
                                                    textStyle={styles.confirmChoiceText}
                                                />
                                                <PillButton
                                                    variant="secondary"
                                                    onPress={closeForm}
                                                    label="Cancel"
                                                    style={styles.confirmChoice}
                                                    textStyle={styles.confirmChoiceText}
                                                />
                                            </View>
                                        </View>
                                    ) : canSettle && isDebtor ? (
                                        <View style={{ gap: 8 }}>
                                            {(s.to.upiId || s.to.upiQrUrl) && currency === "INR" ? (
                                                <PillButton
                                                    variant="primary"
                                                    onPress={() => { setCopied(false); setPayTarget(s); }}
                                                    icon={<Smartphone size={16} color={t.onInk} />}
                                                    label={`Pay ${money(amt)} to ${s.to.name}`}
                                                    style={styles.actionBtn}
                                                    textStyle={styles.actionBtnText}
                                                />
                                            ) : null}
                                            <PillButton
                                                variant="secondary"
                                                onPress={() => openForm(i)}
                                                icon={<CheckCircle2 size={16} color={colors.success} />}
                                                label={`I've Paid ${money(amt)}`}
                                                style={styles.actionBtn}
                                                textStyle={[styles.actionBtnText, { color: colors.success }]}
                                            />
                                            {(s.to.upiId || s.to.upiQrUrl) && currency === "INR" ? (
                                                <Text style={styles.thirdPartyNote}>After paying, tap &quot;I&apos;ve Paid&quot; so {s.to.name} can confirm.</Text>
                                            ) : null}
                                        </View>
                                    ) : canSettle && isCreditor ? (
                                        <PillButton
                                            variant="secondary"
                                            onPress={() => openForm(i)}
                                            icon={<CheckCircle2 size={16} color={colors.warning} />}
                                            label={`Mark ${money(amt)} as Received`}
                                            style={styles.actionBtn}
                                            textStyle={[styles.actionBtnText, { color: colors.warning }]}
                                        />
                                    ) : canSettle ? (
                                        <Text style={styles.thirdPartyNote}>
                                            Only the people involved can record this settlement
                                        </Text>
                                    ) : (
                                        <Text style={styles.suggestionNumber}>
                                            Suggestion #{i + 1}
                                        </Text>
                                    )}
                                </Block>
                            );
                        })}
                    </View>
                </>
            )}

            {/* Payment sheet: payee UPI ID (copy) + QR (open/save) + UPI app link */}
            <Modal
                visible={!!payTarget}
                transparent
                animationType="slide"
                onRequestClose={() => setPayTarget(null)}
            >
                <Pressable style={styles.sheetBackdrop} onPress={() => setPayTarget(null)}>
                    <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                        {payTarget && (
                            <>
                                <View style={styles.sheetHandle} />
                                <View style={styles.sheetHeader}>
                                    <View>
                                        <Text style={styles.sheetKicker}>PAY</Text>
                                        <Text style={styles.sheetTitle}>Send {money(Number(payTarget.amount).toFixed(0))}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setPayTarget(null)} style={styles.sheetClose} hitSlop={10}>
                                        <X size={18} color={colors.text} />
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.sheetPayee}>to {payTarget.to.name}</Text>

                                {/* QR */}
                                {payTarget.to.upiQrUrl ? (
                                    <View style={styles.sheetQrWrap}>
                                        <View style={styles.sheetQrLabelRow}>
                                            <QrCode size={13} color={colors.primary} />
                                            <Text style={styles.sheetSectionLabel}>Scan to pay</Text>
                                        </View>
                                        <View style={styles.sheetQrBox}>
                                            <Image source={{ uri: payTarget.to.upiQrUrl }} style={styles.sheetQrImg} resizeMode="contain" />
                                        </View>
                                        <TouchableOpacity style={styles.sheetGhostBtn} onPress={() => openQr(payTarget.to.upiQrUrl)} activeOpacity={0.85}>
                                            <Download size={15} color={colors.text} />
                                            <Text style={styles.sheetGhostText}>Open / save QR</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : null}

                                {/* UPI ID + copy */}
                                {payTarget.to.upiId ? (
                                    <View style={styles.sheetUpiWrap}>
                                        <View style={styles.sheetQrLabelRow}>
                                            <Coins size={13} color={colors.primary} />
                                            <Text style={styles.sheetSectionLabel}>UPI ID</Text>
                                        </View>
                                        <View style={styles.sheetUpiRow}>
                                            <Text style={styles.sheetUpiText} numberOfLines={1}>{payTarget.to.upiId}</Text>
                                            <TouchableOpacity
                                                style={[styles.sheetCopyBtn, copied && styles.sheetCopyBtnDone]}
                                                onPress={() => copyUpi(payTarget.to.upiId)}
                                                activeOpacity={0.85}
                                            >
                                                {copied ? <Check size={14} color={colors.success} /> : <Copy size={14} color={t.onInk} />}
                                                <Text style={[styles.sheetCopyText, copied && { color: colors.success }]}>{copied ? "Copied" : "Copy"}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : null}

                                {/* One-tap UPI app */}
                                {payTarget.to.upiId ? (
                                    <PillButton
                                        variant="primary"
                                        onPress={() => payViaUpi(payTarget)}
                                        icon={<Smartphone size={16} color={t.onInk} />}
                                        label="Open UPI app"
                                        style={styles.sheetPrimaryBtn}
                                        textStyle={styles.actionBtnText}
                                    />
                                ) : null}

                                {/* Confirm → existing settlement request flow */}
                                <PillButton
                                    variant="secondary"
                                    onPress={() => {
                                        const idx = balances.suggestions.findIndex(
                                            (x) => String(x.to.userId) === String(payTarget.to.userId) && String(x.from.userId) === String(payTarget.from.userId)
                                        );
                                        setPayTarget(null);
                                        if (idx >= 0) openForm(idx);
                                    }}
                                    icon={<CheckCircle2 size={16} color={colors.success} />}
                                    label={`I've Paid ${money(Number(payTarget.amount).toFixed(0))}`}
                                    style={styles.sheetPrimaryBtn}
                                    textStyle={[styles.actionBtnText, { color: colors.success }]}
                                />
                                <Text style={styles.sheetFootNote}>{payTarget.to.name} will get a request to confirm before it&apos;s settled.</Text>
                            </>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

// A pending settlement claim on a suggestion row: either "waiting on the
// other party" (if I initiated it) or "confirm/reject" (if I need to act).
function PendingSettlementRow({ pending, meId, money, colors, styles, onConfirm, onReject, onCancel }) {
    const isInitiator = String(pending.initiatedBy._id) === String(meId);
    const initiatorPaid = String(pending.initiatedBy._id) === String(pending.fromUserId._id);
    const counterpartyName = initiatorPaid ? pending.toUserId.name : pending.fromUserId.name;
    const methodLabel = pending.method === "online" ? "via online transfer" : "in cash";

    if (isInitiator) {
        return (
            <View style={styles.pendingBox}>
                <View style={styles.pendingWaitRow}>
                    <Clock size={12} color={colors.warning} />
                    <Text style={styles.pendingWaitText}>
                        Waiting for {counterpartyName} to confirm
                    </Text>
                </View>
                <PillButton
                    variant="secondary"
                    onPress={() => onCancel(pending._id)}
                    label="Cancel Request"
                    style={styles.confirmChoice}
                    textStyle={styles.confirmChoiceText}
                />
            </View>
        );
    }

    return (
        <View style={styles.pendingBox}>
            <Text style={styles.pendingAskText}>
                <Text style={styles.pendingAskBold}>{pending.initiatedBy.name}</Text> says{" "}
                {initiatorPaid ? "they paid you" : "they received"}{" "}
                <Text style={styles.pendingAskBold}>{money(pending.amount)}</Text>{" "}
                {methodLabel}. Confirm?
            </Text>
            {!!pending.note && (
                <Text style={styles.pendingNote}>&ldquo;{pending.note}&rdquo;</Text>
            )}
            <View style={styles.confirmActions}>
                <PillButton
                    variant="primary"
                    onPress={() => onConfirm(pending._id)}
                    label="Yes, Confirm"
                    style={styles.confirmChoice}
                    textStyle={styles.confirmChoiceText}
                />
                <PillButton
                    variant="secondary"
                    onPress={() => onReject(pending._id)}
                    label="Not Yet"
                    style={styles.confirmChoice}
                    textStyle={styles.confirmChoiceText}
                />
            </View>
        </View>
    );
}

const getStyles = (colors, t) => StyleSheet.create({
    headerCount: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    emptyContainer: {
        alignItems: "center",
        paddingVertical: 24,
    },
    emptyIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: t.surfaceAlt,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: "center",
    },
    balancesBlock: {
        paddingVertical: 6,
    },
    balanceAmount: {
        fontSize: 15,
        fontWeight: "700",
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
    suggestionsList: {
        gap: 0,
    },
    suggestionItem: {
        gap: 12,
    },
    suggestionText: {
        fontSize: 14,
        lineHeight: 21,
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
        alignSelf: "flex-start",
    },
    actionBtnText: {
        fontSize: 14,
        fontWeight: "700",
    },
    confirmBox: {
        ...surfaceStyle(t),
        backgroundColor: t.surfaceAlt,
        borderRadius: 18,
        padding: 14,
        gap: 12,
    },
    confirmQuestion: {
        fontSize: 13,
        color: colors.text,
        fontWeight: "500",
        lineHeight: 18,
    },
    confirmActions: {
        flexDirection: "row",
        gap: 10,
    },
    confirmChoice: {
        flex: 1,
        height: 46,
    },
    confirmChoiceText: {
        fontSize: 14,
    },
    methodRow: {
        flexDirection: "row",
        gap: 10,
    },
    methodBtn: {
        flex: 1,
        paddingVertical: 11,
        borderRadius: 999,
        alignItems: "center",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: t.outline,
        backgroundColor: t.surface,
    },
    methodBtnActive: {
        backgroundColor: t.ink,
        borderColor: t.ink,
    },
    methodBtnText: {
        fontSize: 13,
        fontWeight: "600",
        color: colors.textSecondary,
    },
    methodBtnTextActive: {
        color: t.onInk,
    },
    pendingBox: {
        ...surfaceStyle(t),
        backgroundColor: t.surfaceAlt,
        borderRadius: 18,
        padding: 14,
        gap: 12,
    },
    pendingWaitRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    pendingWaitText: {
        fontSize: 12,
        fontWeight: "500",
        color: colors.warning,
        flexShrink: 1,
    },
    pendingAskText: {
        fontSize: 13,
        color: colors.text,
        lineHeight: 19,
    },
    pendingAskBold: {
        fontWeight: "700",
    },
    pendingNote: {
        fontSize: 12,
        fontStyle: "italic",
        color: colors.textSecondary,
    },
    thirdPartyNote: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: "center",
        paddingVertical: 2,
    },

    // Payment bottom sheet
    sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    sheet: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 26, borderTopRightRadius: 26,
        paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30, gap: 14,
    },
    sheetHandle: {
        alignSelf: "center", width: 40, height: 4, borderRadius: 2,
        backgroundColor: colors.border, marginBottom: 6,
    },
    sheetHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
    sheetKicker: { fontSize: 10, fontWeight: "800", letterSpacing: 2, color: colors.primary },
    sheetTitle: { fontSize: 20, fontWeight: "800", color: colors.text, marginTop: 2, letterSpacing: -0.3 },
    sheetClose: {
        width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center",
        backgroundColor: t.surfaceAlt,
    },
    sheetPayee: { fontSize: 13.5, color: colors.textSecondary, marginTop: -6 },
    sheetSectionLabel: { fontSize: 12, fontWeight: "700", color: colors.text },
    sheetQrLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
    sheetQrWrap: { gap: 2 },
    sheetQrBox: {
        alignSelf: "center", backgroundColor: "#fff", borderRadius: 16, padding: 12,
        borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
    },
    sheetQrImg: { width: 200, height: 200, borderRadius: 8 },
    sheetGhostBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        marginTop: 10, paddingVertical: 11, borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
    },
    sheetGhostText: { fontSize: 13, fontWeight: "700", color: colors.text },
    sheetUpiWrap: { gap: 2 },
    sheetUpiRow: {
        flexDirection: "row", alignItems: "center", gap: 10,
        backgroundColor: t.surfaceAlt, borderRadius: 14, paddingLeft: 14, paddingRight: 6, paddingVertical: 6,
    },
    sheetUpiText: { flex: 1, fontSize: 14.5, fontWeight: "700", color: colors.text },
    sheetCopyBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: t.ink, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 9,
    },
    sheetCopyBtnDone: { backgroundColor: "rgba(22,163,74,0.14)" },
    sheetCopyText: { fontSize: 13, fontWeight: "800", color: t.onInk },
    sheetPrimaryBtn: { width: "100%" },
    sheetFootNote: { fontSize: 11, color: colors.textSecondary, textAlign: "center" },
});
