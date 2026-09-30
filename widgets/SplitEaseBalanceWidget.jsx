import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";

/**
 * SplitEase home-screen widgets.
 *
 * One native widget slot ("SplitEaseBalance") renders one of several DESIGNS
 * the user can pick from. Every design can show the live balance and/or a
 * user-defined custom amount + label (e.g. "₹50,000 · Vacation fund").
 *
 * data   = { totalOwe, totalOwed, updatedAt }  (synced from the app)
 * custom = { amount, label, style, showBalance } (user preferences)
 */

const formatMoney = (value) => {
  const amount = Math.round(Number(value) || 0);
  return `₹${amount.toLocaleString("en-IN")}`;
};

// A design id → human label map, reused by the customization screen.
export const WIDGET_STYLES = [
  { id: "balance", label: "Net Balance" },
  { id: "gradient", label: "Gradient Hero" },
  { id: "minimal", label: "Minimal Amount" },
  { id: "goal", label: "Goal Card" },
  { id: "split", label: "Split Summary" },
];

const palette = (dark) =>
  dark
    ? { bg: "#090D18", panel: "#131927", text: "#F8FAFC", muted: "#94A3B8", line: "#283244" }
    : { bg: "#F8FAFC", panel: "#FFFFFF", text: "#0F172A", muted: "#64748B", line: "#E2E8F0" };

const GREEN = "#10B981";
const RED = "#F43F5E";

const shell = (c, extra = {}) => ({
  width: "match_parent",
  height: "match_parent",
  flexDirection: "column",
  backgroundColor: c.bg,
  borderRadius: 24,
  borderWidth: 1,
  borderColor: c.line,
  padding: 16,
  ...extra,
});

const Brand = ({ c, tag = "Tap to open  ›" }) => (
  <FlexWidget style={{ width: "match_parent", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
    <FlexWidget style={{ flexDirection: "row", alignItems: "center", flexGap: 8 }}>
      <FlexWidget style={{ width: 28, height: 28, borderRadius: 9, backgroundGradient: { from: "#22D3EE", to: "#6366F1", orientation: "TL_BR" }, alignItems: "center", justifyContent: "center" }}>
        <TextWidget text="S" style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "bold" }} />
      </FlexWidget>
      <TextWidget text="SplitEase" style={{ color: c.text, fontSize: 15, fontWeight: "bold" }} />
    </FlexWidget>
    <TextWidget text={tag} style={{ color: "#0891B2", fontSize: 10, fontWeight: "bold" }} />
  </FlexWidget>
);

