import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";

/*
 * SplitEase home-screen widget.
 *
 * One native widget slot ("SplitEaseBalance") renders one of several designs the
 * user picks in the app. Every design adapts to the size the user gives it:
 *   small   (< 2 rows tall)         : the headline number only
 *   medium  (2 rows)                : headline + the two chips
 *   large   (3+ rows, wide enough)  : + people to settle with + quick actions
 * Every tap goes somewhere useful: the app, a person's group, Autopilot with a
 * draft, or an in-place refresh.
 *
 * data   = normalised payload of GET /balances/widget (see widgetData.js)
 * custom = { style, amount, label, showBalance, showPeople, quickActions }
 * size   = { width, height } in dp, from the launcher
 */

export const formatMoney = (value) => {
  const amount = Math.round(Math.abs(Number(value) || 0));
  return `₹${amount.toLocaleString("en-IN")}`;
};
export const signedMoney = (value) => `${Number(value) < -0.5 ? "-" : Number(value) > 0.5 ? "+" : ""}${formatMoney(value)}`;
export const firstName = (name) => String(name || "").trim().split(/\s+/)[0] || "Someone";
export const timeAgo = (ts, now = Date.now()) => {
  const mins = Math.max(0, Math.round((now - Number(ts || now)) / 60_000));
  if (mins < 1) return "Updated just now";
  if (mins < 60) return `Updated ${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Updated ${hours} h ago`;
  return `Updated ${Math.round(hours / 24)} d ago`;
};

// A design id -> human label map, reused by the customisation screen.
export const WIDGET_STYLES = [
  { id: "balance", label: "Net balance", hint: "Net figure, to pay and to receive, people to settle with" },
  { id: "people", label: "Settle up", hint: "Who owes whom, largest first, one tap to the group" },
  { id: "month", label: "This month", hint: "What you spent this month and the latest bill" },
  { id: "gradient", label: "Gradient hero", hint: "Big number on a gradient, your own amount and label" },
  { id: "minimal", label: "Minimal", hint: "One clean figure with a short label" },
  { id: "goal", label: "Goal card", hint: "Your amount as a target with a progress bar" },
];

// Cell sizes come from the launcher as dp; the widget is 4x2 by default (about 250x110 dp).
export const layoutFor = (size = {}) => {
  const w = Number(size.width) || 250, h = Number(size.height) || 110;
  if (h < 90) return "small";
  if (h >= 180 && w >= 220) return "large";
  return "medium";
};

const palette = (dark) =>
  dark
    ? { bg: "#0B0F1A", panel: "#151B2B", text: "#F8FAFC", muted: "#94A3B8", line: "#263044", accent: "#22D3EE" }
    : { bg: "#FFFFFF", panel: "#F1F5F9", text: "#0F172A", muted: "#64748B", line: "#E2E8F0", accent: "#0891B2" };

const GREEN = "#10B981";
const RED = "#F43F5E";
const APP = "splitapp://";
const uri = (path) => ({ uri: `${APP}${path.replace(/^\//, "")}` });

const shell = (c, extra = {}) => ({
  width: "match_parent", height: "match_parent", flexDirection: "column",
  backgroundColor: c.bg, borderRadius: 24, borderWidth: 1, borderColor: c.line, padding: 14, ...extra,
});

const Brand = ({ c, right = null, light = false }) => (
  <FlexWidget style={{ width: "match_parent", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
    <FlexWidget clickAction="OPEN_APP" style={{ flexDirection: "row", alignItems: "center", flexGap: 7 }}>
      <FlexWidget style={{ width: 22, height: 22, borderRadius: 7, backgroundGradient: { from: "#22D3EE", to: "#6366F1", orientation: "TL_BR" }, alignItems: "center", justifyContent: "center" }}>
        <TextWidget text="S" style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "bold" }} />
      </FlexWidget>
      <TextWidget text="SplitEase" style={{ color: light ? "#FFFFFF" : c.text, fontSize: 13, fontWeight: "bold" }} />
    </FlexWidget>
    {right}
  </FlexWidget>
);

