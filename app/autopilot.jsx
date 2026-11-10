/**
 * Autopilot: tell it what you need ("Dinner 3600 paid by me, split equally"),
 * review the plan it prepares, approve, and it does the work, verified against the
 * ledger. Same /agent API and rules as the web widget; nothing changes before you approve.
 *
 * Params: groupId (work inside that group), prompt (an editable draft, e.g. from a tip).
 */
import { RoundButton, useDesign } from "@/components/ui/Design";
import { Text, TextInput } from "@/components/ui/Typography";
import { R } from "@/constants/design";
import { SCREEN_GUTTER } from "@/constants/layout";
import useKeyboard from "@/hooks/useKeyboard";
import { api } from "@/lib/api";
import {
    approvedStepIds, errText, fillTemplate, OPEN_STATES, runPayload, TEMPLATES, typedDecision,
} from "@/lib/autopilot";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
    ArrowLeft, ArrowLeftRight, ArrowUp, ArrowUpLeft, Bell, ChevronDown, Gauge, Globe2, Layers, List, PiggyBank,
    Plane, Receipt, Scale, ShieldCheck, Sparkles, SquarePen, UserMinus, UserPlus,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Loader } from "@/components/Loader";
import GroupTypeIcon from "@/components/group/GroupTypeIcon";
import EditExpenseSheet from "@/components/autopilot/EditExpenseSheet";
import GroupPickerSheet from "@/components/autopilot/GroupPickerSheet";
import RunMessage, { Bubble } from "@/components/autopilot/RunMessage";
import Autopilot3DIcon from "@/components/icons/Autopilot3DIcon";

const STORE = "autopilot.thread.v1";
const TEMPLATE_ICON = {
    bill: Receipt, skip: UserMinus, exact: Scale, owe: ArrowLeftRight, total: Globe2, recent: List,
    trip: Plane, people: UserPlus, budget: PiggyBank, alert: Bell, check: Gauge,
};

