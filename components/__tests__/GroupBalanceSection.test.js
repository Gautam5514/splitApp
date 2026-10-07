// Locks in the settlement-button gating logic behind task #8 ("can't mark
// expense/settlement as paid"). The real bug was `meId` getting stuck at
// null on cold start (missing auth-readiness gate in app/groups/[id].jsx,
// now fixed) - but THIS component is what silently swallowed that bug: when
// meId is null, isDebtor/isCreditor both evaluate false for everyone, so the
// UI falls through to "Only the people involved can record this settlement"
// even for the two people who very much are involved. These tests pin that
// behavior down from both directions.
//
// Note: @testing-library/react-native v14's `render()` is async (it awaits
// an internal `act()` around the initial render), so every call site here
// must `await render(...)` - omitting it throws "`render` function has not
// been called" the moment `screen.getByText` runs before render finishes.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";
import GroupBalanceSection from "../GroupBalanceSection";

// RTL v14 doesn't auto-unmount between tests here (no jest setup file wires
// its cleanup into afterEach), so a previous test's tree can still be
// present/queryable when the next one runs - do it explicitly.
afterEach(async () => {
  await cleanup();
});

jest.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      card: "#fff", border: "#eee", primary: "#4f46e5", textSecondary: "#666",
      success: "#16a34a", error: "#dc2626", warning: "#f59e0b",
      inputBackground: "#f5f5f5", successLight: "#dcfce7", text: "#111",
    },
  }),
}));

// Capture Alert.alert calls so a test can inspect the confirmation prompt and
// invoke a chosen button's onPress (there's no real OS dialog under Jest).
const mockAlert = jest.fn();
jest.mock("@/lib/alert", () => ({
  Alert: { alert: (...args) => mockAlert(...args), dismiss: jest.fn() },
}));

// Spy on the UPI deep-link redirect. The component imports { Linking } from
// "react-native", so spy on that same object the component resolves.
const mockOpenURL = jest.fn(() => Promise.resolve());

beforeEach(() => {
  mockAlert.mockClear();
  mockOpenURL.mockClear();
  jest.spyOn(Linking, "openURL").mockImplementation((...args) => mockOpenURL(...args));
});

afterAll(() => {
  jest.restoreAllMocks();
});

const DEBTOR = { userId: "debtor-1", name: "Debtor" };
const CREDITOR = { userId: "creditor-1", name: "Creditor" };

const baseBalances = {
  balances: [
    { userId: "debtor-1", name: "Debtor", balance: "-500" },
    { userId: "creditor-1", name: "Creditor", balance: "500" },
  ],
  suggestions: [{ from: DEBTOR, to: CREDITOR, amount: 500 }],
};

const noop = () => {};

