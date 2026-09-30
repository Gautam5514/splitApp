import { Block, IconCircle, PillButton, PillInput, ScreenHeader, SectionLabel, useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { SCREEN_GUTTER } from "@/constants/layout";
import { useBottomSpacing } from "@/hooks/useSafeSpacing";
import { Alert } from "@/lib/alert";
import { api } from "@/lib/api";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import {
    Check,
    Copy,
    Download,
    IndianRupee,
    Minus,
    Plus,
    QrCode,
    Split as SplitIcon,
    Users,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
    Image,
    KeyboardAvoidingView,
    Linking,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const money = (v, cur = "INR") => `${cur === "INR" ? "₹" : cur + " "}${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

export default function QuickSplitScreen() {
    const { colors, isDark, t } = useDesign();
    const bottomSpacing = useBottomSpacing(28);
    const styles = getStyles(colors, isDark, t);
    const params = useLocalSearchParams();

    // If opened with ?id=, we're reopening a saved split in pay/result mode.
    const openId = params?.id;

    const [phase, setPhase] = useState("create"); // "create" | "result"
    const [amount, setAmount] = useState("");
    const [people, setPeople] = useState(2); // headcount for the equal split
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null); // the created/loaded split
    const [copied, setCopied] = useState(false);

    // Reopen a saved split.
    useEffect(() => {
        if (!openId) return;
        (async () => {
            try {
                const res = await api.get(`/quick-splits/${openId}`);
                setResult(res.data);
                setPhase("result");
            } catch (e) {
                Alert.alert("Couldn't open", e?.response?.data?.message || "That quick split couldn't be loaded.");
                router.back();
            }
        })();
    }, [openId]);

    const total = round2(amount);
    const perPerson = useMemo(() => (people > 0 ? round2(total / people) : 0), [total, people]);

    const incPeople = () => setPeople((n) => Math.min(n + 1, 50));
    const decPeople = () => setPeople((n) => Math.max(n - 1, 1));

    const handleSplit = async () => {
        if (!(total >= 0.01)) { Alert.alert("Check the details", "Enter a valid total amount."); return; }
        if (people < 1) { Alert.alert("Check the details", "Add at least one person."); return; }
        setSubmitting(true);
        try {
            const res = await api.post("/quick-splits", {
                totalAmount: total,
                splitType: "equal",
                peopleCount: people,
            });
            setResult(res.data);
            setPhase("result");
        } catch (e) {
            Alert.alert("Couldn't split", e?.response?.data?.message || "Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const togglePaid = async (participant) => {
        try {
            const res = await api.patch(
                `/quick-splits/${result.id}/participants/${participant.id}`,
                { paid: !participant.paid }
            );
            setResult((prev) => ({ ...prev, ...res.data, payee: prev.payee }));
        } catch (e) {
            Alert.alert("Couldn't update", e?.response?.data?.message || "Please try again.");
        }
    };

    const copyUpi = async () => {
        if (!result?.payee?.upiId) return;
        try {
            await Clipboard.setStringAsync(result.payee.upiId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            Alert.alert("Couldn't copy", "Please copy the UPI ID manually.");
        }
    };

    const openQr = async () => {
        const url = result?.payee?.upiQrUrl;
        if (!url) return;
        try { await WebBrowser.openBrowserAsync(url); }
        catch { Linking.openURL(url).catch(() => {}); }
    };

    // ── CREATE PHASE ─────────────────────────────────────────────────────────
    const renderCreate = () => (
        <ScrollView
            contentContainerStyle={{ paddingBottom: bottomSpacing }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
            <View style={styles.introBox}>
                <IconCircle size={56} tint={colors.primaryLight}>
                    <SplitIcon size={26} color={colors.primary} />
                </IconCircle>
                <Text style={styles.introTitle}>Split a bill in seconds</Text>
                <Text style={styles.introText}>
                    Enter the total, pick how many people — everyone pays you back by UPI.
                </Text>
            </View>

            {/* Amount */}
            <SectionLabel>Total amount</SectionLabel>
            <View style={styles.group}>
                <PillInput
                    value={amount}
                    onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ""))}
                    placeholder="0"
                    keyboardType="decimal-pad"
                    icon={<IndianRupee size={19} color={colors.textSecondary} />}
                    inputStyle={styles.amountInput}
                />
            </View>

            {/* People counter */}
            <SectionLabel>How many people?</SectionLabel>
            <Block style={styles.counterBlock}>
                <TouchableOpacity
                    onPress={decPeople}
                    disabled={people <= 1}
                    style={[styles.stepBtn, people <= 1 && styles.stepBtnDisabled]}
                    activeOpacity={0.8}
                    hitSlop={8}
                >
                    <Minus size={26} color={people <= 1 ? colors.textSecondary : t.onInk} strokeWidth={2.6} />
                </TouchableOpacity>

                <View style={styles.counterMiddle}>
                    <Text style={styles.counterValue}>{people}</Text>
                    <Text style={styles.counterLabel}>{people === 1 ? "person" : "people"}</Text>
                </View>

                <TouchableOpacity
                    onPress={incPeople}
                    disabled={people >= 50}
                    style={[styles.stepBtn, people >= 50 && styles.stepBtnDisabled]}
                    activeOpacity={0.8}
                    hitSlop={8}
                >
                    <Plus size={26} color={people >= 50 ? colors.textSecondary : t.onInk} strokeWidth={2.6} />
                </TouchableOpacity>
            </Block>

            {/* Live per-person preview */}
            <View style={styles.previewCard}>
                <Text style={styles.previewLabel}>Each person pays</Text>
                <Text style={styles.previewValue}>{money(perPerson)}</Text>
                <Text style={styles.previewSub}>{money(total)} ÷ {people}</Text>
            </View>

            <View style={styles.splitCtaWrap}>
                <PillButton
                    variant="primary"
                    onPress={handleSplit}
                    loading={submitting}
                    disabled={submitting || !(total >= 0.01)}
                    label="Split & show QR"
                    icon={<SplitIcon size={16} color={t.onInk} />}
                />
            </View>
        </ScrollView>
    );

    // ── RESULT / PAY PHASE ─────────────────────────────────────────────────────
    const renderResult = () => {
        if (!result) return null;
        const cur = result.currency || "INR";
        const hasUpi = !!result.payee?.upiId;
        const hasQr = !!result.payee?.upiQrUrl;
        const perShare = result.participants[0]?.share || 0;

        return (
            <ScrollView
                contentContainerStyle={{ paddingBottom: bottomSpacing }}
                showsVerticalScrollIndicator={false}
            >
                {/* Summary header */}
                <Block style={styles.summaryCard}>
                    <Text style={styles.summaryTitle} numberOfLines={2}>{result.title}</Text>
                    <Text style={styles.summaryTotal}>{money(result.totalAmount, cur)}</Text>
                    <View style={styles.summaryMetaRow}>
                        <View style={styles.summaryChip}>
                            <Users size={12} color={colors.textSecondary} />
                            <Text style={styles.summaryChipText}>{result.participants.length} people</Text>
                        </View>
                        <View style={[styles.summaryChip, styles.summaryChipAccent]}>
                            <Text style={styles.summaryChipAccentText}>{money(perShare, cur)} each</Text>
                        </View>
                    </View>
                </Block>

                {/* Pay-to (creator UPI) */}
                {(hasUpi || hasQr) ? (
                    <>
                        <SectionLabel>Everyone pays you here</SectionLabel>
                        <Block style={styles.payBlock}>
                            {hasQr ? (
                                <View style={styles.qrBox}>
                                    <Image source={{ uri: result.payee.upiQrUrl }} style={styles.qrImg} resizeMode="contain" />
                                </View>
                            ) : null}
                            {hasQr ? (
                                <TouchableOpacity style={styles.ghostBtn} onPress={openQr} activeOpacity={0.85}>
                                    <Download size={15} color={colors.text} />
                                    <Text style={styles.ghostBtnText}>Open / save QR</Text>
                                </TouchableOpacity>
                            ) : null}
                            {hasUpi ? (
                                <View style={styles.upiRow}>
                                    <QrCode size={15} color={colors.primary} />
                                    <Text style={styles.upiText} numberOfLines={1}>{result.payee.upiId}</Text>
                                    <TouchableOpacity
                                        style={[styles.copyBtn, copied && styles.copyBtnDone]}
                                        onPress={copyUpi}
                                        activeOpacity={0.85}
                                    >
                                        {copied ? <Check size={13} color={colors.success} /> : <Copy size={13} color={t.onInk} />}
                                        <Text style={[styles.copyText, copied && { color: colors.success }]}>{copied ? "Copied" : "Copy"}</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : null}
                            <Text style={styles.payHint}>
                                Share this screen, or let each person scan the QR / use their share below.
                            </Text>
                        </Block>
                    </>
                ) : (
                    <Block style={styles.noUpiCard}>
                        <Text style={styles.noUpiText}>
                            Add your UPI ID & QR in your profile so friends can pay you in one tap.
                        </Text>
                        <PillButton
                            variant="secondary"
                            label="Add UPI to profile"
                            onPress={() => router.push("/profile-edit")}
                            style={{ marginTop: 12 }}
                        />
                    </Block>
                )}

                {/* Per-person shares + mark paid */}
                <SectionLabel>Track who paid you back</SectionLabel>
                <Block padded={false} style={styles.peopleBlock}>
                    {result.participants.map((p, i) => (
                        <TouchableOpacity
                            key={p.id}
                            style={[styles.payerRow, i > 0 && styles.personRowDivider]}
                            onPress={() => togglePaid(p)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.checkbox, p.paid && styles.checkboxOn]}>
                                {p.paid ? <Check size={14} color={t.onInk} /> : null}
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={[styles.payerName, p.paid && styles.payerNamePaid]} numberOfLines={1}>{p.name}</Text>
                                <Text style={styles.payerShare}>{money(p.share, cur)}</Text>
                            </View>
                            {p.paid ? <Text style={styles.markTextPaid}>Paid</Text> : null}
                        </TouchableOpacity>
                    ))}
                </Block>
                <Text style={styles.trackHint}>
                    Tap a name once they&apos;ve paid you — just so you remember who&apos;s left.
                </Text>

                <View style={styles.splitCtaWrap}>
                    <PillButton
                        variant="secondary"
                        label="Done"
                        onPress={() => router.back()}
                    />
                </View>
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <ScreenHeader
                back
                onBack={() => router.back()}
                title="Quick Split"
                subtitle={phase === "create" ? "Fast one-off bill split" : result?.title}
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ flex: 1 }}
            >
                <View style={styles.body}>
                    {phase === "create" ? renderCreate() : renderResult()}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const getStyles = (colors, isDark, t) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    body: { flex: 1 },

    introBox: { alignItems: "center", paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: 16, gap: 6 },
    introTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginTop: 8, letterSpacing: -0.3 },
    introText: { fontSize: 13, color: colors.textSecondary, textAlign: "center", lineHeight: 19, maxWidth: 300 },

    group: { paddingHorizontal: SCREEN_GUTTER, marginBottom: 20 },
    amountInput: { fontSize: 22, fontWeight: "800" },

    // People +/- counter
    counterBlock: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingVertical: 18, paddingHorizontal: 22,
    },
    stepBtn: {
        width: 60, height: 60, borderRadius: 30,
        alignItems: "center", justifyContent: "center", backgroundColor: t.ink,
    },
    stepBtnDisabled: { backgroundColor: t.surfaceAlt },
    counterMiddle: { alignItems: "center", flex: 1 },
    counterValue: { fontSize: 48, fontWeight: "900", color: colors.text, letterSpacing: -2, lineHeight: 54 },
    counterLabel: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginTop: -2 },

    previewCard: {
        alignItems: "center", marginHorizontal: SCREEN_GUTTER, marginTop: 16,
        paddingVertical: 20, borderRadius: 20, backgroundColor: colors.primaryLight, gap: 2,
    },
    previewLabel: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 1 },
    previewValue: { fontSize: 32, fontWeight: "900", color: colors.primary, letterSpacing: -1 },
    previewSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

    splitCtaWrap: { paddingHorizontal: SCREEN_GUTTER, marginTop: 24 },

    peopleBlock: { paddingVertical: 4 },
    personRowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },

    // Result
    summaryCard: { alignItems: "center", gap: 6, marginTop: 4 },
    summaryTitle: { fontSize: 16, fontWeight: "700", color: colors.text, textAlign: "center" },
    summaryTotal: { fontSize: 34, fontWeight: "900", color: colors.text, letterSpacing: -1 },
    summaryMetaRow: { flexDirection: "row", gap: 8, marginTop: 2 },
    summaryChip: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: t.surfaceAlt,
    },
    summaryChipText: { fontSize: 11.5, fontWeight: "600", color: colors.textSecondary },
    summaryChipAccent: { backgroundColor: colors.primaryLight },
    summaryChipAccentText: { fontSize: 11.5, fontWeight: "800", color: colors.primary },

    payBlock: { alignItems: "center", gap: 12 },
    qrBox: {
        backgroundColor: "#fff", borderRadius: 18, padding: 14,
        borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
    },
    qrImg: { width: 210, height: 210, borderRadius: 8 },
    ghostBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        alignSelf: "stretch", paddingVertical: 11, borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
    },
    ghostBtnText: { fontSize: 13, fontWeight: "700", color: colors.text },
    upiRow: {
        flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "stretch",
        backgroundColor: t.surfaceAlt, borderRadius: 14, paddingLeft: 14, paddingRight: 6, paddingVertical: 6,
    },
    upiText: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.text },
    copyBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: t.ink, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 9 },
    copyBtnDone: { backgroundColor: colors.successLight },
    copyText: { fontSize: 13, fontWeight: "800", color: t.onInk },
    payHint: { fontSize: 11.5, color: colors.textSecondary, textAlign: "center", lineHeight: 16 },

    noUpiCard: { alignItems: "center" },
    noUpiText: { fontSize: 13.5, color: colors.textSecondary, textAlign: "center", lineHeight: 20 },

    payerRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
    checkbox: {
        width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.border,
        alignItems: "center", justifyContent: "center",
    },
    checkboxOn: { backgroundColor: colors.success, borderColor: colors.success },
    payerName: { fontSize: 14.5, fontWeight: "700", color: colors.text },
    payerNamePaid: { textDecorationLine: "line-through", color: colors.textSecondary },
    payerShare: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    markTextPaid: { color: colors.success, fontSize: 12.5, fontWeight: "700" },
    trackHint: { fontSize: 11.5, color: colors.textSecondary, textAlign: "center", marginTop: 10, paddingHorizontal: SCREEN_GUTTER, lineHeight: 16 },
});