export default function AutopilotScreen() {
    const params = useLocalSearchParams();
    const { colors, t, isDark } = useDesign();
    const s = useMemo(() => getStyles(colors, t), [colors, t]);
    const insets = useSafeAreaInsets();
    const keyboard = useKeyboard();
    const scroller = useRef(null);
    const inputRef = useRef(null);
    const [tab, setTab] = useState(TEMPLATES[0].key);

    const [caps, setCaps] = useState(null);
    const [connection, setConnection] = useState("loading"); // loading | ready | error | disabled
    const [attempt, setAttempt] = useState(0);
    const [groups, setGroups] = useState([]);
    const [ctxId, setCtxId] = useState(typeof params.groupId === "string" ? params.groupId : "");
    const [thread, setThread] = useState([]);
    const [runs, setRuns] = useState({});
    const [input, setInput] = useState(typeof params.prompt === "string" ? params.prompt.slice(0, 500) : "");
    const [busy, setBusy] = useState(false);
    const [picker, setPicker] = useState(false);
    const [editing, setEditing] = useState(null); // { run, step }
    const restored = useRef(false);
    const handled = useRef(new Set());
    const nextId = useRef(1);

    // A new tip or deep link while the screen is open replaces the draft.
    useEffect(() => { if (typeof params.prompt === "string") setInput(params.prompt.slice(0, 500)); }, [params.prompt]);
    useEffect(() => { if (typeof params.groupId === "string") setCtxId(params.groupId); }, [params.groupId]);

    const loadGroups = useCallback(async () => { const { data } = await api.get("/agent/groups"); setGroups(Array.isArray(data) ? data : []); return data; }, []);

    // Connect, then restore the last conversation from the server (the device only keeps run ids).
    useEffect(() => {
        let live = true;
        (async () => {
            setConnection("loading");
            try {
                const [c] = await Promise.all([api.get("/agent/capabilities").then((r) => r.data), loadGroups()]);
                if (!live) return;
                setCaps(c);
                if (!restored.current) {
                    restored.current = true;
                    let saved = null;
                    try { saved = JSON.parse((await AsyncStorage.getItem(STORE)) || "null"); } catch { /* a bad entry must not block a new chat */ }
                    if (Array.isArray(saved?.thread) && saved.thread.length) {
                        const ids = [...new Set(saved.thread.filter((x) => x.runId).map((x) => x.runId))];
                        const fetched = await Promise.all(ids.map((id) => api.get(`/agent/runs/${id}`).then((r) => r.data).catch(() => null)));
                        const map = Object.fromEntries(fetched.filter(Boolean).map((r) => [r._id, r]));
                        for (const r of Object.values(map)) if (r.status === "completed") handled.current.add(r._id);
                        if (!live) return;
                        setRuns(map);
                        setThread(saved.thread.filter((x) => !x.runId || map[x.runId]));
                        nextId.current = Math.max(0, ...saved.thread.map((x) => Number(x.id) || 0)) + 1;
                    }
                }
                setConnection("ready");
            } catch (err) {
                if (live) setConnection(err?.response?.data?.code === "AUTOPILOT_DISABLED" ? "disabled" : "error");
            }
        })();
        return () => { live = false; };
    }, [attempt, loadGroups]);

    useEffect(() => {
        if (connection !== "ready") return;
        AsyncStorage.setItem(STORE, JSON.stringify({ thread: thread.slice(-30) })).catch(() => {});
    }, [thread, connection]);

    useEffect(() => { requestAnimationFrame(() => scroller.current?.scrollToEnd({ animated: true })); }, [thread, runs, busy]);

    // Poll runs still in flight, backing off from 1.5s to 6s; stalled runs stop polling.
    const runningIds = Object.values(runs).filter((r) => ["running", "planning"].includes(r.status) && !r.stale).map((r) => r._id).join(",");
    useEffect(() => {
        if (!runningIds) return;
        let delay = 1500, timer, live = true;
        const tick = async () => {
            await Promise.all(runningIds.split(",").map((id) => api.get(`/agent/runs/${id}`, { timeout: 15000 }).then(({ data }) => live && setRuns((r) => ({ ...r, [id]: { ...data, notices: r[id]?.notices } }))).catch(() => {})));
            delay = Math.min(delay * 1.4, 6000);
            if (live) timer = setTimeout(tick, delay);
        };
        timer = setTimeout(tick, delay);
        return () => { live = false; clearTimeout(timer); };
    }, [runningIds]);

    // After a run finishes: follow a new group, drop a deleted one, surface crossed budget alerts.
    useEffect(() => {
        for (const run of Object.values(runs)) {
            if (run.status !== "completed" || handled.current.has(run._id)) continue;
            handled.current.add(run._id);
            const created = run.results?.find((r) => r.stepId === run.plan?.steps?.find((st) => st.type === "create_group")?.id);
            if (created?.groupId) loadGroups().then(() => setCtxId(created.groupId)).catch(() => {});
            const gone = run.results?.find((r) => r.deletedGroup);
            if (gone) { loadGroups().catch(() => {}); setCtxId((id) => (id === gone.recordId ? "" : id)); }
            if (run.groupId && run.plan?.steps?.some((st) => ["create_expense", "monitor_budget", "set_group_budget"].includes(st.type))) {
                const since = new Date(run.createdAt).getTime() - 1000;
                api.post("/agent/monitors/check").then(() => api.get("/agent/monitors", { timeout: 15000 })).then(({ data }) => {
                    const fresh = (data.notices || []).filter((n) => String(n.groupId) === String(run.groupId) && new Date(n.createdAt).getTime() >= since).map((n) => n.message);
                    if (fresh.length) setRuns((r) => ({ ...r, [run._id]: { ...r[run._id], notices: fresh.slice(0, 3) } }));
                }).catch(() => {});
            }
        }
    }, [runs, loadGroups]);

    const openRun = [...thread].reverse().map((x) => x.runId && runs[x.runId]).find((r) => r && OPEN_STATES.includes(r.status));
    const superseded = useMemo(() => new Set(Object.values(runs).filter((r) => r.status === "cancelled" && r.events?.some((e) => e.type === "run.superseded")).map((r) => r._id)), [runs]);
    const push = (item) => setThread((x) => [...x, { id: nextId.current++, ...item }]);
    const ready = connection === "ready" && !!caps;
    const features = caps?.features || [];

    const send = async (text, opts = {}) => {
        const display = String(text || "").trim();
        if (!display || busy || !ready) return;
        if (display.length < 3 && !opts.reuse) return;
        const payload = runPayload(display, {
            groupId: opts.groupId !== undefined ? opts.groupId : ctxId || null,
            parentRunId: opts.parentRunId !== undefined ? opts.parentRunId : openRun?._id || null,
            answers: opts.answers, reuse: opts.reuse, edits: opts.edits, requestKey: opts.requestKey,
        });
        if (!opts.silent) push({ role: "user", text: display });
        setBusy(true); setInput("");
        try {
            const { data } = await api.post("/agent/runs", payload, { timeout: 90000 });
            setRuns((r) => ({ ...r, [data._id]: data }));
            if (data.groupId && String(data.groupId) !== String(payload.groupId)) setCtxId(String(data.groupId));
            push({ role: "agent", runId: data._id });
            // Only when the server really continued that plan (a new, separate request leaves it open).
            if (payload.parentRunId && String(data.parentRunId || "") === String(payload.parentRunId)) setRuns((r) => (r[payload.parentRunId] ? { ...r, [payload.parentRunId]: { ...r[payload.parentRunId], status: "cancelled", events: [...(r[payload.parentRunId].events || []), { type: "run.superseded" }] } } : r));
        } catch (err) {
            const disabled = err?.response?.data?.code === "AUTOPILOT_DISABLED";
            if (disabled) setConnection("disabled");
            push({ role: "agent", text: errText(err), error: true, retry: disabled ? undefined : { ...payload, display } });
        } finally { setBusy(false); }
    };

    const decide = async (run, decision) => {
        setBusy(true);
        if (decision === "approve") setRuns((r) => ({ ...r, [run._id]: { ...run, status: "running" } }));
        try {
            const { data } = await api.post(`/agent/runs/${run._id}/decision`, { decision, planVersion: run.planVersion, payloadHash: run.payloadHash, approvedStepIds: decision === "approve" ? approvedStepIds(run) : [] }, { timeout: 90000 });
            setRuns((r) => ({ ...r, [run._id]: data }));
        } catch (err) {
            // The server is the source of truth: reload to show exactly what committed.
            try { const { data } = await api.get(`/agent/runs/${run._id}`); setRuns((r) => ({ ...r, [run._id]: data })); } catch { /* polling retries */ }
            push({ role: "agent", text: errText(err), error: true });
        } finally { setBusy(false); }
    };
    const act = (path) => async (run) => {
        setBusy(true);
        try { const { data } = await api.post(`/agent/runs/${run._id}/${path}`, undefined, { timeout: 90000 }); setRuns((r) => ({ ...r, [run._id]: data })); }
        catch (err) { push({ role: "agent", text: errText(err), error: true }); }
        finally { setBusy(false); }
    };
    const resume = act("resume");
    const cancel = act("cancel");

    const answer = {
        pick: (q, o) => (q.kind === "group"
            ? (setCtxId(o.value), send(o.label, { groupId: o.value, reuse: true }))
            : q.kind === "expense"
                ? send(o.label, { reuse: true, edits: [{ action: Number(q.id.split(":")[1]), expenseId: o.value }] })
                : send(o.label, { answers: [{ ref: q.ref, userId: o.value }], reuse: true })),
        email: (q, email) => send(email, { answers: [{ ref: q.ref, email }], reuse: true }),
    };

    const saveEdit = (changes) => {
        const { run, step } = editing;
        setEditing(null);
        const p = step.payload;
        const bits = [changes.title && `"${changes.title}"`, changes.amount && `${p.currency} ${changes.amount}`, changes.excluded && `split between ${(p.roster || []).filter((r) => !changes.excluded.includes(r.memberId)).map((r) => r.name).join(", ")}`].filter(Boolean);
        send(`Change ${p.name}: ${bits.join(", ")}`, { parentRunId: run._id, groupId: run.groupId ? String(run.groupId) : null, reuse: true, edits: [{ action: step.action, ...changes }] });
    };

    const submit = () => {
        const text = input.trim();
        if (!text) return;
        const emailQ = openRun?.plan?.questions?.find((q) => q.kind === "email");
        const email = emailQ && text.match(/[^\s<>,;]+@[^\s<>,;]+\.[^\s<>,;]+/)?.[0];
        if (email) return send(text, { answers: [{ ref: emailQ.ref, email }], reuse: true });
        // "yes"/"haan" on a waiting plan is the Approve button, except for deletes and large amounts.
        const typed = !busy && typedDecision(openRun, text);
        if (typed) {
            push({ role: "user", text }); setInput("");
            if (typed.blocked) return push({ role: "agent", text: typed.blocked });
            return decide(openRun, typed.decision);
        }
        send(text);
    };

    // A starter fills the box as an editable draft; nothing is sent until the user says so.
    const pickStarter = (text) => { setInput(text); inputRef.current?.focus?.(); };
    const reset = () => { setThread([]); setRuns({}); setInput(""); AsyncStorage.removeItem(STORE).catch(() => {}); };
    const ctxGroup = groups.find((g) => g._id === ctxId);
    const nameOf = (runId) => (id) => groups.find((g) => g._id === id)?.name || runs[runId]?.plan?.steps?.find((st) => st.type === "create_group")?.payload.name || "Group";
    const placeholder = openRun?.status === "clarification_required" ? "Reply to Autopilot…" : openRun?.status === "waiting_approval" ? "Approve above, or say what to change…" : "Tell Autopilot what to do…";
    const canSend = ready && !busy && (input.trim().length >= 3 || !!typedDecision(openRun, input));
    const restPad = useRef(new Animated.Value(Math.max(insets.bottom, 10))).current;
    useEffect(() => { restPad.setValue(keyboard.visible ? 8 : Math.max(insets.bottom, 10)); }, [keyboard.visible, insets.bottom, restPad]);
    const bottomPad = useMemo(() => Animated.add(keyboard.anim, restPad), [keyboard.anim, restPad]);

    return (
        <SafeAreaView style={s.screen} edges={["top"]}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <View style={s.header}>
                <RoundButton flat onPress={() => router.back()} label="Back" size={42}><ArrowLeft size={20} color={colors.text} strokeWidth={2.4} /></RoundButton>
                <View style={s.titleBox}>
                    <View style={s.titleRow}><Autopilot3DIcon size={24} /><Text style={s.title}>Autopilot</Text></View>
                    <Text style={s.subtitle} numberOfLines={1}>{connection === "ready" ? (caps?.ai?.mode === "local" ? "Basic mode · you're in control" : "Plan together. You're in control.") : connection === "error" ? "Connection needs a retry" : connection === "disabled" ? "Switched off on this server" : "Connecting securely…"}</Text>
                </View>
                {thread.length > 0 && <RoundButton flat onPress={reset} label="New chat" size={42} disabled={busy}><SquarePen size={18} color={colors.text} /></RoundButton>}
            </View>

            <ScrollView ref={scroller} style={{ flex: 1 }} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {thread.length === 0 && (
                    <View style={s.welcome}>
                        <Text style={s.hero}>Money stuff,{"\n"}<Text style={{ color: colors.textSecondary }}>a little easier.</Text></Text>
                        <Text style={s.lead}>Pick a starter and edit it, or type your own in English or Hinglish.</Text>

                        {/* Starters: a category row, then the real prompts for that category */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabs} contentContainerStyle={s.tabsContent} keyboardShouldPersistTaps="handled">
                            {TEMPLATES.map((c) => {
                                const on = c.key === tab;
                                return (
                                    <TouchableOpacity key={c.key} onPress={() => setTab(c.key)} activeOpacity={0.8} style={[s.tab, on && s.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                                        <Text style={[s.tabText, on && s.tabTextOn]}>{c.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                        <View>
                            {(TEMPLATES.find((c) => c.key === tab) || TEMPLATES[0]).items.map((e, i) => {
                                const Icon = TEMPLATE_ICON[e.key] || Sparkles;
                                const text = fillTemplate(e.text, ctxGroup?.name);
                                return (
                                    <TouchableOpacity key={e.key} onPress={() => pickStarter(text)} style={[s.starter, i > 0 && s.starterDivider]} activeOpacity={0.7} disabled={busy} accessibilityRole="button" accessibilityLabel={e.label}>
                                        <View style={s.starterIcon}><Icon size={17} color={colors.text} /></View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.starterTitle}>{e.label}</Text>
                                            <Text style={s.starterText} numberOfLines={2}>{text}</Text>
                                        </View>
                                        <ArrowUpLeft size={16} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <View style={s.trust}><ShieldCheck size={14} color={colors.textSecondary} /><Text style={s.trustText}>Nothing changes until you approve the plan.</Text></View>
                    </View>
                )}
                {thread.map((item) => (
                    <View key={item.id}>
                        {item.role === "user" && <Bubble mine>{item.text}</Bubble>}
                        {item.role === "agent" && item.text && (
                            <View style={{ gap: 8 }}>
                                <Bubble tone={item.error ? "error" : undefined}>{item.text}</Bubble>
                                {item.retry && (
                                    <TouchableOpacity disabled={busy} onPress={() => send(item.retry.display, { requestKey: item.retry.requestKey, parentRunId: item.retry.parentRunId, groupId: item.retry.groupId, answers: item.retry.answers, reuse: item.retry.reuse, edits: item.retry.edits, silent: true })} style={s.chip}>
                                        <Text style={s.chipText}>Try again</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                        {item.role === "agent" && item.runId && runs[item.runId] && (
                            <RunMessage
                                run={runs[item.runId]} nameOf={nameOf(item.runId)} superseded={superseded.has(item.runId)} busy={busy}
                                onDecide={decide} onAnswer={answer} onResume={resume} onCancel={cancel} onRetry={(r) => send(r.message)}
                                onEdit={features.includes("edit_plan") ? (step) => setEditing({ run: runs[item.runId], step }) : undefined}
                                onChip={(c) => (c === "Add an expense" ? setInput("Add  paid by me, split equally") : c === "My total balance" ? send("What's my total balance across all groups?", { groupId: null, parentRunId: null }) : send("Who owes whom? Show the simplest settle-up"))}
                            />
                        )}
                    </View>
                ))}
                {busy && thread.at(-1)?.role === "user" && <Bubble><View style={s.inline}><Loader size={14} color={colors.textSecondary} /><Text style={s.muted}>Thinking…</Text></View></Bubble>}
            </ScrollView>

            {connection === "disabled" && <View style={s.banner}><Text style={s.bannerText}>Autopilot is switched off on this server right now. Your groups and expenses are unaffected.</Text></View>}
            {connection === "error" && (
                <View style={s.banner}>
                    <Text style={[s.bannerText, { flex: 1 }]}>Couldn&apos;t connect. Your draft is still here.</Text>
                    <TouchableOpacity onPress={() => setAttempt((n) => n + 1)}><Text style={s.bannerAction}>Retry</Text></TouchableOpacity>
                </View>
            )}
            <Animated.View style={[s.composer, { paddingBottom: bottomPad }]}>
                <View style={s.box}>
                    <TextInput ref={inputRef} value={input} onChangeText={setInput} placeholder={placeholder} placeholderTextColor={colors.textSecondary} multiline maxLength={1500} style={s.input} accessibilityLabel="Message Autopilot" onSubmitEditing={submit} blurOnSubmit={false} />
                    <View style={s.boxRow}>
                        <TouchableOpacity onPress={() => setPicker(true)} style={s.context} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="Group context">
                            {ctxGroup ? <GroupTypeIcon type={ctxGroup.groupType} size={20} /> : <Layers size={14} color={colors.textSecondary} />}
                            <Text style={s.contextText} numberOfLines={1}>{ctxGroup ? ctxGroup.name : "All groups"}</Text>
                            <ChevronDown size={14} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }} />
                        <TouchableOpacity onPress={submit} disabled={!canSend} style={[s.send, !canSend && s.sendOff]} accessibilityRole="button" accessibilityLabel="Send">
                            {busy ? <Loader size={16} color={t.onInk} /> : <ArrowUp size={18} color={canSend ? t.onInk : colors.textSecondary} strokeWidth={2.5} />}
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>

            <GroupPickerSheet visible={picker} groups={groups} value={ctxId} onChange={setCtxId} onClose={() => setPicker(false)} />
            <EditExpenseSheet step={editing?.step} onClose={() => setEditing(null)} onSave={saveEdit} />
        </SafeAreaView>
    );
}

const getStyles = (colors, t) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: SCREEN_GUTTER, paddingTop: 6, paddingBottom: 8 },
    titleBox: { flex: 1 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    title: { fontSize: 20, fontWeight: "700", color: colors.text, letterSpacing: -0.3 },
    subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
    scroll: { paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: 16, gap: 16 },
    welcome: { paddingTop: 6 },
    hero: { fontSize: 30, lineHeight: 36, fontWeight: "700", letterSpacing: -0.9, color: colors.text },
    lead: { fontSize: 14, lineHeight: 21, color: colors.textSecondary, marginTop: 8 },
    tabs: { marginHorizontal: -SCREEN_GUTTER, marginTop: 22, flexGrow: 0 },
    tabsContent: { paddingHorizontal: SCREEN_GUTTER, gap: 8 },
    tab: { height: 36, paddingHorizontal: 15, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: t.fillStrong },
    tabOn: { backgroundColor: t.ink },
    tabText: { fontSize: 13.5, fontWeight: "600", color: colors.textSecondary },
    tabTextOn: { color: t.onInk },
    starter: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
    starterDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.outline },
    starterIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: t.fillStrong },
    starterTitle: { fontSize: 14.5, fontWeight: "600", color: colors.text, letterSpacing: -0.1 },
    starterText: { fontSize: 13, lineHeight: 18, color: colors.textSecondary, marginTop: 1 },
    trust: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: 10 },
    trustText: { flex: 1, fontSize: 12, color: colors.textSecondary },
    inline: { flexDirection: "row", alignItems: "center", gap: 6 },
    muted: { fontSize: 13, color: colors.textSecondary },
    chip: { alignSelf: "flex-start", borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: t.fillStrong },
    chipText: { fontSize: 13, fontWeight: "600", color: colors.text },
    banner: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: SCREEN_GUTTER, marginBottom: 8, padding: 12, borderRadius: R.tile, backgroundColor: colors.warning + "1A" },
    bannerText: { fontSize: 12.5, lineHeight: 18, color: colors.text },
    bannerAction: { fontSize: 13, fontWeight: "700", color: colors.text, textDecorationLine: "underline" },
    composer: { paddingHorizontal: 16, paddingTop: 8, backgroundColor: colors.background },
    box: { borderRadius: 26, paddingHorizontal: 8, paddingTop: 6, paddingBottom: 8, backgroundColor: t.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline },
    input: { maxHeight: 120, minHeight: 40, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 8, fontSize: 15.5, color: colors.text },
    boxRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    context: { flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingLeft: 9, paddingRight: 11, borderRadius: 18, backgroundColor: t.fill, flexShrink: 1 },
    contextText: { fontSize: 13, fontWeight: "600", color: colors.text, flexShrink: 1 },
    send: { width: 38, height: 38, borderRadius: 19, backgroundColor: t.ink, alignItems: "center", justifyContent: "center" },
    sendOff: { backgroundColor: t.fillStrong },
});
