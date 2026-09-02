import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";

const formatMoney = (value) => {
  const amount = Math.round(Number(value) || 0);
  return `₹${amount.toLocaleString("en-IN")}`;
};

function BalanceWidget({ data, dark = false }) {
  const colors = dark
    ? { bg: "#090D18", panel: "#131927", text: "#F8FAFC", muted: "#94A3B8", line: "#283244" }
    : { bg: "#F8FAFC", panel: "#FFFFFF", text: "#0F172A", muted: "#64748B", line: "#E2E8F0" };
  const net = Number(data?.totalOwed || 0) - Number(data?.totalOwe || 0);
  const netColor = net >= 0 ? "#10B981" : "#F43F5E";

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        width: "match_parent",
        height: "match_parent",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: colors.bg,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.line,
        padding: 16,
      }}
    >
      <FlexWidget style={{ width: "match_parent", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <FlexWidget style={{ flexDirection: "row", alignItems: "center", flexGap: 8 }}>
          <FlexWidget style={{ width: 28, height: 28, borderRadius: 9, backgroundGradient: { from: "#22D3EE", to: "#6366F1", orientation: "TL_BR" }, alignItems: "center", justifyContent: "center" }}>
            <TextWidget text="S" style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "bold" }} />
          </FlexWidget>
          <TextWidget text="SplitEase" style={{ color: colors.text, fontSize: 15, fontWeight: "bold" }} />
        </FlexWidget>
        <TextWidget text="Tap to open  ›" style={{ color: "#0891B2", fontSize: 10, fontWeight: "bold" }} />
      </FlexWidget>

      <FlexWidget style={{ width: "match_parent", flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
        <FlexWidget style={{ flexDirection: "column" }}>
          <TextWidget text="YOUR NET BALANCE" style={{ color: colors.muted, fontSize: 9, fontWeight: "bold", letterSpacing: 1 }} />
          <TextWidget text={`${net >= 0 ? "+" : "−"}${formatMoney(Math.abs(net))}`} style={{ color: netColor, fontSize: 25, fontWeight: "bold", marginTop: 2 }} />
        </FlexWidget>

        <FlexWidget style={{ flexDirection: "row", flexGap: 7 }}>
          <FlexWidget style={{ minWidth: 78, backgroundColor: colors.panel, borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 10, paddingVertical: 7 }}>
            <TextWidget text="TO PAY" style={{ color: colors.muted, fontSize: 8, fontWeight: "bold" }} />
            <TextWidget text={formatMoney(data?.totalOwe)} style={{ color: "#F43F5E", fontSize: 13, fontWeight: "bold", marginTop: 1 }} />
          </FlexWidget>
          <FlexWidget style={{ minWidth: 78, backgroundColor: colors.panel, borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 10, paddingVertical: 7 }}>
            <TextWidget text="TO RECEIVE" style={{ color: colors.muted, fontSize: 8, fontWeight: "bold" }} />
            <TextWidget text={formatMoney(data?.totalOwed)} style={{ color: "#10B981", fontSize: 13, fontWeight: "bold", marginTop: 1 }} />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

export function renderSplitEaseBalanceWidget(data = {}) {
  return {
    light: <BalanceWidget data={data} />,
    dark: <BalanceWidget data={data} dark />,
  };
}
