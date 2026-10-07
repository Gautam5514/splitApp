// New create-group flow:
//   1. type   2. name + icon + people (same page)   3. settings (all optional)
// Currency / split are dropdowns (bottom sheet), the icon "More" opens a sheet.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import CreateGroupScreen from "../../app/create-group";

afterEach(async () => { await cleanup(); });

const mockApi = { post: jest.fn(), get: jest.fn(), patch: jest.fn() };
const mockAlert = jest.fn();
jest.mock("@/lib/api", () => ({ api: { post: (...a) => mockApi.post(...a), get: (...a) => mockApi.get(...a), patch: (...a) => mockApi.patch(...a) } }));
jest.mock("@/lib/alert", () => ({ Alert: { alert: (...a) => mockAlert(...a) } }));
jest.mock("expo-router", () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));
jest.mock("expo-haptics", () => ({ selectionAsync: jest.fn(async () => {}) }));
jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: jest.fn(), MediaTypeOptions: { Images: "Images" } }));
jest.mock("expo-linear-gradient", () => ({ LinearGradient: require("react-native").View }));
jest.mock("@react-native-community/datetimepicker", () => "DateTimePicker");
jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: require("react-native").View }));
jest.mock("@/hooks/useSafeSpacing", () => ({ useBottomSpacing: () => 16 }));
jest.mock("@/components/ui/Typography", () => ({ Text: require("react-native").Text }));
jest.mock("@/components/group/GroupTypeIcon", () => "GroupTypeIcon");
jest.mock("@/components/InviteModal", () => () => null);
jest.mock("lucide-react-native", () => new Proxy({}, { get: (_t, n) => (n === "__esModule" ? false : () => null) }));
// Only render sheet content while open, like the real one.
jest.mock("@/components/ui/BottomSheet", () => ({ visible, header, children }) => (visible ? <>{header}{children}</> : null)); // icon picker sheet only
jest.mock("@/components/GroupIconPicker", () => {
  const RN = require("react-native");
  return ({ onChange }) => <RN.TouchableOpacity accessibilityLabel="Pick globe icon" onPress={() => onChange("globe")}><RN.Text>icons-grid</RN.Text></RN.TouchableOpacity>;
});
// People picker stub: one tap adds Ann (a direct contact).
jest.mock("@/components/people/PeoplePicker", () => {
  const RN = require("react-native");
  const PEOPLE = [["a", "Ann"], ["b", "Bob"], ["c", "Cara"]];
  return ({ selected, onChange }) => (
    <RN.TouchableOpacity accessibilityLabel="Add Ann" onPress={() => { const [id, nm] = PEOPLE[selected.length]; onChange([...selected, { key: `u:${id}`, kind: "user", userId: id, name: nm, sub: `${nm}@x.com`, direct: true }]); }}>
      <RN.Text>people-picker</RN.Text>
    </RN.TouchableOpacity>
  );
});
jest.mock("@/components/ui/Design", () => {
  const RN = require("react-native");
  return {
    useDesign: () => ({ colors: { text: "#111", textSecondary: "#666", background: "#fff", primary: "#00f", error: "red" }, t: { surface: "#fff", surfaceAlt: "#eee", outline: "#ddd", ink: "#000", onInk: "#fff" }, isDark: false }),
    PillInput: (p) => <RN.TextInput {...p} />,
    PillButton: ({ label, onPress, disabled }) => <RN.TouchableOpacity accessibilityLabel={label} onPress={disabled ? undefined : onPress} accessibilityState={{ disabled: !!disabled }}><RN.Text>{label}</RN.Text></RN.TouchableOpacity>,
    ScreenHeader: ({ title, subtitle, onBack }) => <RN.View><RN.Text>{title}</RN.Text><RN.Text>{subtitle}</RN.Text><RN.TouchableOpacity accessibilityLabel="Back" onPress={onBack} /></RN.View>,
  };
});