/* ── 1. Net Balance (the original refined) ──────────────────────────────── */
function BalanceDesign({ c, data }) {
  const net = Number(data?.totalOwed || 0) - Number(data?.totalOwe || 0);
  const netColor = net >= 0 ? GREEN : RED;
  return (
    <FlexWidget clickAction="OPEN_APP" style={shell(c, { justifyContent: "space-between" })}>
      <Brand c={c} />
      <FlexWidget style={{ width: "match_parent", flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
        <FlexWidget style={{ flexDirection: "column" }}>
          <TextWidget text="YOUR NET BALANCE" style={{ color: c.muted, fontSize: 9, fontWeight: "bold", letterSpacing: 1 }} />
          <TextWidget text={`${net >= 0 ? "+" : "−"}${formatMoney(Math.abs(net))}`} style={{ color: netColor, fontSize: 25, fontWeight: "bold", marginTop: 2 }} />
        </FlexWidget>
        <FlexWidget style={{ flexDirection: "row", flexGap: 7 }}>
          <FlexWidget style={{ minWidth: 78, backgroundColor: c.panel, borderRadius: 12, borderWidth: 1, borderColor: c.line, paddingHorizontal: 10, paddingVertical: 7 }}>
            <TextWidget text="TO PAY" style={{ color: c.muted, fontSize: 8, fontWeight: "bold" }} />
            <TextWidget text={formatMoney(data?.totalOwe)} style={{ color: RED, fontSize: 13, fontWeight: "bold", marginTop: 1 }} />
          </FlexWidget>
          <FlexWidget style={{ minWidth: 78, backgroundColor: c.panel, borderRadius: 12, borderWidth: 1, borderColor: c.line, paddingHorizontal: 10, paddingVertical: 7 }}>
            <TextWidget text="TO RECEIVE" style={{ color: c.muted, fontSize: 8, fontWeight: "bold" }} />
            <TextWidget text={formatMoney(data?.totalOwed)} style={{ color: GREEN, fontSize: 13, fontWeight: "bold", marginTop: 1 }} />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

/* ── 2. Gradient Hero — big custom amount on a vivid gradient ────────────── */
function GradientDesign({ custom, data, showBalance }) {
  const amount = custom?.amount != null && custom?.amount !== "" ? Number(custom.amount) : (Number(data?.totalOwed || 0) - Number(data?.totalOwe || 0));
  const label = custom?.label || "Net balance";
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        width: "match_parent", height: "match_parent", flexDirection: "column", justifyContent: "space-between",
        borderRadius: 24, padding: 18,
        backgroundGradient: { from: "#6366F1", to: "#22D3EE", orientation: "TL_BR" },
      }}
    >
      <FlexWidget style={{ width: "match_parent", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <TextWidget text="SplitEase" style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "bold" }} />
        <TextWidget text="Tap ›" style={{ color: "#E0F2FE", fontSize: 11, fontWeight: "bold" }} />
      </FlexWidget>
      <FlexWidget style={{ flexDirection: "column" }}>
        <TextWidget text={label.toUpperCase()} style={{ color: "#E0E7FF", fontSize: 10, fontWeight: "bold", letterSpacing: 1 }} />
        <TextWidget text={formatMoney(amount)} style={{ color: "#FFFFFF", fontSize: 30, fontWeight: "bold", marginTop: 2 }} />
        {showBalance ? (
          <TextWidget text={`Owe ${formatMoney(data?.totalOwe)}  ·  Owed ${formatMoney(data?.totalOwed)}`} style={{ color: "#E0F2FE", fontSize: 11, fontWeight: "bold", marginTop: 6 }} />
        ) : null}
      </FlexWidget>
    </FlexWidget>
  );
}

/* ── 3. Minimal Amount — clean single figure + small label ───────────────── */
function MinimalDesign({ c, custom, data }) {
  const amount = custom?.amount != null && custom?.amount !== "" ? Number(custom.amount) : (Number(data?.totalOwed || 0) - Number(data?.totalOwe || 0));
  const label = custom?.label || "Net balance";
  return (
    <FlexWidget clickAction="OPEN_APP" style={shell(c, { justifyContent: "center", alignItems: "center" })}>
      <TextWidget text={label.toUpperCase()} style={{ color: c.muted, fontSize: 10, fontWeight: "bold", letterSpacing: 1.5 }} />
      <TextWidget text={formatMoney(amount)} style={{ color: c.text, fontSize: 34, fontWeight: "bold", marginTop: 4 }} />
      <FlexWidget style={{ marginTop: 8, backgroundColor: c.panel, borderRadius: 999, borderWidth: 1, borderColor: c.line, paddingHorizontal: 12, paddingVertical: 5 }}>
        <TextWidget text="SplitEase  ·  Tap to open" style={{ color: "#0891B2", fontSize: 10, fontWeight: "bold" }} />
      </FlexWidget>
    </FlexWidget>
  );
}

/* ── 4. Goal Card — custom amount as a target with progress bar ──────────── */
function GoalDesign({ c, custom, data }) {
  const target = custom?.amount != null && custom?.amount !== "" ? Number(custom.amount) : 10000;
  const saved = Math.max(0, Number(data?.totalOwed || 0) - Number(data?.totalOwe || 0));
  const pct = target > 0 ? Math.max(0, Math.min(100, Math.round((saved / target) * 100))) : 0;
  const label = custom?.label || "Savings goal";
  return (
    <FlexWidget clickAction="OPEN_APP" style={shell(c, { justifyContent: "space-between" })}>
      <Brand c={c} tag={`${pct}%`} />
      <FlexWidget style={{ flexDirection: "column" }}>
        <TextWidget text={label.toUpperCase()} style={{ color: c.muted, fontSize: 9, fontWeight: "bold", letterSpacing: 1 }} />
        <FlexWidget style={{ flexDirection: "row", alignItems: "flex-end", flexGap: 6 }}>
          <TextWidget text={formatMoney(saved)} style={{ color: c.text, fontSize: 22, fontWeight: "bold" }} />
          <TextWidget text={`/ ${formatMoney(target)}`} style={{ color: c.muted, fontSize: 12, fontWeight: "bold", marginBottom: 3 }} />
        </FlexWidget>
        {/* Progress track */}
        <FlexWidget style={{ width: "match_parent", height: 10, borderRadius: 999, backgroundColor: c.panel, borderWidth: 1, borderColor: c.line, marginTop: 8, flexDirection: "row" }}>
          <FlexWidget style={{ width: `${pct}%`, height: "match_parent", borderRadius: 999, backgroundGradient: { from: "#22D3EE", to: "#6366F1", orientation: "LEFT_RIGHT" } }} />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

/* ── 5. Split Summary — custom text note + two balance chips ─────────────── */
function SplitDesign({ c, custom, data }) {
  const note = custom?.label || "Shared expenses";
  return (
    <FlexWidget clickAction="OPEN_APP" style={shell(c, { justifyContent: "space-between" })}>
      <Brand c={c} />
      <FlexWidget style={{ flexDirection: "column", flexGap: 6 }}>
        <TextWidget text={note} style={{ color: c.text, fontSize: 13, fontWeight: "bold" }} />
        <FlexWidget style={{ width: "match_parent", flexDirection: "row", flexGap: 8 }}>
          <FlexWidget style={{ flex: 1, backgroundColor: c.panel, borderRadius: 14, borderWidth: 1, borderColor: c.line, paddingHorizontal: 12, paddingVertical: 9 }}>
            <TextWidget text="YOU OWE" style={{ color: c.muted, fontSize: 8, fontWeight: "bold", letterSpacing: 0.5 }} />
            <TextWidget text={formatMoney(data?.totalOwe)} style={{ color: RED, fontSize: 16, fontWeight: "bold", marginTop: 2 }} />
          </FlexWidget>
          <FlexWidget style={{ flex: 1, backgroundColor: c.panel, borderRadius: 14, borderWidth: 1, borderColor: c.line, paddingHorizontal: 12, paddingVertical: 9 }}>
            <TextWidget text="YOU'RE OWED" style={{ color: c.muted, fontSize: 8, fontWeight: "bold", letterSpacing: 0.5 }} />
            <TextWidget text={formatMoney(data?.totalOwed)} style={{ color: GREEN, fontSize: 16, fontWeight: "bold", marginTop: 2 }} />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

function SplitEaseWidget({ data = {}, custom = {}, dark = false }) {
  const c = palette(dark);
  const style = custom?.style || "balance";
  const showBalance = custom?.showBalance !== false;
  switch (style) {
    case "gradient": return <GradientDesign custom={custom} data={data} showBalance={showBalance} />;
    case "minimal": return <MinimalDesign c={c} custom={custom} data={data} />;
    case "goal": return <GoalDesign c={c} custom={custom} data={data} />;
    case "split": return <SplitDesign c={c} custom={custom} data={data} />;
    case "balance":
    default: return <BalanceDesign c={c} data={data} />;
  }
}

export function renderSplitEaseBalanceWidget(data = {}, custom = {}) {
  return {
    light: <SplitEaseWidget data={data} custom={custom} />,
    dark: <SplitEaseWidget data={data} custom={custom} dark />,
  };
}
