import "expo-router/entry";
import { Platform } from "react-native";

// Android widgets run in a native headless task, outside the normal app UI.
// Register only on Android so the iOS bundle remains unaffected.
if (Platform.OS === "android") {
  const { registerWidgetTaskHandler } = require("react-native-android-widget");
  const { widgetTaskHandler } = require("./widgets/widgetTaskHandler");
  registerWidgetTaskHandler(widgetTaskHandler);
}