// Tap to refresh in place; the task handler fetches and repaints.
const Refresh = ({ c, data, light = false }) => (
  <FlexWidget clickAction="REFRESH" style={{ flexDirection: "row", alignItems: "center", paddingVertical: 2, paddingHorizontal: 4 }}>
    <TextWidget text={timeAgo(data?.updatedAt)} style={{ color: light ? "#E0F2FE" : c.muted, fontSize: 9, fontWeight: "bold" }} />
  </FlexWidget>
);

const Chip = ({ c, label, value, color, grow = false, click = null }) => (
  <FlexWidget {...(click || {})} style={{ ...(grow ? { flex: 1 } : { minWidth: 86 }), backgroundColor: c.panel, borderRadius: 12, borderWidth: 1, borderColor: c.line, paddingHorizontal: 10, paddingVertical: 6 }}>
    <TextWidget text={label} style={{ color: c.muted, fontSize: 8, fontWeight: "bold", letterSpacing: 0.5 }} />
    <TextWidget text={value} style={{ color, fontSize: 13, fontWeight: "bold", marginTop: 1 }} />
  </FlexWidget>
);

// One line per person, tapping opens the group that balance mostly comes from.
const PersonRow = ({ c, p }) => (
  <FlexWidget clickAction="OPEN_URI" clickActionData={uri(p.groupId ? `/groups/${p.groupId}` : "/")} style={{ width: "match_parent", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 }}>
    <FlexWidget style={{ flexDirection: "row", alignItems: "center", flexGap: 8 }}>
      <FlexWidget style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: p.direction === "owed" ? "#D1FAE5" : "#FFE4E6", alignItems: "center", justifyContent: "center" }}>
        <TextWidget text={firstName(p.name)[0].toUpperCase()} style={{ color: p.direction === "owed" ? "#047857" : "#BE123C", fontSize: 11, fontWeight: "bold" }} />
      </FlexWidget>
      <TextWidget text={p.direction === "owed" ? `${firstName(p.name)} owes you` : `You owe ${firstName(p.name)}`} style={{ color: c.text, fontSize: 12 }} />
    </FlexWidget>
    <TextWidget text={formatMoney(p.amount)} style={{ color: p.direction === "owed" ? GREEN : RED, fontSize: 12, fontWeight: "bold" }} />
  </FlexWidget>
);

const People = ({ c, data, max = 3 }) => {
  const rows = (data?.people || []).slice(0, max);
  if (!rows.length) {
    return <TextWidget text={data?.groups ? "All settled. Nice." : "Make a group to start splitting."} style={{ color: c.muted, fontSize: 11, marginTop: 6 }} />;
  }
  return <FlexWidget style={{ width: "match_parent", flexDirection: "column", marginTop: 4 }}>{rows.map((p) => <PersonRow key={p.userId || p.name} c={c} p={p} />)}</FlexWidget>;
};