describe("GroupBalanceSection - settlement button gating", () => {
  test("the debtor sees 'I've Paid', not the creditor's button", async () => {
    await render(
      <GroupBalanceSection
        balances={baseBalances}
        pendingSettlements={[]}
        meId="debtor-1"
        onRequestSettlement={noop}
        onConfirmSettlement={noop}
        onRejectSettlement={noop}
        onCancelSettlement={noop}
      />
    );
    expect(screen.getByText("I've Paid ₹500")).toBeTruthy();
    expect(screen.queryByText("Mark ₹500 as Received")).toBeNull();
  });

  test("the creditor sees 'Mark as Received', not the debtor's button", async () => {
    await render(
      <GroupBalanceSection
        balances={baseBalances}
        pendingSettlements={[]}
        meId="creditor-1"
        onRequestSettlement={noop}
        onConfirmSettlement={noop}
        onRejectSettlement={noop}
        onCancelSettlement={noop}
      />
    );
    expect(screen.getByText("Mark ₹500 as Received")).toBeTruthy();
    expect(screen.queryByText("I've Paid ₹500")).toBeNull();
  });

  test("a third party sees neither action - just the disclaimer", async () => {
    await render(
      <GroupBalanceSection
        balances={baseBalances}
        pendingSettlements={[]}
        meId="some-other-member"
        onRequestSettlement={noop}
        onConfirmSettlement={noop}
        onRejectSettlement={noop}
        onCancelSettlement={noop}
      />
    );
    expect(screen.getByText("Only the people involved can record this settlement")).toBeTruthy();
    expect(screen.queryByText("I've Paid ₹500")).toBeNull();
    expect(screen.queryByText("Mark ₹500 as Received")).toBeNull();
  });

  test("REGRESSION (task #8): meId stuck at null hides the button from the actual debtor too", async () => {
    // This is exactly the bug: before the auth-gating fix in
    // app/groups/[id].jsx, `meId` could still be null when this component
    // rendered, even for the person who legitimately owes the money.
    await render(
      <GroupBalanceSection
        balances={baseBalances}
        pendingSettlements={[]}
        meId={null}
        onRequestSettlement={noop}
        onConfirmSettlement={noop}
        onRejectSettlement={noop}
        onCancelSettlement={noop}
      />
    );
    expect(screen.getByText("Only the people involved can record this settlement")).toBeTruthy();
    expect(screen.queryByText("I've Paid ₹500")).toBeNull();
  });

  test("clicking 'I've Paid' opens the method form and submits with the chosen method + note", async () => {
    const onRequestSettlement = jest.fn(async () => {});
    await render(
      <GroupBalanceSection
        balances={baseBalances}
        pendingSettlements={[]}
        meId="debtor-1"
        onRequestSettlement={onRequestSettlement}
        onConfirmSettlement={noop}
        onRejectSettlement={noop}
        onCancelSettlement={noop}
      />
    );

    // Each interaction below triggers a state update (activeForm/method/note);
    // wrapping every one in `act` ensures it's fully flushed before the next
    // line reads the resulting DOM/state - needed under RTL v14 + React 19's
    // async act semantics, where a bare `fireEvent.press` isn't guaranteed to
    // have committed by the very next synchronous line.
    await act(() => { fireEvent.press(screen.getByText("I've Paid ₹500")); });
    await act(() => { fireEvent.press(screen.getByText("Online")); });
    await act(() => {
      fireEvent.changeText(screen.getByPlaceholderText("Add a note (optional) — e.g. UPI ref no."), "UPI ref 123");
    });
    await act(() => { fireEvent.press(screen.getByText("Send Request")); });

    expect(onRequestSettlement).toHaveBeenCalledWith(DEBTOR, CREDITOR, 500, "online", "UPI ref 123");
  });

  test("when no onRequestSettlement handler is passed, no action buttons render at all", async () => {
    await render(
      <GroupBalanceSection
        balances={baseBalances}
        pendingSettlements={[]}
        meId="debtor-1"
      />
    );
    expect(screen.queryByText("I've Paid ₹500")).toBeNull();
    expect(screen.getByText("Suggestion #1")).toBeTruthy();
  });
});

describe("GroupBalanceSection - pending settlement row", () => {
  const pending = {
    _id: "req-1",
    fromUserId: { _id: "debtor-1", name: "Debtor" },
    toUserId: { _id: "creditor-1", name: "Creditor" },
    initiatedBy: { _id: "debtor-1", name: "Debtor" },
    amount: 500,
    method: "cash",
    note: "",
    status: "pending",
  };

  test("the initiator sees a 'waiting' message and can cancel - no confirm/reject shown to them", async () => {
    const onCancel = jest.fn();
    await render(
      <GroupBalanceSection
        balances={baseBalances}
        pendingSettlements={[pending]}
        meId="debtor-1"
        onRequestSettlement={noop}
        onConfirmSettlement={noop}
        onRejectSettlement={noop}
        onCancelSettlement={onCancel}
      />
    );
    expect(screen.getByText("Waiting for Creditor to confirm")).toBeTruthy();
    await act(() => { fireEvent.press(screen.getByText("Cancel Request")); });
    expect(onCancel).toHaveBeenCalledWith("req-1");
  });

  test("the counterparty sees confirm/reject, not the waiting message", async () => {
    const onConfirm = jest.fn();
    const onReject = jest.fn();
    await render(
      <GroupBalanceSection
        balances={baseBalances}
        pendingSettlements={[pending]}
        meId="creditor-1"
        onRequestSettlement={noop}
        onConfirmSettlement={onConfirm}
        onRejectSettlement={onReject}
        onCancelSettlement={noop}
      />
    );
    expect(screen.queryByText("Waiting for Creditor to confirm")).toBeNull();
    await act(() => { fireEvent.press(screen.getByText("Yes, Confirm")); });
    expect(onConfirm).toHaveBeenCalledWith("req-1");

    await act(() => { fireEvent.press(screen.getByText("Not Yet")); });
    expect(onReject).toHaveBeenCalledWith("req-1");
  });
});

