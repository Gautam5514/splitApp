import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Single source of truth for safe-area spacing across the app.
 *
 * The app is edge-to-edge on BOTH platforms (iOS always; Android via
 * `edgeToEdgeEnabled` in app.json), so content draws behind the status bar,
 * the iPhone home indicator and the Android gesture / 3-button nav bar.
 * Hard-coded paddings (e.g. `paddingBottom: 50`) are only right on one kind of
 * device - an Android phone with 3-button navigation has a ~48dp bottom inset,
 * an iPhone 34pt, an older Android 0. Every screen should derive its bottom
 * spacing from these helpers instead.
 */

// ── Floating tab bar geometry (used by app/(tabs)/_layout.jsx) ─────────────
export const TAB_BAR_HEIGHT = 58; // glass pill height (48pt buttons + 5pt padding)
export const TAB_BAR_GAP = 14; // space between the bar and the safe-area edge
export const TAB_BAR_MIN_BOTTOM = 8; // floor when the device reports no inset
const TAB_CONTENT_BREATHING_ROOM = 32; // last list item never hugs the bar

/** Distance from the screen bottom to the bottom edge of the floating tab bar. */
export const tabBarBottomOffset = (insets) =>
  Math.max(insets.bottom, TAB_BAR_MIN_BOTTOM) + TAB_BAR_GAP;

/** Geometry for the floating tab bar (the AI button now lives inside it). */
export function useTabBarLayout() {
  const insets = useSafeAreaInsets();
  return { insets, barBottom: tabBarBottomOffset(insets) };
}

/**
 * paddingBottom for the scroll content of a screen INSIDE the tab navigator,
 * so the last item can always scroll fully clear of the floating tab bar.
 */
export function useTabScreenBottomPadding(extra = 0) {
  const insets = useSafeAreaInsets();
  return tabBarBottomOffset(insets) + TAB_BAR_HEIGHT + TAB_CONTENT_BREATHING_ROOM + extra;
}

/**
 * paddingBottom for a stack screen / sheet / sticky footer: the device's
 * bottom inset plus the design spacing `base`.
 */
export function useBottomSpacing(base = 16) {
  const insets = useSafeAreaInsets();
  return insets.bottom + base;
}

/**
 * Padding for the backdrop of a centered `<Modal>` card, so a tall card
 * (maxHeight "90%") can never slide under the notch / Dynamic Island or the
 * nav bar. React Native modals are edge-to-edge too.
 */
export function useModalBackdropPadding(base = 16) {
  const insets = useSafeAreaInsets();
  return {
    paddingTop: insets.top + base,
    paddingBottom: insets.bottom + base,
    paddingLeft: insets.left + base,
    paddingRight: insets.right + base,
  };
}
