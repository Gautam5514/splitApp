import AsyncStorage from "@react-native-async-storage/async-storage";
import { renderSplitEaseBalanceWidget } from "./SplitEaseBalanceWidget";

export const WIDGET_DATA_KEY = "splitease_balance_widget_v1";
export const WIDGET_CUSTOM_KEY = "splitease_widget_custom_v1";

async function getWidgetData() {
  try {
    const stored = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    return stored ? JSON.parse(stored) : { totalOwe: 0, totalOwed: 0 };
  } catch {
    return { totalOwe: 0, totalOwed: 0 };
  }
}

async function getWidgetCustom() {
  try {
    const stored = await AsyncStorage.getItem(WIDGET_CUSTOM_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    return {
      style: parsed.style || "balance",
      amount: parsed.amount ?? "",
      label: parsed.label ?? "",
      showBalance: parsed.showBalance !== false,
    };
  } catch {
    return { style: "balance", amount: "", label: "", showBalance: true };
  }
}

export async function widgetTaskHandler(props) {
  if (props.widgetInfo?.widgetName !== "SplitEaseBalance") return;

  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED": {
      const [data, custom] = await Promise.all([getWidgetData(), getWidgetCustom()]);
      props.renderWidget(renderSplitEaseBalanceWidget(data, custom));
      break;
    }
    default:
      break;
  }
}
