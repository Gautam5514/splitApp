/**
 * The plan Autopilot proposes, one card per step: what will change, for whom, and
 * (after approval) what was verified. Read-only answers (balances, expense lists)
 * render their results inline. Deletes are always shown on a red card.
 */
import { IconCircle, useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { R } from "@/constants/design";
import { money, initials, READ_STEPS, DELETE_STEPS } from "@/lib/autopilot";
import { router } from "expo-router";
import {
    AlertTriangle, ArrowRight, Bell, CheckCircle2, CircleDashed, Globe2, List, Mail, PiggyBank,
    Receipt, Scale, SquarePen, Trash2, UserCheck, UserPlus, Users, Wallet,
} from "lucide-react-native";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Loader } from "@/components/Loader";

const ICONS = { create_group: Users, add_members: UserPlus, set_group_budget: PiggyBank, create_expense: Receipt, monitor_budget: Bell, read_summary: Scale, read_overall: Globe2, list_expenses: List, delete_expense: Trash2, delete_group: Trash2 };
const PEOPLE_COLORS = ["#0891B2", "#8B5CF6", "#F59E0B", "#10B981", "#EC4899", "#3B82F6", "#EF4444", "#14B8A6"];
const SPLIT_LABEL = { equal: "split equally", exact: "exact shares", shares: "by the group's shares", percent: "by the group's percentages" };
const PERSON = {
    add: { Icon: UserCheck, label: "Joins right away" },
    invite: { Icon: UserPlus, label: "Gets an invite" },
    email: { Icon: Mail, label: "Email invite" },
};
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const shortDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

function Avatar({ name, index, size = 30 }) {
    return (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: PEOPLE_COLORS[index % PEOPLE_COLORS.length], alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: size * 0.38, fontWeight: "700" }}>{initials(name)}</Text>
        </View>
    );
}

function Splits({ splits, total, currency, s }) {
    return (
        <View style={s.inner}>
            <View style={s.bar}>
                {splits.map((x, i) => <View key={x.memberId} style={{ flex: Math.max(1, x.shareMinor), backgroundColor: PEOPLE_COLORS[i % PEOPLE_COLORS.length] }} />)}
            </View>
            {splits.map((x, i) => (
                <View key={x.memberId} style={s.row}>
                    <Avatar name={x.name} index={i} />
                    <Text style={s.rowName} numberOfLines={1}>{x.name}</Text>
                    <Text style={s.rowMeta}>{total ? Math.round((x.shareMinor / total) * 100) : 0}%</Text>
                    <Text style={s.rowAmount}>{money(x.shareMinor, currency)}</Text>
                </View>
            ))}
        </View>
    );
}

