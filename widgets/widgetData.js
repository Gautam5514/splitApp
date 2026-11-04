import AsyncStorage from "@react-native-async-storage/async-storage";

/*
 * Data for the home-screen widget. Everything the widget can show comes from one
 * backend call (GET /balances/widget) and is cached, so the widget always has
 * something to draw even with no network, and so the headless refresh (every 30
 * minutes, or a tap on "Refresh") can run without the app being open.
 */
export const WIDGET_DATA_KEY = "splitease_balance_widget_v2";
export const WIDGET_CUSTOM_KEY = "splitease_widget_custom_v1";
export const WIDGET_NAME = "SplitEaseBalance";

export const EMPTY = { totalOwe: 0, totalOwed: 0, net: 0, people: [], month: { spend: 0, count: 0 }, latest: null, groups: 0, updatedAt: 0 };
export const DEFAULT_CUSTOM = { style: "balance", amount: "", label: "", showBalance: true, showPeople: true, quickActions: true };

// Accepts both the rich widget payload and the older { totalOwe, totalOwed } summary.
export function normalizeData(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const totalOwe = Math.max(0, Number(r.totalOwe) || 0);
  const totalOwed = Math.max(0, Number(r.totalOwed) || 0);
  return {
    totalOwe,
    totalOwed,
    net: Number.isFinite(Number(r.net)) ? Number(r.net) : totalOwed - totalOwe,
    people: Array.isArray(r.people)
      ? r.people
        .filter((p) => p && Number(p.amount) > 0 && (p.direction === "owed" || p.direction === "owe"))
        .map((p) => ({ userId: String(p.userId || ""), name: String(p.name || "Someone"), amount: Number(p.amount), direction: p.direction, groupId: p.groupId ? String(p.groupId) : "", group: String(p.group || "") }))
        .slice(0, 5)
      : [],
    month: { spend: Number(r.month?.spend) || 0, count: Number(r.month?.count) || 0 },
    latest: r.latest && r.latest.description ? { description: String(r.latest.description), amount: Number(r.latest.amount) || 0, group: String(r.latest.group || ""), groupId: r.latest.groupId ? String(r.latest.groupId) : "" } : null,
    groups: Number(r.groups) || 0,
    updatedAt: Number(r.updatedAt ? new Date(r.updatedAt).getTime() : Date.now()) || Date.now(),
  };
}

export function normalizeCustom(raw) {
  const c = raw && typeof raw === "object" ? raw : {};
  return {
    style: typeof c.style === "string" && c.style ? c.style : DEFAULT_CUSTOM.style,
    amount: c.amount ?? "",
    label: typeof c.label === "string" ? c.label.slice(0, 26) : "",
    showBalance: c.showBalance !== false,
    showPeople: c.showPeople !== false,
    quickActions: c.quickActions !== false,
  };
}

export async function readData() {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    return raw ? normalizeData(JSON.parse(raw)) : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

export async function writeData(data) {
  const next = normalizeData(data);
  await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(next));
  return next;
}

export async function readCustom() {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_CUSTOM_KEY);
    return normalizeCustom(raw ? JSON.parse(raw) : {});
  } catch {
    return { ...DEFAULT_CUSTOM };
  }
}

export async function writeCustom(custom) {
  const next = normalizeCustom(custom);
  await AsyncStorage.setItem(WIDGET_CUSTOM_KEY, JSON.stringify(next));
  return next;
}

// The Firebase session restores asynchronously in a headless task; give it a moment so
// the request goes out with a fresh token instead of failing on an expired one.
async function waitForAuth(timeoutMs = 4000) {
  try {
    const { auth } = require("@/lib/firebaseClient");
    if (auth.currentUser) return;
    await new Promise((resolve) => {
      const timer = setTimeout(() => { unsub(); resolve(); }, timeoutMs);
      const unsub = auth.onAuthStateChanged(() => { clearTimeout(timer); unsub(); resolve(); });
    });
  } catch {
    // No Firebase in this environment: the stored token is used as-is.
  }
}

/*
 * Fresh numbers from the server, cached on success. On any failure the cache is
 * returned, so a widget never goes blank because of a flaky network.
 * Returns { data, fresh }.
 */
export async function fetchWidgetData({ timeoutMs = 12000 } = {}) {
  try {
    await waitForAuth();
    const { api } = require("@/lib/api");
    const { data } = await api.get("/balances/widget", { timeout: timeoutMs });
    return { data: await writeData(data), fresh: true };
  } catch {
    return { data: await readData(), fresh: false };
  }
}

export const isStale = (data, maxAgeMs = 20 * 60_000) => !data?.updatedAt || Date.now() - data.updatedAt > maxAgeMs;
