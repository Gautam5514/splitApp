import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { renderSplitEaseBalanceWidget } from "@/widgets/SplitEaseBalanceWidget";
import { WIDGET_DATA_KEY, WIDGET_CUSTOM_KEY } from "@/widgets/widgetTaskHandler";

export async function getWidgetCustomization() {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_CUSTOM_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
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

async function getStoredData() {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    return raw ? JSON.parse(raw) : { totalOwe: 0, totalOwed: 0 };
  } catch {
    return { totalOwe: 0, totalOwed: 0 };
  }
}

async function pushUpdate(data, custom) {
  try {
    const { requestWidgetUpdate } = require("react-native-android-widget");
    await requestWidgetUpdate({
      widgetName: "SplitEaseBalance",
      renderWidget: () => renderSplitEaseBalanceWidget(data, custom),
    });
  } catch {
    // No pinned widget or native module unavailable (for example Expo Go).
  }
}

export async function syncBalanceWidget(summary) {
  if (Platform.OS !== "android") return;
  const data = {
    totalOwe: Number(summary?.totalOwe || 0),
    totalOwed: Number(summary?.totalOwed || 0),
    updatedAt: Date.now(),
  };
  await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));
  const custom = await getWidgetCustomization();
  await pushUpdate(data, custom);
}

/** Persist the user's chosen design + custom amount/label and repaint. */
export async function saveWidgetCustomization(custom) {
  const next = {
    style: custom?.style || "balance",
    amount: custom?.amount ?? "",
    label: custom?.label ?? "",
    showBalance: custom?.showBalance !== false,
  };
  await AsyncStorage.setItem(WIDGET_CUSTOM_KEY, JSON.stringify(next));
  if (Platform.OS !== "android") return next;
  const data = await getStoredData();
  await pushUpdate(data, next);
  return next;
}

export async function promptAddBalanceWidget() {
  if (Platform.OS !== "android") return false;
  const { requestPinWidget } = require("react-native-android-widget");
  return requestPinWidget({ widgetName: "SplitEaseBalance" });
}
