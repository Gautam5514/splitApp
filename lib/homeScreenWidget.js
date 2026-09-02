import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { renderSplitEaseBalanceWidget } from "@/widgets/SplitEaseBalanceWidget";
import { WIDGET_DATA_KEY } from "@/widgets/widgetTaskHandler";

export async function syncBalanceWidget(summary) {
  if (Platform.OS !== "android") return;
  const data = {
    totalOwe: Number(summary?.totalOwe || 0),
    totalOwed: Number(summary?.totalOwed || 0),
    updatedAt: Date.now(),
  };

  await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));
  try {
    const { requestWidgetUpdate } = require("react-native-android-widget");
    await requestWidgetUpdate({
      widgetName: "SplitEaseBalance",
      renderWidget: () => renderSplitEaseBalanceWidget(data),
    });
  } catch {
    // No pinned widget or native module unavailable (for example Expo Go).
  }
}

export async function promptAddBalanceWidget() {
  if (Platform.OS !== "android") return false;
  const { requestPinWidget } = require("react-native-android-widget");
  return requestPinWidget({ widgetName: "SplitEaseBalance" });
}
