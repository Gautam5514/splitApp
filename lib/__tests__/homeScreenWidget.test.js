// Home-screen widget: data normalisation and caching, size-aware layout, the headless
// task handler (paint cache first, then fresh numbers; tap-to-refresh), and the app-side
// sync that repaints every placed widget.

const mockStore = new Map();
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k) => (mockStore.has(k) ? mockStore.get(k) : null)),
    setItem: jest.fn(async (k, v) => { mockStore.set(k, v); }),
  },
}));

const mockGet = jest.fn();
jest.mock("@/lib/api", () => ({ api: { get: (...a) => mockGet(...a) } }));
jest.mock("@/lib/firebaseClient", () => ({ auth: { currentUser: { uid: "u1" }, onAuthStateChanged: jest.fn(() => () => {}) } }));

const mockRequestWidgetUpdate = jest.fn(async () => {});
const mockRequestPinWidget = jest.fn(async () => true);
jest.mock("react-native-android-widget", () => {
  const React = require("react");
  const Flex = ({ children }) => React.createElement("FlexWidget", null, children);
  const Txt = ({ text }) => React.createElement("TextWidget", null, text);
  return {
    FlexWidget: Flex,
    TextWidget: Txt,
    requestWidgetUpdate: (...a) => mockRequestWidgetUpdate(...a),
    requestPinWidget: (...a) => mockRequestPinWidget(...a),
  };
});
jest.mock("react-native", () => ({ Platform: { OS: "android" } }));

const { normalizeData, normalizeCustom, readData, writeData, fetchWidgetData, isStale, WIDGET_DATA_KEY } = require("@/widgets/widgetData");
const { layoutFor, timeAgo, formatMoney, signedMoney, firstName, renderSplitEaseBalanceWidget, WIDGET_STYLES } = require("@/widgets/SplitEaseBalanceWidget");
const { widgetTaskHandler } = require("@/widgets/widgetTaskHandler");
const { syncBalanceWidget, saveWidgetCustomization, promptAddBalanceWidget } = require("@/lib/homeScreenWidget");

const payload = {
  totalOwe: 500, totalOwed: 1800, net: 1300,
  people: [{ userId: "a", name: "Rahul Verma", amount: 1200, direction: "owed", groupId: "6".repeat(24), group: "Goa Trip" }, { userId: "b", name: "Priya", amount: 500, direction: "owe", groupId: "7".repeat(24), group: "Flat" }],
  month: { spend: 4320, count: 7 }, latest: { description: "Dinner", amount: 1200, group: "Flat", groupId: "7".repeat(24) }, groups: 2, updatedAt: "2026-11-05T10:00:00Z",
};

// Collects every piece of text a rendered widget tree would show.
const textOf = (node, out = []) => {
  if (!node) return out;
  if (Array.isArray(node)) { node.forEach((n) => textOf(n, out)); return out; }
  if (typeof node === "string") { out.push(node); return out; }
  const { props, type } = node;
  if (!props) return out;
  if (typeof type === "function") return textOf(type(props), out);
  if (props.text != null) out.push(String(props.text));
  return textOf(props.children, out);
};
// Collects every clickAction + data on a tree.
const clicksOf = (node, out = []) => {
  if (!node) return out;
  if (Array.isArray(node)) { node.forEach((n) => clicksOf(n, out)); return out; }
  const { props, type } = node;
  if (!props) return out;
  if (props.clickAction) out.push({ action: props.clickAction, uri: props.clickActionData?.uri });
  if (typeof type === "function") return clicksOf(type(props), out);
  return clicksOf(props.children, out);
};

beforeEach(() => { mockStore.clear(); mockGet.mockReset(); mockRequestWidgetUpdate.mockClear(); });

