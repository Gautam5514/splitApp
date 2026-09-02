import AsyncStorage from "@react-native-async-storage/async-storage";
import { renderSplitEaseBalanceWidget } from "./SplitEaseBalanceWidget";

export const WIDGET_DATA_KEY = "splitease_balance_widget_v1";

async function getWidgetData() {
  try {
    const stored = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    return stored ? JSON.parse(stored) : { totalOwe: 0, totalOwed: 0 };
  } catch {
    return { totalOwe: 0, totalOwed: 0 };
  }
}

export async function widgetTaskHandler(props) {
  if (props.widgetInfo?.widgetName !== "SplitEaseBalance") return;

  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED": {
      const data = await getWidgetData();
      props.renderWidget(renderSplitEaseBalanceWidget(data));
      break;
    }
    default:
      break;
  }
}
