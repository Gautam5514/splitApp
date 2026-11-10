/**
 * One Autopilot reply in the conversation: questions with tap answers, the plan,
 * the approval bar, and what happened afterwards. All state comes from the run.
 */
import { PillButton, useDesign } from "@/components/ui/Design";
import { Text, TextInput } from "@/components/ui/Typography";
import { R } from "@/constants/design";
import { initials, isDeletePlan, isStalled, money, planCurrency, planTotal, STATUS_LABEL } from "@/lib/autopilot";
import { AlertTriangle, Check, Mail, PiggyBank, RotateCcw, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Loader } from "@/components/Loader";
import PlanSteps from "./PlanSteps";

export function Bubble({ children, mine, tone }) {
    const { colors, t } = useDesign();
    const s = getStyles(colors, t);
    return (
        <View style={[mine ? s.mine : s.theirs, tone === "error" && s.errorBubble]}>
            {typeof children === "string" ? <Text style={[s.bubbleText, mine && { color: t.onInk }, tone === "error" && { color: colors.error }]}>{children}</Text> : children}
        </View>
    );
}

function Chip({ label, onPress, disabled, s }) {
    return (
        <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.75} style={[s.chip, disabled && { opacity: 0.5 }]} accessibilityRole="button">
            <Text style={s.chipText}>{label}</Text>
        </TouchableOpacity>
    );
}