describe("GroupBalanceSection - orphaned pending (no matching suggestion)", () => {
  // The core robustness bug: the greedy debt-minimizer reroutes debt, so a
  // real A->B request can have NO A->B suggestion. The pending request must
  // still render as a standalone, confirmable row - otherwise it's invisible
  // and the debt gets stuck.
  const orphanPending = {
    _id: "req-orphan",
    fromUserId: { _id: "debtor-1", name: "Debtor" },
    toUserId: { _id: "creditor-1", name: "Creditor" },
    initiatedBy: { _id: "debtor-1", name: "Debtor" },
    amount: 500,
    method: "cash",
    note: "",
    status: "pending",
    toUpi: { upiId: null, upiQrUrl: null },
  };

  // Suggestions route debtor-1's debt to a THIRD party, not creditor-1 - so
  // findPendingFor() finds no match and the request would be orphaned.
  const reroutedBalances = {
    balances: [
      { userId: "debtor-1", name: "Debtor", balance: "-500" },
      { userId: "creditor-1", name: "Creditor", balance: "500" },
    ],
    suggestions: [{ from: { userId: "debtor-1", name: "Debtor" }, to: { userId: "third-party", name: "Carol" }, amount: 500 }],
  };

  test("the counterparty can still confirm an orphaned pending request", async () => {
    const onConfirm = jest.fn();
    await render(
      <GroupBalanceSection
        balances={reroutedBalances}
        pendingSettlements={[orphanPending]}
        meId="creditor-1"
        onRequestSettlement={noop}
        onConfirmSettlement={onConfirm}
        onRejectSettlement={noop}
        onCancelSettlement={noop}
      />
    );
    // The standalone "Pending Settlements" section renders it.
    expect(screen.getByText("Pending Settlements")).toBeTruthy();
    await act(() => { fireEvent.press(screen.getByText("Yes, Confirm")); });
    expect(onConfirm).toHaveBeenCalledWith("req-orphan");
  });

  test("the initiator can still cancel an orphaned pending request", async () => {
    const onCancel = jest.fn();
    await render(
      <GroupBalanceSection
        balances={reroutedBalances}
        pendingSettlements={[orphanPending]}
        meId="debtor-1"
        onRequestSettlement={noop}
        onConfirmSettlement={noop}
        onRejectSettlement={noop}
        onCancelSettlement={onCancel}
      />
    );
    expect(screen.getByText("Waiting for Creditor to confirm")).toBeTruthy();
    await act(() => { fireEvent.press(screen.getByText("Cancel Request")); });
    expect(onCancel).toHaveBeenCalledWith("req-orphan");
  });

  test("a non-party does NOT see someone else's orphaned pending request", async () => {
    await render(
      <GroupBalanceSection
        balances={reroutedBalances}
        pendingSettlements={[orphanPending]}
        meId="unrelated-user"
        onRequestSettlement={noop}
        onConfirmSettlement={noop}
        onRejectSettlement={noop}
        onCancelSettlement={noop}
      />
    );
    expect(screen.queryByText("Pending Settlements")).toBeNull();
  });
});