describe("widget data", () => {
  test("normalises the server payload and tolerates the old totals-only shape", () => {
    const d = normalizeData(payload);
    expect(d.net).toBe(1300);
    expect(d.people).toHaveLength(2);
    expect(d.latest.description).toBe("Dinner");
    expect(normalizeData({ totalOwe: 10, totalOwed: 25 })).toMatchObject({ net: 15, people: [], month: { spend: 0, count: 0 }, latest: null });
    expect(normalizeData(null).net).toBe(0);
    expect(normalizeData({ people: [{ name: "x", amount: -5, direction: "owed" }, { name: "y", amount: 5, direction: "sideways" }] }).people).toEqual([]);
  });
  test("custom preferences have safe defaults and a capped label", () => {
    expect(normalizeCustom({})).toEqual({ style: "balance", amount: "", label: "", showBalance: true, showPeople: true, quickActions: true });
    expect(normalizeCustom({ style: "people", label: "x".repeat(40), quickActions: false }).label).toHaveLength(26);
    expect(normalizeCustom({ quickActions: false }).quickActions).toBe(false);
  });
  test("fetch caches on success and falls back to the cache on failure", async () => {
    mockGet.mockResolvedValueOnce({ data: payload });
    const ok = await fetchWidgetData();
    expect(ok.fresh).toBe(true);
    expect(mockGet).toHaveBeenCalledWith("/balances/widget", expect.any(Object));
    expect(JSON.parse(mockStore.get(WIDGET_DATA_KEY)).net).toBe(1300);
    mockGet.mockRejectedValueOnce(new Error("offline"));
    const bad = await fetchWidgetData();
    expect(bad.fresh).toBe(false);
    expect(bad.data.net).toBe(1300);
    expect(isStale({ updatedAt: Date.now() })).toBe(false);
    expect(isStale({ updatedAt: Date.now() - 3600_000 })).toBe(true);
  });
});

describe("widget rendering", () => {
  test("formats rupees, signs and names", () => {
    expect(formatMoney(125000)).toBe("₹1,25,000");
    expect(signedMoney(-800)).toBe("-₹800");
    expect(signedMoney(0)).toBe("₹0");
    expect(firstName("rahul verma")).toBe("rahul");
    expect(timeAgo(Date.now() - 5 * 60_000)).toBe("Updated 5 min ago");
    expect(timeAgo(Date.now() - 3 * 3600_000)).toBe("Updated 3 h ago");
  });
  test("picks a layout from the launcher size", () => {
    expect(layoutFor({ width: 250, height: 60 })).toBe("small");
    expect(layoutFor({ width: 250, height: 110 })).toBe("medium");
    expect(layoutFor({ width: 250, height: 220 })).toBe("large");
    expect(layoutFor({ width: 150, height: 220 })).toBe("medium");
    expect(layoutFor({})).toBe("medium");
  });
  test("every design renders light and dark at every size without crashing, and never shows undefined", () => {
    const data = normalizeData(payload);
    for (const s of WIDGET_STYLES) for (const size of [{ width: 250, height: 60 }, { width: 250, height: 110 }, { width: 300, height: 240 }]) {
      const tree = renderSplitEaseBalanceWidget(data, { style: s.id, amount: "", label: "" }, size);
      for (const variant of [tree.light, tree.dark]) {
        const text = textOf(variant).join(" ");
        expect(text).not.toMatch(/undefined|NaN|null/);
        expect(text.length).toBeGreaterThan(0);
      }
    }
  });
  test("the large balance widget lists who owes whom, with taps to the group and quick actions", () => {
    const tree = renderSplitEaseBalanceWidget(normalizeData(payload), { style: "balance" }, { width: 300, height: 240 });
    const text = textOf(tree.light).join(" | ");
    expect(text).toContain("+₹1,300");
    expect(text).toContain("Rahul owes you");
    expect(text).toContain("You owe Priya");
    expect(text).toContain("Add expense");
    const clicks = clicksOf(tree.light);
    expect(clicks).toEqual(expect.arrayContaining([
      { action: "OPEN_URI", uri: `splitapp://groups/${"6".repeat(24)}` },
      { action: "OPEN_URI", uri: "splitapp://autopilot?prompt=" },
      { action: "OPEN_URI", uri: "splitapp://quick-split" },
      { action: "REFRESH", uri: undefined },
    ]));
  });
  test("medium and small sizes stay compact; options switch people and actions off", () => {
    const data = normalizeData(payload);
    const medium = textOf(renderSplitEaseBalanceWidget(data, { style: "balance" }, { width: 250, height: 110 }).light).join(" ");
    expect(medium).not.toContain("Add expense");
    expect(medium).toContain("TO RECEIVE");
    const small = textOf(renderSplitEaseBalanceWidget(data, { style: "balance" }, { width: 250, height: 60 }).light).join(" ");
    expect(small).toContain("+₹1,300");
    expect(small).not.toContain("TO RECEIVE");
    const noExtras = textOf(renderSplitEaseBalanceWidget(data, { style: "balance", showPeople: false, quickActions: false }, { width: 300, height: 240 }).light).join(" ");
    expect(noExtras).not.toContain("Rahul");
    expect(noExtras).not.toContain("Add expense");
  });
  test("settled and empty states read well", () => {
    const settled = textOf(renderSplitEaseBalanceWidget(normalizeData({ totalOwe: 0, totalOwed: 0, groups: 2 }), { style: "people" }, { width: 250, height: 110 }).light).join(" ");
    expect(settled).toContain("All settled");
    const empty = textOf(renderSplitEaseBalanceWidget(normalizeData({}), { style: "people" }, { width: 250, height: 110 }).light).join(" ");
    expect(empty).toContain("Make a group");
  });
  test("the custom amount and label designs use the user's own figure", () => {
    const text = textOf(renderSplitEaseBalanceWidget(normalizeData(payload), { style: "gradient", amount: "50000", label: "Vacation fund" }, { width: 250, height: 110 }).light).join(" ");
    expect(text).toContain("VACATION FUND");
    expect(text).toContain("₹50,000");
    const goal = textOf(renderSplitEaseBalanceWidget(normalizeData(payload), { style: "goal", amount: "2600" }, { width: 250, height: 110 }).light).join(" ");
    expect(goal).toContain("50%");
  });
});

