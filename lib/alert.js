import { showAlert as show, hideAlert } from "@/components/ui/PremiumAlert";

/**
 * Drop-in replacement for React Native's `Alert`, rendered by the on-brand
 * PremiumAlert dialog instead of the OS popup.
 *
 * Usage stays identical:
 *   Alert.alert("Delete trip?", "This can't be undone.", [
 *     { text: "Cancel", style: "cancel" },
 *     { text: "Delete", style: "destructive", onPress: doDelete },
 *   ]);
 *
 * You can also pass a `tone` ("success" | "danger" | "warning" | ...) via the
 * options form: Alert.alert({ title, message, buttons, tone }).
 */
export const Alert = {
    alert: (title, message, buttons) => show(title, message, buttons),
    dismiss: () => hideAlert(),
};

export { show as showAlert, hideAlert };
export default Alert;
