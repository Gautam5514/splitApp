// Autopilot screen: send a request, review the plan, approve by tap or by typing,
// and the guards for deletes. API and storage are mocked; no server is involved.
const mockPost = jest.fn();
const mockGet = jest.fn();
jest.mock("@/lib/api", () => ({ api: { get: (...a) => mockGet(...a), post: (...a) => mockPost(...a), defaults: { headers: { common: {} } } } }));
jest.mock("@/lib/firebaseClient", () => ({ auth: { currentUser: null } }));
jest.mock("expo-router", () => ({ router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() }, useLocalSearchParams: () => ({}) }));
jest.mock("@react-native-async-storage/async-storage", () => ({ getItem: jest.fn(async () => null), setItem: jest.fn(async () => {}), removeItem: jest.fn(async () => {}), multiRemove: jest.fn(async () => {}) }));
jest.mock("react-native-safe-area-context", () => { const { View } = require("react-native"); return { SafeAreaView: View, SafeAreaProvider: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }; });

const React = require("react");
const TR = require("react-test-renderer");
const { ThemeProvider } = require("@/context/ThemeContext");
const Autopilot = require("../../app/autopilot").default;

// Small react-test-renderer helpers (the app's other screen tests use the same renderer).
let tree;
const texts = () => tree.root.findAll((n) => typeof n.children?.[0] === "string").map((n) => n.children.join(""));
const hasText = (re) => texts().some((x) => (re instanceof RegExp ? re.test(x) : x === re));
const byLabel = (label) => tree.root.find((n) => n.props?.accessibilityLabel === label && (n.props.onPress || n.props.onChangeText));
const byText = (text) => tree.root.find((n) => n.props?.onPress && n.findAll((c) => c.children?.[0] === text).length > 0);
const flush = (ms = 20) => TR.act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const press = async (node) => { await TR.act(async () => { node.props.onPress(); }); await flush(); };
const type = async (label, value) => { await TR.act(async () => { byLabel(label).props.onChangeText(value); }); };
const until = async (fn, tries = 50) => { for (let i = 0; i < tries; i++) { if (fn()) return; await flush(20); } throw new Error("condition not met: " + texts().slice(-12).join(" | ")); };

const plan = (steps) => ({ steps, clarifications: [], questions: [], notes: [] });
const expenseStep = (amountMinor) => ({ id: "step_1", action: 0, type: "create_expense", title: "Record “Dinner”", requiresApproval: true, payload: { groupId: "g".repeat(24), currency: "INR", name: "Dinner", amountMinor, splitType: "equal", category: "food", splits: [{ memberId: "a", name: "You", shareMinor: amountMinor / 2 }, { memberId: "b", name: "Aman", shareMinor: amountMinor / 2 }], roster: [{ memberId: "a", name: "You" }, { memberId: "b", name: "Aman" }] } });
const run = (id, steps, extra = {}) => ({ _id: id, status: "waiting_approval", writesEnabled: true, planVersion: 1, payloadHash: "f".repeat(64), plan: plan(steps), results: [], events: [], ...extra });

afterEach(() => { if (tree) TR.act(() => tree.unmount()); tree = null; });
beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockImplementation((url) => Promise.resolve({ data: url === "/agent/groups" ? [{ _id: "g".repeat(24), name: "Flat", groupType: "roommate", settings: { currency: "INR" } }] : { enabled: true, features: ["edit_plan", "delete"], ai: { mode: "ai" } } }));
});
const mount = async () => {
  await TR.act(async () => { tree = TR.create(<ThemeProvider><Autopilot /></ThemeProvider>); });
  await until(() => hasText("Plan together. You're in control."));
};
const say = async (text) => { await type("Message Autopilot", text); await press(byLabel("Send")); };

test("welcome shortcuts fill an editable draft without sending", async () => {
  await mount();
  await press(byLabel("Split a bill"));
  expect(byLabel("Message Autopilot").props.value).toBe("Dinner 3600 paid by me, split equally");
  expect(mockPost).not.toHaveBeenCalled();
});

test("a plan shows its amount on the Approve button; typing “haan” approves it", async () => {
  const r = run("a".repeat(24), [expenseStep(120000)]);
  mockPost.mockImplementation((url) => Promise.resolve({ data: url === "/agent/runs" ? r : { ...r, status: "completed", results: [{ stepId: "step_1", verified: true }] } }));
  await mount();
  await say("Dinner 1200 paid by me equally");
  await until(() => hasText("Approve ₹1,200"));
  expect(hasText("Edit amount or people")).toBe(true);
  await say("haan");
  expect(mockPost).toHaveBeenLastCalledWith(`/agent/runs/${r._id}/decision`, expect.objectContaining({ decision: "approve", approvedStepIds: ["step_1"] }), expect.anything());
  await until(() => hasText("Done, and verified against your ledger."));
});

test("deletes need the red button: typing yes is refused", async () => {
  const r = run("b".repeat(24), [{ id: "step_1", action: 0, type: "delete_group", title: "Delete group “Flat” permanently", requiresApproval: true, payload: { groupId: "g".repeat(24), name: "Flat", currency: "INR", impact: { members: 3, expenses: 4, totalMinor: 500000 } } }]);
  mockPost.mockImplementation(() => Promise.resolve({ data: r }));
  await mount();
  await say("delete this group");
  await until(() => hasText("Delete permanently"));
  expect(hasText("Permanent. This can't be undone.")).toBe(true);
  await say("yes");
  await until(() => hasText(/please tap the red Delete permanently button/));
  expect(mockPost.mock.calls.filter(([url]) => url.endsWith("/decision"))).toHaveLength(0);
});

test("editing the plan sends edits for the server to rebuild", async () => {
  const r = run("c".repeat(24), [expenseStep(300000)]);
  mockPost.mockImplementation(() => Promise.resolve({ data: r }));
  await mount();
  await say("Dinner 3000 paid by me equally");
  await until(() => hasText("Edit amount or people"));
  await press(byText("Edit amount or people"));
  await until(() => hasText("Edit this expense"));
  await type("Amount", "4500");
  await press(byText("Update plan"));
  await until(() => mockPost.mock.calls.length >= 2);
  expect(mockPost).toHaveBeenLastCalledWith("/agent/runs", expect.objectContaining({ parentRunId: r._id, reuse: true, edits: [{ action: 0, amount: "4500" }] }), expect.anything());
});

test("a server with Autopilot off says so instead of failing silently", async () => {
  mockGet.mockImplementation(() => Promise.reject({ response: { status: 404, data: { code: "AUTOPILOT_DISABLED" } } }));
  await TR.act(async () => { tree = TR.create(<ThemeProvider><Autopilot /></ThemeProvider>); });
  await until(() => hasText(/switched off on this server right now/));
});
