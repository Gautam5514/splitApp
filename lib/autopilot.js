// Autopilot client rules, shared by the screen and its tests. They mirror the web
// widget so both apps behave the same against the same /agent API.

export const OPEN_STATES = ["clarification_required", "waiting_approval"];
export const TERMINAL = ["completed", "failed", "partial_success", "cancelled", "rejected"];
export const READ_STEPS = ["read_summary", "read_overall", "list_expenses"];
export const DELETE_STEPS = ["delete_expense", "delete_group"];
export const STALLED_MS = 2 * 60_000;
// At or above this (minor units) a typed "yes" isn't enough: the user taps the button that names the amount.
export const BIG_MINOR = 50_000_00;

export const APPROVE_WORDS = /^(approve[ds]?|yes|yep|yeah|ok(?:ay)?|confirm(?:ed)?|go ahead|do it|looks good|lgtm|haan|ha|ji|theek hai|kar do)[.!\s]*$/i;
export const REJECT_WORDS = /^(no|nope|nah|reject|cancel|not now|stop|don'?t|nahi|nahin|mat karo|rehne do)[.!\s]*$/i;

// Starter prompts on the empty screen, grouped by what the user wants to do. Each one
// maps to a step type Autopilot really has, is one task, and is written to be edited
// (swap the names and the amount). "{group}" becomes the group you're working in.
export const TEMPLATES = [
  { key: "expense", label: "Add expense", items: [
    { key: "bill", label: "Split a bill", text: "Dinner 3600 paid by me, split equally" },
    { key: "skip", label: "Leave someone out", text: "Groceries 1840 paid by me, split equally, leave out Rahul" },
    { key: "exact", label: "Uneven split", text: "Cab 900 paid by me: me 400, Aman 300, Priya 200" },
  ] },
  { key: "balances", label: "Balances", items: [
    { key: "owe", label: "Who owes whom", text: "Who owes whom? Show the simplest settle-up" },
    { key: "total", label: "My balance", text: "What's my total balance across all groups?" },
    { key: "recent", label: "Recent expenses", text: "Show the recent expenses in {group}" },
  ] },
  { key: "groups", label: "Groups", items: [
    { key: "trip", label: "Start a trip", text: "Create group Goa Trip with Aman and Priya, budget 40000" },
    { key: "people", label: "Add people", text: "Add Sneha and Kabir to {group}" },
  ] },
  { key: "budget", label: "Budget", items: [
    { key: "budget", label: "Set a budget", text: "Set a budget of 25000 for {group}" },
    { key: "alert", label: "Budget alerts", text: "Alert me when {group} crosses 80% of its budget" },
    { key: "check", label: "Budget check", text: "How much of the {group} budget have we used?" },
  ] },
];
export const fillTemplate = (text, groupName) => String(text).replace(/\{group\}/g, (groupName || "").trim() || "Goa Trip");

export const isDeletePlan = (run) => (run?.plan?.steps || []).some((s) => DELETE_STEPS.includes(s.type));
export const planTotal = (run) => (run?.plan?.steps || []).filter((s) => s.type === "create_expense").reduce((n, s) => n + (s.payload?.amountMinor || 0), 0);
export const planCurrency = (run) => run?.plan?.steps?.find((s) => s.payload?.currency)?.payload.currency || "INR";
export const isStalled = (run, now = Date.now()) =>
  run?.stale ?? (["planning", "running"].includes(run?.status) && !!run?.updatedAt && now - new Date(run.updatedAt).getTime() > STALLED_MS);

// What a typed reply means while a plan waits: approve, reject, or nothing special.
// Deletes and big amounts always need the button.
export function typedDecision(run, text) {
  if (run?.status !== "waiting_approval") return null;
  const t = String(text || "").trim();
  if (REJECT_WORDS.test(t)) return { decision: "reject" };
  if (!APPROVE_WORDS.test(t) || !run.writesEnabled) return null;
  if (isDeletePlan(run)) return { blocked: "Deleting can't be undone, so please tap the red Delete permanently button to confirm." };
  if (planTotal(run) >= BIG_MINOR) return { blocked: "That's a large amount, so please tap Approve on the plan to confirm it." };
  return { decision: "approve" };
}

export const approvedStepIds = (run) => (run?.plan?.steps || []).filter((s) => s.requiresApproval).map((s) => s.id);

export function money(minor, currency = "INR") {
  const value = (Number(minor) || 0) / 100;
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { style: "currency", currency, minimumFractionDigits: Number(minor) % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export const initials = (name = "") => name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("") || "?";

export const STATUS_LABEL = {
  planning: "Preparing your plan",
  clarification_required: "Needs a detail",
  waiting_approval: "Awaiting your approval",
  running: "Working on it",
  completed: "Done and verified",
  partial_success: "Partly done",
  failed: "Needs attention",
  cancelled: "Cancelled",
  rejected: "Not done",
};

export function errText(err) {
  const code = err?.response?.data?.code;
  if (code === "AUTOPILOT_DISABLED") return "Autopilot is switched off on the server right now. Your groups and expenses are unaffected.";
  if (err?.response?.status === 429 || code === "RATE_LIMITED") return "You're going a little fast. Give it a few seconds and try again.";
  if (err?.code === "ECONNABORTED") return "That took longer than expected. Nothing was changed. Try again in a moment.";
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.response?.status >= 500) return "Something went wrong on our side. Nothing was changed. Try again in a moment.";
  return "I couldn't reach the server. Check your connection and try again.";
}

// A request body for POST /agent/runs. Very short chip labels are padded for older servers.
export function runPayload(text, { groupId = null, parentRunId = null, answers, reuse, edits, requestKey } = {}) {
  let message = String(text || "").trim();
  if (message.length < 3) message = `Use ${message}`;
  return {
    message: message.slice(0, 4000), groupId: groupId || null, requestKey: requestKey || uuid(), parentRunId: parentRunId || null,
    ...(answers ? { answers } : {}), ...(reuse ? { reuse: true } : {}), ...(edits ? { edits } : {}),
  };
}

// RFC 4122 v4, without depending on crypto.randomUUID (missing on some Android JS engines).
export function uuid() {
  const g = globalThis.crypto;
  if (g?.randomUUID) return g.randomUUID();
  const b = new Uint8Array(16);
  if (g?.getRandomValues) g.getRandomValues(b); else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// Tips link to the web's "/dashboard?autopilot=1&prompt=..."; in the app that means
// "open Autopilot with this draft". Returns the draft, or null for other links.
export function autopilotPromptFrom(link) {
  if (typeof link !== "string" || !/[?&]autopilot=1/.test(link)) return null;
  const m = link.match(/[?&]prompt=([^&#]*)/);
  if (!m) return "";
  try { return decodeURIComponent(m[1].replace(/\+/g, " ")).slice(0, 500); } catch { return ""; }
}

// What the plan-card edit sheet sends: only fields that actually changed.
export function editChanges(step, { title, amount, chosen }) {
    const p = step.payload;
    const changes = {};
    if (title.trim() && title.trim() !== p.name) changes.title = title.trim().slice(0, 200);
    const valid = /^\d+(?:\.\d{1,2})?$/.test(amount.trim()) && Number(amount) > 0;
    if (valid && Math.round(Number(amount) * 100) !== p.amountMinor) changes.amount = amount.trim();
    const roster = p.roster || p.splits.map((x) => ({ memberId: x.memberId, name: x.name }));
    const before = new Set(p.splits.map((x) => x.memberId));
    if (p.splitType !== "exact" && (chosen.size !== before.size || [...chosen].some((id) => !before.has(id)))) {
        changes.excluded = roster.map((r) => r.memberId).filter((id) => !chosen.has(id));
    }
    return { changes, valid };
}