describe("headless task handler", () => {
  const info = { widgetName: "SplitEaseBalance", widgetId: 1, width: 250, height: 110 };
  test("when added: paints the cache at once, then fresh numbers", async () => {
    await writeData({ totalOwe: 1, totalOwed: 2, updatedAt: Date.now() - 3600_000 });
    mockGet.mockResolvedValueOnce({ data: payload });
    const render = jest.fn();
    await widgetTaskHandler({ widgetInfo: info, widgetAction: "WIDGET_ADDED", renderWidget: render });
    expect(render).toHaveBeenCalledTimes(2);
    expect(textOf(render.mock.calls[0][0].light).join(" ")).toContain("+₹1");
    expect(textOf(render.mock.calls[1][0].light).join(" ")).toContain("+₹1,300");
  });
  test("periodic update fetches; offline it repaints the cache instead of going blank", async () => {
    await writeData(payload);
    mockGet.mockRejectedValueOnce(new Error("offline"));
    const render = jest.fn();
    await widgetTaskHandler({ widgetInfo: info, widgetAction: "WIDGET_UPDATE", renderWidget: render });
    expect(render).toHaveBeenCalledTimes(1);
    expect(textOf(render.mock.calls[0][0].light).join(" ")).toContain("+₹1,300");
  });
  test("tapping the refresh line refetches; other clicks and other widgets are ignored", async () => {
    mockGet.mockResolvedValueOnce({ data: payload });
    const render = jest.fn();
    await widgetTaskHandler({ widgetInfo: info, widgetAction: "WIDGET_CLICK", clickAction: "REFRESH", renderWidget: render });
    expect(render).toHaveBeenCalledTimes(1);
    await widgetTaskHandler({ widgetInfo: info, widgetAction: "WIDGET_CLICK", clickAction: "SOMETHING", renderWidget: render });
    await widgetTaskHandler({ widgetInfo: { ...info, widgetName: "Other" }, widgetAction: "WIDGET_UPDATE", renderWidget: render });
    expect(render).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});

describe("app-side sync", () => {
  test("a rich payload repaints every placed widget from the same numbers", async () => {
    await syncBalanceWidget(payload);
    expect(mockRequestWidgetUpdate).toHaveBeenCalledTimes(1);
    expect(mockRequestWidgetUpdate.mock.calls[0][0].widgetName).toBe("SplitEaseBalance");
    const tree = mockRequestWidgetUpdate.mock.calls[0][0].renderWidget({ width: 300, height: 240 });
    expect(textOf(tree.light).join(" ")).toContain("Rahul owes you");
    expect((await readData()).net).toBe(1300);
    expect(mockGet).not.toHaveBeenCalled();
  });
  test("plain totals paint now and fetch the detail behind them", async () => {
    mockGet.mockResolvedValueOnce({ data: payload });
    await syncBalanceWidget({ totalOwe: 100, totalOwed: 400 });
    expect(mockRequestWidgetUpdate).toHaveBeenCalledTimes(2);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
  test("saving a design repaints with the cached numbers; pinning asks the launcher", async () => {
    await writeData(payload);
    const saved = await saveWidgetCustomization({ style: "month", quickActions: false });
    expect(saved.style).toBe("month");
    expect(mockRequestWidgetUpdate).toHaveBeenCalledTimes(1);
    expect(await promptAddBalanceWidget()).toBe(true);
    expect(mockRequestPinWidget).toHaveBeenCalledWith({ widgetName: "SplitEaseBalance" });
  });
});