const press = async (label) => { await fireEvent.press(screen.getByLabelText(label)); };
const pressText = async (text) => { await fireEvent.press(screen.getByText(text)); };

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.post.mockImplementation((url) => Promise.resolve({ data: url === "/groups" ? { _id: "g1" } : { group: { _id: "g1", members: [{ _id: "me1" }, { _id: "a" }] }, added: 1 } }));
  mockApi.get.mockResolvedValue({ data: { _id: "g1", createdBy: "me1", members: [{ _id: "me1" }, { _id: "a" }] } });
  mockApi.patch.mockResolvedValue({ data: {} });
});

// type -> name&people
const toNameStep = async () => {
  await render(<CreateGroupScreen />);
  await press("Continue with Roommates");
};

describe("create group (app) - new 3-step layout", () => {
  test("step 2 has the name, icons AND people on the same page", async () => {
    await toNameStep();
    expect(screen.getByText("Name & people")).toBeTruthy();
    expect(screen.getByText("Step 2 of 3")).toBeTruthy();
    expect(screen.getByPlaceholderText(/Flat 302/)).toBeTruthy();
    expect(screen.getByText("More")).toBeTruthy();
    expect(screen.getByText("people-picker")).toBeTruthy();
    // settings are NOT here
    expect(screen.queryByText("Currency")).toBeNull();
    expect(screen.queryByText("Receipt required")).toBeNull();
  });

  test("icon 'More' opens a sheet (not an inline list) and picking closes it", async () => {
    await toNameStep();
    expect(screen.queryByText("icons-grid")).toBeNull();
    await pressText("More");
    expect(screen.getByText("Choose an icon")).toBeTruthy();
    expect(screen.getByText("icons-grid")).toBeTruthy();
    await press("Pick globe icon");
    expect(screen.queryByText("icons-grid")).toBeNull();
  });

  test("Next needs a valid name (no move on 1 char)", async () => {
    await toNameStep();
    await fireEvent.changeText(screen.getByPlaceholderText(/Flat 302/), "A");
    await press("Next");
    expect(screen.getByText("Use at least 2 characters.")).toBeTruthy();
    expect(screen.getByText("Name & people")).toBeTruthy();
  });

  test("step 3 has every setting, all optional, as dropdown rows", async () => {
    await toNameStep();
    await press("Next");
    expect(screen.getByText("Settings")).toBeTruthy();
    expect(screen.getByText("Step 3 of 3")).toBeTruthy();
    expect(screen.getByLabelText("Currency: INR")).toBeTruthy();
    expect(screen.getByLabelText("Split: Equally")).toBeTruthy();
    expect(screen.getByText("Receipt required")).toBeTruthy();
    expect(screen.getByText(/All optional/)).toBeTruthy();
    // options are NOT laid out inline
    expect(screen.queryByText("USD")).toBeNull();
    expect(screen.queryByText("By shares")).toBeNull();
  });

  test("Currency opens IN PLACE (no pop-up) with all options; choosing updates the row and collapses it", async () => {
    await toNameStep();
    await press("Next");
    expect(screen.queryByLabelText("Option USD")).toBeNull();
    await press("Currency: INR");
    expect(screen.getByLabelText("Option USD")).toBeTruthy();
    expect(screen.getByLabelText("Option JPY")).toBeTruthy();
    expect(screen.queryByText("Choose an icon")).toBeNull(); // not a sheet
    await press("Option USD");
    expect(screen.queryByLabelText("Option USD")).toBeNull();
    expect(screen.getByLabelText("Currency: USD")).toBeTruthy();
  });

  test("opening Split lists Equally / By shares / By percent in place", async () => {
    await toNameStep();
    await press("Next");
    await press("Split: Equally");
    expect(screen.getByLabelText("Option Equally")).toBeTruthy();
    expect(screen.getByLabelText("Option By shares")).toBeTruthy();
    expect(screen.getByLabelText("Option By percent")).toBeTruthy();
  });

  test("Create with all defaults: skipping settings is fine", async () => {
    await toNameStep();
    await press("Next");
    await press("Create group");
    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith("/groups", expect.objectContaining({
      name: expect.any(String), groupType: "roommate", settings: { currency: "INR", receiptRequired: false, joinApproval: false },
    })));
    expect(mockApi.patch).not.toHaveBeenCalled();
  });

  test("chosen currency + receipt switch are sent", async () => {
    await toNameStep();
    await press("Next");
    await press("Currency: INR");
    await press("Option EUR");
    await fireEvent(screen.getAllByRole("switch")[0], "valueChange", true);
    await press("Create group");
    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith("/groups", expect.objectContaining({ settings: { currency: "EUR", receiptRequired: true, joinApproval: false } })));
  });

  test("By shares with people: per-person editor appears; custom shares are saved after members", async () => {
    await toNameStep();
    await press("Add Ann");
    await press("Next");
    await press("Split: Equally");
    await press("Option By shares");
    expect(screen.getByText("Set shares for each person")).toBeTruthy();
    await press("More shares for Ann");
    await press("Create & add 1");
    await waitFor(() => expect(mockApi.patch).toHaveBeenCalledTimes(1));
    expect(mockApi.patch).toHaveBeenCalledWith("/groups/g1/settings", {
      settings: { defaultSplit: { type: "shares", weights: [{ userId: "me1", value: 1 }, { userId: "a", value: 2 }] } },
    });
    expect(mockApi.post).toHaveBeenCalledWith("/groups", expect.objectContaining({
      settings: expect.objectContaining({ defaultSplit: { type: "shares", weights: [] } }),
    }));
  });

  test("people picked on step 2 are added on create", async () => {
    await toNameStep();
    await press("Add Ann");
    await press("Next");
    await press("Create & add 1");
    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith("/groups/g1/members", { userIds: ["a"], emails: [] }));
  });

  test("Back walks 3 -> 2 -> 1", async () => {
    await toNameStep();
    await press("Next");
    await press("Back");
    expect(screen.getByText("Name & people")).toBeTruthy();
    await press("Back");
    expect(screen.getByText("New Group")).toBeTruthy();
  });

  test("trip: dates and budget live on the settings step; bad budget is reported there", async () => {
    await render(<CreateGroupScreen />);
    await press("Trip: Budget, dates and split-as-you-go");
    await press("Next");
    expect(screen.getByText("Dates")).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText("15000"), "0");
    await press("Create group");
    expect(await screen.findByText("Budget must be a positive amount.")).toBeTruthy();
    expect(mockApi.post).not.toHaveBeenCalled();
  });

  test("step 3 has the 'Approve people who join by link' toggle and it is sent", async () => {
    await toNameStep();
    await press("Next");
    expect(screen.getByText("Approve people who join by link")).toBeTruthy();
    const [, approve] = screen.getAllByRole("switch");
    await fireEvent(approve, "valueChange", true);
    await press("Create group");
    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith("/groups", expect.objectContaining({
      settings: expect.objectContaining({ joinApproval: true, receiptRequired: false }),
    })));
  });

  describe("By percent", () => {
    const toPercent = async (withAnn = true) => {
      await toNameStep();
      if (withAnn) await press("Add Ann");
      await press("Next");
      await press("Split: Equally");
      await press("Option By percent");
    };

    test("editor starts as an even 100% split (You + Ann = 50/50)", async () => {
      await toPercent();
      expect(screen.getByText("Set percent for each person")).toBeTruthy();
      expect(screen.getByLabelText("Percent for You").props.value).toBe("50");
      expect(screen.getByLabelText("Percent for Ann").props.value).toBe("50");
      expect(screen.getByText("100% of 100%")).toBeTruthy();
    });

    test("three people split 33.34 / 33.33 / 33.33 and still total exactly 100", async () => {
      await toNameStep();
      await press("Add Ann"); // Ann
      await press("Add Ann"); // Bob (stub adds the next person)
      await press("Next");
      await press("Split: Equally");
      await press("Option By percent");
      expect(screen.getByLabelText("Percent for You").props.value).toBe("33.34");
      expect(screen.getByLabelText("Percent for Ann").props.value).toBe("33.33");
      expect(screen.getByLabelText("Percent for Bob").props.value).toBe("33.33");
      expect(screen.getByText("100% of 100%")).toBeTruthy();
    });

    test("custom percentages are saved after members are added", async () => {
      await toPercent();
      await fireEvent.changeText(screen.getByLabelText("Percent for You"), "70");
      await fireEvent.changeText(screen.getByLabelText("Percent for Ann"), "30");
      await press("Create & add 1");
      await waitFor(() => expect(mockApi.patch).toHaveBeenCalledTimes(1));
      expect(mockApi.patch).toHaveBeenCalledWith("/groups/g1/settings", {
        settings: { defaultSplit: { type: "percent", weights: [{ userId: "me1", value: 70 }, { userId: "a", value: 30 }] } },
      });
      // percent is never sent on create (no members yet)
      const body = mockApi.post.mock.calls.find((c) => c[0] === "/groups")[1];
      expect(body.settings.defaultSplit).toBeUndefined();
    });

    test("an untouched even split is saved as 50/50", async () => {
      await toPercent();
      await press("Create & add 1");
      await waitFor(() => expect(mockApi.patch).toHaveBeenCalled());
      expect(mockApi.patch.mock.calls[0][1].settings.defaultSplit.weights).toEqual([{ userId: "me1", value: 50 }, { userId: "a", value: 50 }]);
    });

    test("percentages not adding to 100 block Create and show why", async () => {
      await toPercent();
      await fireEvent.changeText(screen.getByLabelText("Percent for You"), "70");
      expect(screen.getByText("120% of 100%")).toBeTruthy();
      await press("Create & add 1");
      expect(await screen.findByText("Percentages must add up to 100.")).toBeTruthy();
      expect(mockApi.post).not.toHaveBeenCalled();
    });

    test("'Split evenly' resets edited numbers", async () => {
      await toPercent();
      await fireEvent.changeText(screen.getByLabelText("Percent for You"), "90");
      await press("Split evenly");
      expect(screen.getByLabelText("Percent for You").props.value).toBe("50");
    });

    test("only You: 100% to the creator, and it is saved", async () => {
      await toPercent(false);
      expect(screen.getByLabelText("Percent for You").props.value).toBe("100");
      mockApi.get.mockResolvedValue({ data: { _id: "g1", createdBy: "me1", members: [{ _id: "me1" }] } });
      await press("Create group");
      await waitFor(() => expect(mockApi.patch).toHaveBeenCalledWith("/groups/g1/settings", {
        settings: { defaultSplit: { type: "percent", weights: [{ userId: "me1", value: 100 }] } },
      }));
    });

    test("if someone could not be added, the remaining percents are rescaled to total 100", async () => {
      await toPercent();
      await fireEvent.changeText(screen.getByLabelText("Percent for You"), "60");
      await fireEvent.changeText(screen.getByLabelText("Percent for Ann"), "40");
      mockApi.get.mockResolvedValue({ data: { _id: "g1", createdBy: "me1", members: [{ _id: "me1" }] } }); // Ann never joined
      await press("Create & add 1");
      await waitFor(() => expect(mockApi.patch).toHaveBeenCalled());
      expect(mockApi.patch.mock.calls[0][1].settings.defaultSplit.weights).toEqual([{ userId: "me1", value: 100 }]);
    });

    test("a failed save of the split tells the user but the group is still created", async () => {
      mockApi.patch.mockRejectedValueOnce(new Error("x"));
      await toPercent();
      await press("Create & add 1");
      await waitFor(() => expect(mockAlert).toHaveBeenCalledWith("Group created", expect.stringMatching(/split wasn't saved/), expect.anything()));
    });

    test("switching back to Equally sends no split", async () => {
      await toPercent();
      await press("Split: By percent");
      await press("Option Equally");
      await press("Create & add 1");
      await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith("/groups", expect.anything()));
      expect(mockApi.patch).not.toHaveBeenCalled();
    });
  });
});
