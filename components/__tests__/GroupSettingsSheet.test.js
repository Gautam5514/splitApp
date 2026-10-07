// Group settings after the first expense: split / currency / trip are locked,
// only "Receipt required" and "Approve people who join" can change.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import GroupSettingsSheet from "../group/GroupSettingsSheet";

afterEach(async () => { await cleanup(); });

const mockPatch = jest.fn();
const mockAlert = jest.fn();
jest.mock("@/lib/api", () => ({ api: { patch: (...a) => mockPatch(...a) } }));
jest.mock("@/lib/alert", () => ({ Alert: { alert: (...a) => mockAlert(...a) } }));
jest.mock("@react-native-community/datetimepicker", () => "DateTimePicker");
jest.mock("lucide-react-native", () => new Proxy({}, { get: (_t, n) => (n === "__esModule" ? false : () => null) }));
jest.mock("@/components/group/GroupTypeIcon", () => "GroupTypeIcon");
jest.mock("@/components/ui/BottomSheet", () => {
  const { View } = require("react-native");
  return ({ children, header }) => <View>{header}{children}</View>;
});
jest.mock("@/components/ui/Typography", () => ({ Text: require("react-native").Text }));
jest.mock("@/components/ui/Design", () => {
  const RN = require("react-native");
  return {
    useDesign: () => ({ colors: { text: "#111", textSecondary: "#666", background: "#fff", primary: "#00f" }, t: { surface: "#fff", surfaceAlt: "#eee", outline: "#ddd", ink: "#000", onInk: "#fff" }, isDark: false }),
    PillInput: (p) => <RN.TextInput {...p} />,
    PillButton: ({ label, onPress }) => <RN.TouchableOpacity accessibilityLabel={label} onPress={onPress}><RN.Text>{label}</RN.Text></RN.TouchableOpacity>,
  };
});

const members = [{ _id: "m1", name: "Meera" }, { _id: "m2", name: "Farah" }];
const mkGroup = (over = {}) => ({
  _id: "g1", groupType: "roommate", members,
  settings: { currency: "INR", receiptRequired: false, joinApproval: false, defaultSplit: { type: "equal", weights: [] } },
  ...over,
});
const sharesGroup = (over = {}) => mkGroup({
  settings: { currency: "INR", defaultSplit: { type: "shares", weights: [{ userId: "m1", value: 2 }, { userId: "m2", value: 1 }] } }, ...over,
});

beforeEach(() => { jest.clearAllMocks(); mockPatch.mockResolvedValue({ data: { _id: "g1", hasExpenses: false } }); });

const open = async (group, hasExpenses = false) => {
  const onSaved = jest.fn(); const onClose = jest.fn();
  await render(<GroupSettingsSheet visible group={group} hasExpenses={hasExpenses} onClose={onClose} onSaved={onSaved} />);
  return { onSaved, onClose };
};
const save = async () => { await fireEvent.press(screen.getByLabelText("Save settings")); };
const switches = () => screen.getAllByRole("switch");

describe("GroupSettingsSheet - before the first expense", () => {
  test("shows split choices and no lock banner", async () => {
    await open(mkGroup());
    expect(screen.getByText("Equal")).toBeTruthy();
    expect(screen.getByText("Shares")).toBeTruthy();
    expect(screen.getByText("Percent")).toBeTruthy();
    expect(screen.queryByTestId("split-locked")).toBeNull();
    expect(screen.queryByText(/locked/i)).toBeNull();
  });

  test("saves the full payload", async () => {
    await open(mkGroup());
    await fireEvent.press(screen.getByText("Shares"));
    await save();
    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1));
    expect(mockPatch).toHaveBeenCalledWith("/groups/g1/settings", {
      groupType: "roommate",
      settings: { receiptRequired: false, joinApproval: false, currency: "INR",
        defaultSplit: { type: "shares", weights: [{ userId: "m1", value: 1 }, { userId: "m2", value: 1 }] } },
    });
  });

  test("percent not summing to 100 is blocked with no request", async () => {
    await open(mkGroup());
    await fireEvent.press(screen.getByText("Percent"));
    await save();
    expect(mockAlert).toHaveBeenCalledWith("Check the split", "Default percentages must add up to 100.");
    expect(mockPatch).not.toHaveBeenCalled();
  });
});

describe.each([
  ["list has expenses (prop)", (g) => [g, true]],
  ["server flag group.hasExpenses", (g) => [{ ...g, hasExpenses: true }, false]],
])("GroupSettingsSheet - locked: %s", (_n, make) => {
  const openLocked = async (g = mkGroup()) => { const [group, has] = make(g); return open(group, has); };

  test("shows the split as plain values - no picker, no inputs", async () => {
    await openLocked(sharesGroup());
    expect(screen.getByTestId("split-locked")).toBeTruthy();
    expect(screen.getByText("By shares")).toBeTruthy();
    expect(screen.getByText("Meera")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.queryByText("Percent")).toBeNull();
    expect(screen.queryByText("Shares")).toBeNull();
    expect(screen.queryByPlaceholderText("0")).toBeNull();
  });

  test("no banner and no 'locked' wording anywhere", async () => {
    await openLocked(sharesGroup());
    expect(screen.queryByText(/locked/i)).toBeNull();
    expect(screen.queryByText(/This group has expenses/)).toBeNull();
    expect(screen.queryByText(/after the first expense/i)).toBeNull();
  });

  test("currency is a plain value (no currency chips)", async () => {
    await openLocked();
    expect(screen.getByText("INR")).toBeTruthy();
    expect(screen.queryByText("USD")).toBeNull();
  });

  test("trip dates and budget are plain values", async () => {
    await openLocked(mkGroup({ groupType: "trip", trip: { startDate: "2026-10-01T00:00:00.000Z", endDate: "2026-10-09T00:00:00.000Z", budget: 500 } }));
    expect(screen.getByText("Start date")).toBeTruthy();
    expect(screen.getByText("INR 500")).toBeTruthy();
    expect(screen.queryByPlaceholderText("No budget")).toBeNull();
  });

  test("both switches stay usable and ONLY they are sent", async () => {
    const { onSaved } = await openLocked(sharesGroup());
    const [receipt, approve] = switches();
    expect(receipt.props.disabled).toBeFalsy();
    await fireEvent(receipt, "valueChange", true);
    await fireEvent(approve, "valueChange", true);
    await save();
    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1));
    expect(mockPatch).toHaveBeenCalledWith("/groups/g1/settings", { settings: { receiptRequired: true, joinApproval: true } });
    expect(onSaved).toHaveBeenCalled();
  });

  test("legacy odd percent weights do not block saving the switches", async () => {
    await openLocked(mkGroup({ settings: { currency: "INR", defaultSplit: { type: "percent", weights: [{ userId: "m1", value: 10 }] } } }));
    await save();
    await waitFor(() => expect(mockPatch).toHaveBeenCalled());
    expect(mockAlert).not.toHaveBeenCalled();
  });
});

describe("GroupSettingsSheet - an expense lands while the sheet is open", () => {
  test("409 SETTINGS_LOCKED locks the sheet and shows the server's message", async () => {
    mockPatch.mockRejectedValueOnce({ response: { status: 409, data: { code: "SETTINGS_LOCKED", message: "Locked now." } } });
    const { onSaved, onClose } = await open(mkGroup());
    await fireEvent.press(screen.getByText("Shares"));
    await save();
    await waitFor(() => expect(mockAlert).toHaveBeenCalledWith("Couldn't save", "Locked now."));
    expect(await screen.findByTestId("split-locked")).toBeTruthy();
    expect(screen.queryByText("Percent")).toBeNull();
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