const ActionButton = ({ label, path, primary, c }) => (
  <FlexWidget clickAction="OPEN_URI" clickActionData={uri(path)} style={{ flex: 1, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", ...(primary ? { backgroundGradient: { from: "#22D3EE", to: "#6366F1", orientation: "LEFT_RIGHT" } } : { backgroundColor: c.panel, borderWidth: 1, borderColor: c.line }) }}>
    <TextWidget text={label} style={{ color: primary ? "#FFFFFF" : c.text, fontSize: 11, fontWeight: "bold" }} />
  </FlexWidget>
);
const Actions = ({ c }) => (
  <FlexWidget style={{ width: "match_parent", flexDirection: "row", flexGap: 8, marginTop: 8 }}>
    <ActionButton c={c} primary label="Add expense" path="/autopilot?prompt=" />
    <ActionButton c={c} label="Scan bill" path="/quick-split" />
  </FlexWidget>
);

/* 1. Net balance: the default. Headline net, two chips, people and actions when tall. */
function BalanceDesign({ c, data, custom, layout }) {
  const net = Number(data?.net || 0);
  const netColor = net > 0.5 ? GREEN : net < -0.5 ? RED : c.text;
  if (layout === "small") {
    return (
      <FlexWidget clickAction="OPEN_APP" style={shell(c, { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12 })}>
        <FlexWidget style={{ flexDirection: "column" }}>
          <TextWidget text="NET BALANCE" style={{ color: c.muted, fontSize: 8, fontWeight: "bold", letterSpacing: 1 }} />
          <TextWidget text={signedMoney(net)} style={{ color: netColor, fontSize: 22, fontWeight: "bold" }} />
        </FlexWidget>
        <TextWidget text="SplitEase" style={{ color: c.accent, fontSize: 11, fontWeight: "bold" }} />
      </FlexWidget>
    );
  }
  return (
    <FlexWidget clickAction="OPEN_APP" style={shell(c, { justifyContent: "space-between" })}>
      <Brand c={c} right={<Refresh c={c} data={data} />} />
      <FlexWidget style={{ width: "match_parent", flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 6 }}>
        <FlexWidget style={{ flexDirection: "column" }}>
          <TextWidget text="YOUR NET BALANCE" style={{ color: c.muted, fontSize: 9, fontWeight: "bold", letterSpacing: 1 }} />
          <TextWidget text={signedMoney(net)} style={{ color: netColor, fontSize: 26, fontWeight: "bold", marginTop: 1 }} />
        </FlexWidget>
        <FlexWidget style={{ flexDirection: "row", flexGap: 6 }}>
          <Chip c={c} label="TO PAY" value={formatMoney(data?.totalOwe)} color={RED} />
          <Chip c={c} label="TO RECEIVE" value={formatMoney(data?.totalOwed)} color={GREEN} />
        </FlexWidget>
      </FlexWidget>
      {layout === "large" && custom?.showPeople !== false ? <People c={c} data={data} /> : null}
      {layout === "large" && custom?.quickActions !== false ? <Actions c={c} /> : null}
    </FlexWidget>
  );
}

/* 2. Settle up: people first. */
function PeopleDesign({ c, data, custom, layout }) {
  const top = data?.people?.[0];
  if (layout === "small") {
    return (
      <FlexWidget clickAction={top?.groupId ? "OPEN_URI" : "OPEN_APP"} clickActionData={top?.groupId ? uri(`/groups/${top.groupId}`) : undefined} style={shell(c, { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12 })}>
        <TextWidget text={top ? (top.direction === "owed" ? `${firstName(top.name)} owes you` : `You owe ${firstName(top.name)}`) : "All settled"} style={{ color: c.text, fontSize: 13, fontWeight: "bold" }} />
        <TextWidget text={top ? formatMoney(top.amount) : signedMoney(data?.net)} style={{ color: top ? (top.direction === "owed" ? GREEN : RED) : c.muted, fontSize: 18, fontWeight: "bold" }} />
      </FlexWidget>
    );
  }
  return (
    <FlexWidget clickAction="OPEN_APP" style={shell(c, { justifyContent: "flex-start" })}>
      <Brand c={c} right={<Refresh c={c} data={data} />} />
      <FlexWidget style={{ width: "match_parent", flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
        <TextWidget text="SETTLE UP" style={{ color: c.muted, fontSize: 9, fontWeight: "bold", letterSpacing: 1 }} />
        <TextWidget text={`Net ${signedMoney(data?.net)}`} style={{ color: Number(data?.net) >= 0 ? GREEN : RED, fontSize: 11, fontWeight: "bold" }} />
      </FlexWidget>
      <People c={c} data={data} max={layout === "large" ? 5 : 2} />
      {layout === "large" && custom?.quickActions !== false ? <Actions c={c} /> : null}
    </FlexWidget>
  );
}

/* 3. This month: spend so far and the latest bill. */
function MonthDesign({ c, data, custom, layout }) {
  const month = new Date().toLocaleString("en-IN", { month: "long" });
  const spend = data?.month?.spend || 0, count = data?.month?.count || 0;
  if (layout === "small") {
    return (
      <FlexWidget clickAction="OPEN_APP" style={shell(c, { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12 })}>
        <FlexWidget style={{ flexDirection: "column" }}>
          <TextWidget text={`${month.toUpperCase()} SO FAR`} style={{ color: c.muted, fontSize: 8, fontWeight: "bold", letterSpacing: 1 }} />
          <TextWidget text={formatMoney(spend)} style={{ color: c.text, fontSize: 22, fontWeight: "bold" }} />
        </FlexWidget>
        <TextWidget text={`${count} ${count === 1 ? "bill" : "bills"}`} style={{ color: c.accent, fontSize: 11, fontWeight: "bold" }} />
      </FlexWidget>
    );
  }
  return (
    <FlexWidget clickAction="OPEN_APP" style={shell(c, { justifyContent: "space-between" })}>
      <Brand c={c} right={<Refresh c={c} data={data} />} />
      <FlexWidget style={{ width: "match_parent", flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 6 }}>
        <FlexWidget style={{ flexDirection: "column" }}>
          <TextWidget text={`${month.toUpperCase()} · YOUR SHARE`} style={{ color: c.muted, fontSize: 9, fontWeight: "bold", letterSpacing: 1 }} />
          <TextWidget text={formatMoney(spend)} style={{ color: c.text, fontSize: 26, fontWeight: "bold", marginTop: 1 }} />
        </FlexWidget>
        <Chip c={c} label="BILLS" value={String(count)} color={c.text} />
      </FlexWidget>
      {data?.latest ? (
        <FlexWidget clickAction={data.latest.groupId ? "OPEN_URI" : "OPEN_APP"} clickActionData={data.latest.groupId ? uri(`/groups/${data.latest.groupId}`) : undefined} style={{ width: "match_parent", flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: c.panel, borderRadius: 12, borderWidth: 1, borderColor: c.line, paddingHorizontal: 10, paddingVertical: 7, marginTop: 8 }}>
          <TextWidget text={`Latest: ${data.latest.description}${data.latest.group ? ` · ${data.latest.group}` : ""}`} style={{ color: c.text, fontSize: 11 }} truncate="END" maxLines={1} />
          <TextWidget text={formatMoney(data.latest.amount)} style={{ color: c.text, fontSize: 11, fontWeight: "bold" }} />
        </FlexWidget>
      ) : null}
      {layout === "large" && custom?.showPeople !== false ? <People c={c} data={data} max={2} /> : null}
      {layout === "large" && custom?.quickActions !== false ? <Actions c={c} /> : null}
    </FlexWidget>
  );
}

const customAmount = (custom, data) => (custom?.amount != null && custom?.amount !== "" ? Number(custom.amount) : Number(data?.net || 0));

/* 4. Gradient hero: the user's own amount and label, or the net balance. */
function GradientDesign({ c, custom, data, layout }) {
  const amount = customAmount(custom, data);
  const label = custom?.label || "Net balance";
  return (
    <FlexWidget clickAction="OPEN_APP" style={{ width: "match_parent", height: "match_parent", flexDirection: "column", justifyContent: "space-between", borderRadius: 24, padding: layout === "small" ? 12 : 16, backgroundGradient: { from: "#6366F1", to: "#22D3EE", orientation: "TL_BR" } }}>
      {layout !== "small" ? <Brand c={c} light right={<Refresh c={c} data={data} light />} /> : null}
      <FlexWidget style={{ flexDirection: "column" }}>
        <TextWidget text={label.toUpperCase()} style={{ color: "#E0E7FF", fontSize: 9, fontWeight: "bold", letterSpacing: 1 }} />
        <TextWidget text={custom?.amount !== "" && custom?.amount != null ? formatMoney(amount) : signedMoney(amount)} style={{ color: "#FFFFFF", fontSize: layout === "small" ? 22 : 30, fontWeight: "bold", marginTop: 1 }} />
        {custom?.showBalance !== false && layout !== "small" ? (
          <TextWidget text={`To pay ${formatMoney(data?.totalOwe)}  ·  To receive ${formatMoney(data?.totalOwed)}`} style={{ color: "#E0F2FE", fontSize: 10, fontWeight: "bold", marginTop: 5 }} />
        ) : null}
      </FlexWidget>
      {layout === "large" && custom?.quickActions !== false ? (
        <FlexWidget style={{ width: "match_parent", flexDirection: "row", flexGap: 8, marginTop: 8 }}>
          <FlexWidget clickAction="OPEN_URI" clickActionData={uri("/autopilot?prompt=")} style={{ flex: 1, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" }}>
            <TextWidget text="Add expense" style={{ color: "#4338CA", fontSize: 11, fontWeight: "bold" }} />
          </FlexWidget>
          <FlexWidget clickAction="OPEN_URI" clickActionData={uri("/quick-split")} style={{ flex: 1, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FFFFFF" }}>
            <TextWidget text="Scan bill" style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "bold" }} />
          </FlexWidget>
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}

/* 5. Minimal: one figure. */
function MinimalDesign({ c, custom, data, layout }) {
  const amount = customAmount(custom, data);
  const label = custom?.label || "Net balance";
  return (
    <FlexWidget clickAction="OPEN_APP" style={shell(c, { justifyContent: "center", alignItems: "center" })}>
      <TextWidget text={label.toUpperCase()} style={{ color: c.muted, fontSize: 10, fontWeight: "bold", letterSpacing: 1.5 }} />
      <TextWidget text={custom?.amount !== "" && custom?.amount != null ? formatMoney(amount) : signedMoney(amount)} style={{ color: c.text, fontSize: layout === "small" ? 24 : 34, fontWeight: "bold", marginTop: 2 }} />
      {layout !== "small" ? (
        <FlexWidget clickAction="REFRESH" style={{ marginTop: 8, backgroundColor: c.panel, borderRadius: 999, borderWidth: 1, borderColor: c.line, paddingHorizontal: 12, paddingVertical: 5 }}>
          <TextWidget text={`SplitEase  ·  ${timeAgo(data?.updatedAt)}`} style={{ color: c.accent, fontSize: 10, fontWeight: "bold" }} />
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}

/* 6. Goal card: the user's amount as a target with progress. */
function GoalDesign({ c, custom, data, layout }) {
  const target = custom?.amount != null && custom?.amount !== "" ? Number(custom.amount) : 10000;
  const saved = Math.max(0, Number(data?.net || 0));
  const pct = target > 0 ? Math.max(0, Math.min(100, Math.round((saved / target) * 100))) : 0;
  const label = custom?.label || "Savings goal";
  return (
    <FlexWidget clickAction="OPEN_APP" style={shell(c, { justifyContent: "space-between" })}>
      {layout !== "small" ? <Brand c={c} right={<TextWidget text={`${pct}%`} style={{ color: c.accent, fontSize: 11, fontWeight: "bold" }} />} /> : null}
      <FlexWidget style={{ flexDirection: "column" }}>
        <TextWidget text={label.toUpperCase()} style={{ color: c.muted, fontSize: 9, fontWeight: "bold", letterSpacing: 1 }} />
        <FlexWidget style={{ flexDirection: "row", alignItems: "flex-end", flexGap: 6 }}>
          <TextWidget text={formatMoney(saved)} style={{ color: c.text, fontSize: layout === "small" ? 18 : 22, fontWeight: "bold" }} />
          <TextWidget text={`/ ${formatMoney(target)}`} style={{ color: c.muted, fontSize: 11, fontWeight: "bold", marginBottom: 3 }} />
        </FlexWidget>
        <FlexWidget style={{ width: "match_parent", height: 10, borderRadius: 999, backgroundColor: c.panel, borderWidth: 1, borderColor: c.line, marginTop: 6, flexDirection: "row" }}>
          <FlexWidget style={{ width: `${Math.max(pct, 2)}%`, height: "match_parent", borderRadius: 999, backgroundGradient: { from: "#22D3EE", to: "#6366F1", orientation: "LEFT_RIGHT" } }} />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

function SplitEaseWidget({ data = {}, custom = {}, size = {}, dark = false }) {
  const c = palette(dark);
  const layout = layoutFor(size);
  const props = { c, data, custom, layout };
  switch (custom?.style) {
    case "people": return <PeopleDesign {...props} />;
    case "month": return <MonthDesign {...props} />;
    case "gradient": return <GradientDesign {...props} />;
    case "minimal": return <MinimalDesign {...props} />;
    case "goal": return <GoalDesign {...props} />;
    case "split": // older saved preference
    case "balance":
    default: return <BalanceDesign {...props} />;
  }
}

export function renderSplitEaseBalanceWidget(data = {}, custom = {}, size = {}) {
  return {
    light: <SplitEaseWidget data={data} custom={custom} size={size} />,
    dark: <SplitEaseWidget data={data} custom={custom} size={size} dark />,
  };
}
