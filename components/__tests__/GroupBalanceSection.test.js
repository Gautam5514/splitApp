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