describe("GroupBalanceSection - UPI pay (confirm → redirect with autofill)", () => {
  // Creditor has a direct UPI ID, so the debtor's "Pay" button should go
  // straight through: tap → "are you sure?" confirm → redirect to the UPI app
  // with the amount + description pre-filled. Balance is NOT touched.
  const upiBalances = {
    balances: [
      { userId: "debtor-1", name: "Debtor", balance: "-500" },
      { userId: "creditor-1", name: "Creditor", balance: "500" },
    ],
    suggestions: [{
      from: DEBTOR,
      to: { userId: "creditor-1", name: "Creditor", upiId: "creditor@okaxis", upiQrUrl: null },
      amount: 500,
    }],
  };

  test("tapping Pay asks for confirmation first and does NOT redirect until confirmed", async () => {
    await render(
      <GroupBalanceSection
        balances={upiBalances}
        pendingSettlements={[]}
        meId="debtor-1"
        currency="INR"
        groupName="Goa Trip"
        onRequestSettlement={noop}
        onConfirmSettlement={noop}
        onRejectSettlement={noop}
        onCancelSettlement={noop}
      />
    );

    await act(() => { fireEvent.press(screen.getByText("Pay ₹500 to Creditor")); });

    // Confirmation prompt shown, no redirect yet.
    expect(mockAlert).toHaveBeenCalledTimes(1);
    expect(mockOpenURL).not.toHaveBeenCalled();
    const [title, message, buttons] = mockAlert.mock.calls[0];
    expect(title).toMatch(/pay/i);
    expect(message).toMatch(/₹500/);
    expect(message).toMatch(/Creditor/);
    expect(buttons.some((b) => b.style === "cancel")).toBe(true);
  });

  test("confirming redirects to upi:// with the amount AND description auto-filled", async () => {
    await render(
      <GroupBalanceSection
        balances={upiBalances}
        pendingSettlements={[]}
        meId="debtor-1"
        currency="INR"
        groupName="Goa Trip"
        onRequestSettlement={noop}
        onConfirmSettlement={noop}
        onRejectSettlement={noop}
        onCancelSettlement={noop}
      />
    );

    await act(() => { fireEvent.press(screen.getByText("Pay ₹500 to Creditor")); });

    // Invoke the "Yes, Pay" button's onPress (the user confirming).
    const buttons = mockAlert.mock.calls[0][2];
    const confirmBtn = buttons.find((b) => /pay/i.test(b.text) && b.style !== "cancel");
    expect(confirmBtn).toBeDefined();
    await act(() => { confirmBtn.onPress(); });

    expect(mockOpenURL).toHaveBeenCalledTimes(1);
    const url = mockOpenURL.mock.calls[0][0];
    expect(url).toMatch(/^upi:\/\/pay\?/);
    expect(url).toContain("pa=creditor%40okaxis");   // payee VPA
    expect(url).toContain("am=500.00");               // amount autofilled
    expect(url).toContain("cu=INR");
    expect(url).toMatch(/tn=.*Goa/);                  // description autofilled
  });

  test("paying does NOT settle the balance (no onRequestSettlement call)", async () => {
    const onRequestSettlement = jest.fn(async () => {});
    await render(
      <GroupBalanceSection
        balances={upiBalances}
        pendingSettlements={[]}
        meId="debtor-1"
        currency="INR"
        groupName="Goa Trip"
        onRequestSettlement={onRequestSettlement}
        onConfirmSettlement={noop}
        onRejectSettlement={noop}
        onCancelSettlement={noop}
      />
    );

    await act(() => { fireEvent.press(screen.getByText("Pay ₹500 to Creditor")); });
    const confirmBtn = mockAlert.mock.calls[0][2].find((b) => /pay/i.test(b.text) && b.style !== "cancel");
    await act(() => { confirmBtn.onPress(); });

    // Redirected, but the settlement request is only filed later via "I've Paid".
    expect(mockOpenURL).toHaveBeenCalled();
    expect(onRequestSettlement).not.toHaveBeenCalled();
  });
});
