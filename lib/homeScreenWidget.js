import { Platform } from "react-native";
import { renderSplitEaseBalanceWidget } from "@/widgets/SplitEaseBalanceWidget";
import { WIDGET_NAME, fetchWidgetData, normalizeData, readCustom, readData, writeCustom, writeData } from "@/widgets/widgetData";

export { WIDGET_STYLES } from "@/widgets/SplitEaseBalanceWidget";
export const getWidgetCustomization = readCustom;

// Repaint every placed widget with the given data and preferences (no-op without a widget).
async function pushUpdate(data, custom) {
  try {
    const { requestWidgetUpdate } = require("react-native-android-widget");
    await requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: (widgetInfo) => renderSplitEaseBalanceWidget(data, custom, { width: widgetInfo?.width, height: widgetInfo?.height }),
    });
  } catch {
    // No pinned widget or native module unavailable (for example Expo Go).
  }
}

/*
 * Called by the app whenever balances may have changed (home load, pull to refresh,
 * realtime dashboard updates, after adding an expense). Pass the /balances/widget
 * payload when you have it; the older { totalOwe, totalOwed } summary also works, in
 * which case the rich fields are fetched in the background.
 */
export async function syncBalanceWidget(summary) {
  if (Platform.OS !== "android") return;
  const custom = await readCustom();
  if (summary && Array.isArray(summary.people)) {
    await pushUpdate(await writeData(summary), custom);
    return;
  }
  // Basic totals now, full detail as soon as the server answers.
  if (summary) {
    const cached = await readData();
    await pushUpdate(await writeData({ ...cached, ...normalizeData({ ...cached, totalOwe: summary.totalOwe, totalOwed: summary.totalOwed, updatedAt: Date.now() }) }), custom);
  }
  const { data, fresh } = await fetchWidgetData();
  if (fresh) await pushUpdate(data, custom);
}

/** Persist the user's chosen design and options, then repaint. */
export async function saveWidgetCustomization(custom) {
  const next = await writeCustom(custom);
  if (Platform.OS !== "android") return next;
  await pushUpdate(await readData(), next);
  return next;
}

/** Ask the launcher to place the widget (Android 8+); resolves false when it can't. */
export async function promptAddBalanceWidget() {
  if (Platform.OS !== "android") return false;
  const { requestPinWidget } = require("react-native-android-widget");
  return requestPinWidget({ widgetName: WIDGET_NAME });
}