function Question({ q, busy, onPick, onEmail, s, colors }) {
    const [emailMode, setEmailMode] = useState(q.kind === "email");
    const [email, setEmail] = useState("");
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    return (
        <View style={{ gap: 8 }}>
            <Bubble>{q.text}</Bubble>
            {q.options.length > 0 && !emailMode && q.options.map((o, i) => (
                <TouchableOpacity key={o.value} onPress={() => onPick(q, o)} disabled={busy} activeOpacity={0.75} style={s.option} accessibilityRole="button" accessibilityLabel={o.label}>
                    {q.kind === "person" && <View style={[s.optionAvatar, { backgroundColor: ["#0891B2", "#8B5CF6", "#F59E0B", "#10B981"][i % 4] }]}><Text style={s.optionAvatarText}>{initials(o.label)}</Text></View>}
                    <View style={{ flex: 1 }}>
                        <Text style={s.optionLabel} numberOfLines={1}>{o.label}</Text>
                        {o.hint ? <Text style={s.optionHint} numberOfLines={1}>{o.hint}</Text> : null}
                    </View>
                </TouchableOpacity>
            ))}
            {q.kind === "person" && !emailMode && <TouchableOpacity onPress={() => setEmailMode(true)}><Text style={s.linkText}>None of these. Invite by email</Text></TouchableOpacity>}
            {emailMode && (
                <View style={s.emailRow}>
                    <Mail size={15} color={colors.textSecondary} />
                    <TextInput value={email} onChangeText={setEmail} placeholder={`${q.ref}'s email`} placeholderTextColor={colors.textSecondary} autoCapitalize="none" keyboardType="email-address" style={s.emailInput} accessibilityLabel={`Email for ${q.ref}`} />
                    <TouchableOpacity onPress={() => valid && onEmail(q, email.trim())} disabled={!valid || busy} style={[s.emailBtn, (!valid || busy) && { opacity: 0.4 }]}>
                        <Text style={s.emailBtnText}>Invite</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

export default function RunMessage({ run, nameOf, superseded, busy, onDecide, onAnswer, onResume, onCancel, onChip, onRetry, onEdit }) {
    const { colors, t } = useDesign();
    const s = getStyles(colors, t);
    const status = run.status;
    const stalled = isStalled(run);
    if (superseded) return <Text style={s.superseded}>Updated below</Text>;
    if (status === "planning") {
        return stalled ? (
            <View style={{ gap: 8 }}>
                <Bubble>This request stopped before a plan was ready. Nothing was changed.</Bubble>
                <View style={s.row}><Chip label="Try again" onPress={() => onRetry(run)} disabled={busy} s={s} /><Chip label="Dismiss" onPress={() => onCancel(run)} disabled={busy} s={s} /></View>
            </View>
        ) : <Bubble><View style={s.inline}><Loader size={14} color={colors.textSecondary} /><Text style={s.muted}>Working on it…</Text></View></Bubble>;
    }
    const plan = run.plan;
    const questions = plan?.questions || [];
    const asked = new Set(questions.map((q) => q.text));
    const plain = (plan?.clarifications || []).filter((c) => !asked.has(c));
    const del = isDeletePlan(run);
    const total = planTotal(run);
    return (
        <View style={{ gap: 10 }}>
            {run.ai?.degraded && OPEN(status) && (
                <View style={s.notice}><AlertTriangle size={14} color={colors.warning} /><Text style={s.noticeText}>The AI is busy, so I used basic mode. Short, simple sentences work best right now.</Text></View>
            )}
            {status === "clarification_required" && (
                <>
                    {plain.map((c, i) => <Bubble key={i}>{c}</Bubble>)}
                    {questions.map((q) => <Question key={q.id} q={q} busy={busy} onPick={onAnswer.pick} onEmail={onAnswer.email} s={s} colors={colors} />)}
                </>
            )}
            {plan?.steps?.length > 0 && (
                <>
                    <Text style={s.stage}>{STATUS_LABEL[status] || status}</Text>
                    <PlanSteps run={run} groupName={nameOf} running={status === "running"} busy={busy} onEdit={onEdit} />
                </>
            )}
            {plan?.notes?.map((n, i) => <View key={i} style={s.note}><Text style={s.noteText}>{n}</Text></View>)}
            {status === "waiting_approval" && (
                <View style={s.approve}>
                    <Text style={s.approveTitle}>{del ? "Confirm the delete" : "Ready for your approval"}</Text>
                    <Text style={s.approveSub}>{run.writesEnabled ? (del ? "Nothing is deleted until you tap the red button." : "Nothing has changed yet. Approve, edit the card, or tell me what to adjust.") : "Execution is switched off on the server."}</Text>
                    <View style={s.row}>
                        <PillButton
                            label={del ? "Delete permanently" : total ? `Approve ${money(total, planCurrency(run))}` : "Approve changes"}
                            icon={del ? <Trash2 size={16} color="#fff" /> : <Check size={16} color={t.onInk} />}
                            onPress={() => onDecide(run, "approve")}
                            disabled={busy || !run.writesEnabled}
                            loading={busy}
                            style={[{ flex: 1, height: 48 }, del && { backgroundColor: colors.error }]}
                            textStyle={del ? { color: "#fff" } : undefined}
                        />
                        <PillButton label="Not now" variant="secondary" onPress={() => onDecide(run, "reject")} disabled={busy} style={s.notNow} />
                    </View>
                </View>
            )}
            {status === "completed" && (
                <View style={{ gap: 8 }}>
                    <View style={s.inline}><Check size={16} color={colors.success} /><Text style={[s.doneText, { color: colors.success }]}>Done, and verified against your ledger.</Text></View>
                    <View style={s.row}>{["Who owes whom?", "My total balance", "Add an expense"].map((c) => <Chip key={c} label={c} onPress={() => onChip(c)} s={s} />)}</View>
                </View>
            )}
            {run.error ? <Bubble tone="error">{run.error}</Bubble> : null}
            {status === "running" && stalled && (
                <View style={{ gap: 8 }}>
                    <Bubble>This is taking longer than usual. Completed steps are saved; you can pick up where it stopped.</Bubble>
                    <View style={s.row}><Chip label="Resume" onPress={() => onResume(run)} disabled={busy} s={s} /><Chip label="Stop here" onPress={() => onCancel(run)} disabled={busy} s={s} /></View>
                </View>
            )}
            {run.notices?.map((n, i) => <View key={i} style={s.notice}><PiggyBank size={14} color={colors.warning} /><Text style={s.noticeText}>{n}</Text></View>)}
            {["failed", "partial_success"].includes(status) && (
                <View style={s.row}>
                    <TouchableOpacity onPress={() => onResume(run)} disabled={busy} style={s.chip}><View style={s.inline}><RotateCcw size={12} color={colors.text} /><Text style={s.chipText}>Resume</Text></View></TouchableOpacity>
                    {status === "failed" && !run.plan && <Chip label="Try again" onPress={() => onRetry(run)} disabled={busy} s={s} />}
                </View>
            )}
            {["rejected", "cancelled"].includes(status) && (
                <Text style={s.muted}>{STATUS_LABEL[status]}. {run.results?.length ? `${run.results.length} completed step${run.results.length === 1 ? " remains" : "s remain"} saved.` : "No changes were made."}</Text>
            )}
        </View>
    );
}
const OPEN = (status) => ["clarification_required", "waiting_approval"].includes(status);

const getStyles = (colors, t) => StyleSheet.create({
    mine: { alignSelf: "flex-end", maxWidth: "86%", backgroundColor: t.ink, borderRadius: 20, borderBottomRightRadius: 6, paddingHorizontal: 14, paddingVertical: 9 },
    theirs: { alignSelf: "flex-start", maxWidth: "100%" },
    errorBubble: { backgroundColor: colors.error + "14", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9 },
    bubbleText: { fontSize: 15, lineHeight: 22, color: colors.text },
    muted: { fontSize: 13, color: colors.textSecondary },
    superseded: { fontSize: 12, fontStyle: "italic", color: colors.textSecondary, paddingHorizontal: 4 },
    inline: { flexDirection: "row", alignItems: "center", gap: 6 },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
    chip: { borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: t.fillStrong },
    chipText: { fontSize: 13, fontWeight: "600", color: colors.text },
    option: { backgroundColor: t.fill, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: R.tile, paddingHorizontal: 12, paddingVertical: 10 },
    optionAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
    optionAvatarText: { color: "#fff", fontSize: 11.5, fontWeight: "700" },
    optionLabel: { fontSize: 14, fontWeight: "600", color: colors.text },
    optionHint: { fontSize: 12, color: colors.textSecondary },
    linkText: { fontSize: 13, color: colors.primary, fontWeight: "600", paddingHorizontal: 4 },
    emailRow: { backgroundColor: t.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: R.pill, paddingLeft: 14, paddingRight: 5, height: 48 },
    emailInput: { flex: 1, fontSize: 14.5, color: colors.text },
    emailBtn: { backgroundColor: t.ink, borderRadius: R.pill, paddingHorizontal: 16, paddingVertical: 9 },
    emailBtnText: { color: t.onInk, fontWeight: "700", fontSize: 13 },
    stage: { fontSize: 11.5, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: colors.textSecondary },
    note: { borderRadius: R.tile, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: t.fill },
    noteText: { fontSize: 13, lineHeight: 19, color: colors.text },
    notice: { flexDirection: "row", gap: 8, alignItems: "flex-start", borderRadius: R.tile, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.warning + "18" },
    noticeText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: colors.text },
    // Sits straight on the canvas under the plan: a title, one line, two buttons.
    approve: { gap: 3, marginTop: 2 },
    notNow: { height: 48, paddingHorizontal: 18, backgroundColor: t.fillStrong, borderWidth: 0, shadowOpacity: 0, elevation: 0 },
    approveTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
    approveSub: { fontSize: 12.5, lineHeight: 18, color: colors.textSecondary, marginBottom: 10 },
    doneText: { fontSize: 14, fontWeight: "600" },
});
