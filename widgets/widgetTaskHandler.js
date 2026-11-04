import { renderSplitEaseBalanceWidget } from "./SplitEaseBalanceWidget";
import { WIDGET_NAME, fetchWidgetData, isStale, readCustom, readData } from "./widgetData";

export { WIDGET_DATA_KEY, WIDGET_CUSTOM_KEY } from "./widgetData";

/*
 * Runs in Android's headless JS task, outside the app UI.
 *  - WIDGET_ADDED / WIDGET_RESIZED: paint the cache at once, then fetch and repaint.
 *  - WIDGET_UPDATE (every 30 min): fetch fresh numbers; the cache is the fallback.
 *  - WIDGET_CLICK "REFRESH": the "Updated x min ago" line; same as above, on demand.
 *  - Other clicks (OPEN_APP, OPEN_URI) are handled natively and never reach here.
 */
export async function widgetTaskHandler(props) {
  if (props.widgetInfo?.widgetName !== WIDGET_NAME) return;
  const size = { width: props.widgetInfo?.width, height: props.widgetInfo?.height };
  const paint = (data, custom) => props.renderWidget(renderSplitEaseBalanceWidget(data, custom, size));

  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_RESIZED": {
      const [cached, custom] = await Promise.all([readData(), readCustom()]);
      paint(cached, custom);
      if (isStale(cached, 2 * 60_000)) {
        const { data, fresh } = await fetchWidgetData();
        if (fresh) paint(data, custom);
      }
      break;
    }
    case "WIDGET_UPDATE": {
      const [{ data }, custom] = await Promise.all([fetchWidgetData(), readCustom()]);
      paint(data, custom);
      break;
    }
    case "WIDGET_CLICK": {
      if (props.clickAction !== "REFRESH") break;
      const [{ data }, custom] = await Promise.all([fetchWidgetData({ timeoutMs: 8000 }), readCustom()]);
      paint(data, custom);
      break;
    }
    default:
      break;
  }
}