function Insights({ result, currency, s, colors }) {
    const ins = result.insights;
    const name = (id) => result.members?.find((m) => m.id === id)?.name || "Member";
    const balances = Object.entries(result.balances || {}).map(([id, v]) => ({ id, name: name(id), v: Math.round(Number(v) * 100) })).filter((b) => b.v !== 0).sort((a, b) => b.v - a.v);
    return (
        <View style={{ gap: 10, marginTop: 12 }}>
            {ins && (
                <View style={s.statRow}>
                    {[["Total spent", money(ins.totalMinor, currency)], ["Expenses", String(ins.expenseCount)], ["Average", money(ins.averageMinor, currency)]].map(([k, v]) => (
                        <View key={k} style={s.stat}><Text style={s.statLabel}>{k}</Text><Text style={s.statValue} numberOfLines={1}>{v}</Text></View>
                    ))}
                </View>
            )}
            {ins?.budget && <Text style={s.note}>{ins.budget.usedPct}% of the {money(ins.budget.budgetMinor, currency)} budget used</Text>}
            <View style={s.inner}>
                <Text style={s.innerTitle}>Net balances</Text>
                {balances.length === 0 ? (
                    <View style={s.inline}><CheckCircle2 size={16} color={colors.success} /><Text style={s.rowName}>Everyone is settled up.</Text></View>
                ) : balances.map((b, i) => (
                    <View key={b.id} style={s.row}>
                        <Avatar name={b.name} index={i} />
                        <Text style={s.rowName} numberOfLines={1}>{b.name}</Text>
                        <Text style={[s.rowAmount, { color: b.v > 0 ? colors.success : colors.error }]}>{b.v > 0 ? "gets back " : "owes "}{money(Math.abs(b.v), currency)}</Text>
                    </View>
                ))}
            </View>
            {result.settlements?.length > 0 && (
                <View style={s.inner}>
                    <Text style={s.innerTitle}>Simplest way to settle (suggestion only)</Text>
                    {result.settlements.map((x, i) => (
                        <View key={i} style={s.row}>
                            <Text style={s.rowStrong} numberOfLines={1}>{name(x.from)}</Text>
                            <ArrowRight size={14} color={colors.textSecondary} />
                            <Text style={[s.rowStrong, { flex: 1 }]} numberOfLines={1}>{name(x.to)}</Text>
                            <Text style={s.rowAmount}>{money(Math.round(x.amount * 100), currency)}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

function Overall({ overall, s, colors }) {
    const totals = Object.entries(overall.totals || {});
    return (
        <View style={{ gap: 10, marginTop: 12 }}>
            {totals.length === 0 && <Text style={s.note}>You aren&apos;t in any active groups yet.</Text>}
            {totals.map(([cur, t]) => (
                <View key={cur} style={s.statRow}>
                    <View style={s.stat}><Text style={s.statLabel}>You get back</Text><Text style={[s.statValue, { color: colors.success }]}>{money(t.owedMinor, cur)}</Text></View>
                    <View style={s.stat}><Text style={s.statLabel}>You owe</Text><Text style={[s.statValue, { color: colors.error }]}>{money(t.oweMinor, cur)}</Text></View>
                </View>
            ))}
            {overall.groups.length > 0 && (
                <View style={s.inner}>
                    {overall.groups.map((g) => (
                        <TouchableOpacity key={g.groupId} style={s.row} onPress={() => router.push(`/groups/${g.groupId}`)} activeOpacity={0.7}>
                            <Text style={s.rowName} numberOfLines={1}>{g.name}</Text>
                            <Text style={[s.rowAmount, { color: g.balanceMinor > 0 ? colors.success : colors.error }]}>{g.balanceMinor > 0 ? "gets back " : "owes "}{money(Math.abs(g.balanceMinor), g.currency)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
            {overall.settledCount > 0 && <Text style={s.note}>Settled up in {overall.settledCount} other group{overall.settledCount === 1 ? "" : "s"}.</Text>}
        </View>
    );
}

function ExpenseList({ expenses, currency, s }) {
    if (!expenses.length) return <Text style={[s.note, { marginTop: 10 }]}>No matching expenses yet.</Text>;
    return (
        <View style={[s.inner, { marginTop: 12 }]}>
            {expenses.map((e) => (
                <View key={e.id} style={s.row}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.rowName} numberOfLines={1}>{e.title}</Text>
                        <Text style={s.rowMeta}>{e.paidBy} · {cap(e.category)} · {shortDate(e.date)}</Text>
                    </View>
                    <Text style={s.rowAmount}>{money(e.amountMinor, currency)}</Text>
                </View>
            ))}
        </View>
    );
}

function DangerSummary({ step, result, s, colors }) {
    const p = step.payload, i = p.impact || {};
    if (result) {
        return <View style={[s.inline, { marginTop: 10 }]}><CheckCircle2 size={16} color={colors.success} /><Text style={s.note}>Deleted. {step.type === "delete_group" ? "The group is gone for everyone." : "Balances are updated for everyone."}</Text></View>;
    }
    return (
        <View style={s.danger}>
            <View style={s.inline}><AlertTriangle size={14} color={colors.error} /><Text style={[s.dangerTitle, { color: colors.error }]}>Permanent. This can&apos;t be undone.</Text></View>
            {step.type === "delete_group" ? (
                <View style={[s.statRow, { marginTop: 8 }]}>
                    {[["Members", String(i.members ?? 0)], ["Expenses", String(i.expenses ?? 0)], ["Total spent", money(i.totalMinor || 0, p.currency)]].map(([k, v]) => (
                        <View key={k} style={s.stat}><Text style={s.statLabel}>{k}</Text><Text style={s.statValue} numberOfLines={1}>{v}</Text></View>
                    ))}
                </View>
            ) : (
                <Text style={[s.note, { marginTop: 6 }]}>Removes this expense{i.date ? ` from ${shortDate(i.date)}` : ""} and recalculates what everyone owes. Members are told it was deleted.</Text>
            )}
        </View>
    );
}

export default function PlanSteps({ run, groupName, running, onEdit, busy }) {
    const { colors, t } = useDesign();
    const s = getStyles(colors, t);
    const steps = run.plan?.steps || [];
    const results = run.results || [];
    const firstPending = steps.findIndex((st) => !results.some((r) => r.stepId === st.id));
    return (
        <View style={{ gap: 10 }}>
            {steps.map((step, i) => {
                const p = step.payload || {};
                const result = results.find((r) => r.stepId === step.id);
                const Icon = ICONS[step.type] || Wallet;
                const state = result?.verified ? "verified" : running && i === firstPending ? "executing" : "proposed";
                const isRead = READ_STEPS.includes(step.type);
                const isDelete = DELETE_STEPS.includes(step.type);
                const tint = state === "verified" ? colors.success : isDelete ? colors.error : colors.primary;
                const canEdit = onEdit && run.status === "waiting_approval" && step.action !== undefined && step.type === "create_expense";
                return (
                    <View key={step.id} style={[s.card, isDelete && !result && { borderColor: colors.error + "66" }, state === "verified" && { borderColor: colors.success + "66" }]}>
                        <View style={s.cardHead}>
                            <IconCircle size={38} tint={tint + "1A"}><Icon size={17} color={tint} /></IconCircle>
                            <View style={{ flex: 1 }}>
                                <Text style={s.title}>{step.title}</Text>
                                {step.type !== "read_overall" && (
                                    <Text style={s.sub} numberOfLines={1}>{p.name && step.type !== "create_group" ? p.name : groupName(p.groupId)} · {p.currency}{step.type === "create_group" && p.groupType ? ` · ${cap(p.groupType)}` : ""}</Text>
                                )}
                            </View>
                            {/* "Proposed" is already said by the stage label above the plan */}
                            {(state !== "proposed" || isRead) && (
                                <View style={[s.status, state === "verified" && { backgroundColor: colors.success + "1F" }]}>
                                    {state === "executing" ? <Loader size={11} color={colors.primary} /> : state === "verified" ? <CheckCircle2 size={11} color={colors.success} /> : <CircleDashed size={11} color={colors.textSecondary} />}
                                    <Text style={[s.statusText, state === "verified" && { color: colors.success }]}>{state === "verified" ? "Verified" : state === "executing" ? "Working" : "Read-only"}</Text>
                                </View>
                            )}
                        </View>

                        {p.amountMinor !== undefined && step.type !== "monitor_budget" && <Text style={s.amount}>{money(p.amountMinor, p.currency)}</Text>}
                        {step.type === "create_expense" && p.splits && (
                            <>
                                <Text style={s.sub}>Paid by you · {p.splits.length} {p.splits.length > 1 ? "people" : "person"}, {SPLIT_LABEL[p.splitType] || "split"}{p.category ? ` · ${cap(p.category)}` : ""}</Text>
                                <Splits splits={p.splits} total={p.amountMinor} currency={p.currency} s={s} />
                                {canEdit && (
                                    <TouchableOpacity onPress={() => onEdit(step)} disabled={busy} style={s.editBtn} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="Edit amount or people">
                                        <SquarePen size={14} color={colors.text} />
                                        <Text style={s.editText}>Edit amount or people</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                        {step.type === "add_members" && p.people && (
                            <View style={s.inner}>
                                {p.people.map((x, k) => {
                                    const m = PERSON[x.status] || PERSON.invite;
                                    return (
                                        <View key={x.userId || x.email || k} style={s.row}>
                                            <Avatar name={x.name || x.email} index={k + 1} />
                                            <Text style={s.rowName} numberOfLines={1}>{x.name || x.email}</Text>
                                            <m.Icon size={13} color={colors.textSecondary} />
                                            <Text style={s.rowMeta}>{m.label}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                        {step.type === "monitor_budget" && (
                            <View style={[s.inline, { marginTop: 10, flexWrap: "wrap" }]}>
                                {(p.thresholds || []).map((x) => <View key={x} style={s.chip}><Text style={s.chipText}>{x}%</Text></View>)}
                                <Text style={[s.note, { width: "100%" }]}>In-app alerts when spending crosses these. You can turn them off any time.</Text>
                            </View>
                        )}
                        {isDelete && <DangerSummary step={step} result={result} s={s} colors={colors} />}
                        {step.type === "read_summary" && result && <Insights result={result} currency={p.currency} s={s} colors={colors} />}
                        {step.type === "read_overall" && result?.overall && <Overall overall={result.overall} s={s} colors={colors} />}
                        {step.type === "list_expenses" && result?.expenses && <ExpenseList expenses={result.expenses} currency={p.currency} s={s} />}
                        {isRead && !result && <Text style={[s.note, { marginTop: 8 }]}>Makes no changes.</Text>}
                        {result?.href && !isRead && step.type !== "delete_group" && result.href.startsWith("/groups/") && (
                            <TouchableOpacity onPress={() => router.push(result.href)} style={s.link} activeOpacity={0.7}>
                                <Text style={s.linkText}>Open group</Text><ArrowRight size={13} color={colors.primary} />
                            </TouchableOpacity>
                        )}
                    </View>
                );
            })}
        </View>
    );
}

const getStyles = (colors, t) => StyleSheet.create({
    // One borderless tinted fill per step; nothing inside it gets its own box.
    card: { backgroundColor: t.fill, borderWidth: 1, borderColor: "transparent", borderRadius: R.block, padding: 16 },
    cardHead: { flexDirection: "row", alignItems: "center", gap: 10 },
    title: { fontSize: 15, fontWeight: "600", color: colors.text, letterSpacing: -0.2 },
    sub: { fontSize: 12.5, color: colors.textSecondary, marginTop: 2 },
    status: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.pill, backgroundColor: t.outline },
    statusText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
    amount: { fontSize: 26, fontWeight: "700", color: colors.text, marginTop: 12, letterSpacing: -0.5 },
    inner: { marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.outline, gap: 4 },
    innerTitle: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 2 },
    bar: { flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 6 },
    row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5 },
    rowName: { flex: 1, fontSize: 14, color: colors.text },
    rowStrong: { fontSize: 14, fontWeight: "600", color: colors.text },
    rowMeta: { fontSize: 12, color: colors.textSecondary },
    rowAmount: { fontSize: 14, fontWeight: "600", color: colors.text },
    statRow: { flexDirection: "row", gap: 8 },
    stat: { flex: 1 },
    statLabel: { fontSize: 11.5, color: colors.textSecondary },
    statValue: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: 2, letterSpacing: -0.2 },
    note: { fontSize: 12.5, lineHeight: 18, color: colors.textSecondary },
    inline: { flexDirection: "row", alignItems: "center", gap: 6 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: R.pill, backgroundColor: t.outline },
    chipText: { fontSize: 13, fontWeight: "700", color: colors.text },
    danger: { marginTop: 10, borderRadius: R.tile, padding: 10, backgroundColor: colors.error + "12" },
    dangerTitle: { fontSize: 12.5, fontWeight: "700" },
    editBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 12, paddingHorizontal: 13, paddingVertical: 8, borderRadius: R.pill, backgroundColor: t.outline },
    editText: { fontSize: 12.5, fontWeight: "600", color: colors.text },
    link: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 12 },
    linkText: { fontSize: 13, fontWeight: "600", color: colors.primary },
});
