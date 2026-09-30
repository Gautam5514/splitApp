/**
 * SplitEase design system — the Messages-tab look, for EVERY screen.
 * ─────────────────────────────────────────────────────────────────────────
 *  Canvas     colors.background (soft grey / near-black). No full-bleed white
 *             slabs, no divider lines between rows.
 *  Surfaces   `surface`: white (light) / 7% white (dark), hairline outline,
 *             very soft shadow in light mode. Used for pills, round buttons
 *             and grouped blocks (radius 22).
 *  Accent     `ink` = colors.primary (black in light, white in dark by
 *             default), text on it = colors.onPrimary.
 *  Shapes     Round 48pt icon buttons · 52pt pill inputs · 54pt pill buttons ·
 *             segmented pill switches · round avatars.
 *  Type       Page title 30 bold · section title 17 semibold · row title 16.5
 *             medium · secondary 13.5 · meta 12. (Font = components/ui/Typography)
 *  Spacing    Screen gutter 20 · 12 between rows · 24 between sections.
 */
import { StyleSheet } from "react-native";

export const R = { pill: 999, block: 22, tile: 16, button: 27 };
export const SIZE = { roundBtn: 48, input: 52, button: 54, avatar: 50 };
export const TYPE = {
    pageTitle: { fontSize: 30, fontWeight: "700", letterSpacing: -0.3 },
    sectionTitle: { fontSize: 17, fontWeight: "600", letterSpacing: -0.2 },
    rowTitle: { fontSize: 16.5, fontWeight: "500", letterSpacing: -0.2 },
    body: { fontSize: 15 },
    secondary: { fontSize: 13.5 },
    meta: { fontSize: 12 },
    label: { fontSize: 12.5, fontWeight: "600", letterSpacing: 0.4, textTransform: "uppercase" },
};

/** Theme tokens for the design system (derive from the active theme colours). */
export const tokens = (colors, isDark) => ({
    ink: colors.primary,
    onInk: colors.onPrimary || (isDark ? "#141414" : "#FFFFFF"),
    surface: isDark ? "rgba(255,255,255,0.07)" : "#FFFFFF",
    surfaceAlt: isDark ? "rgba(255,255,255,0.04)" : "#F1F2F5", // tiles inside a block
    outline: isDark ? "rgba(255,255,255,0.10)" : "rgba(20,20,20,0.08)",
    shadowOpacity: isDark ? 0 : 0.05,
    text: colors.text,
    muted: colors.textSecondary,
});

/** Surface style shared by pills, round buttons and blocks. */
export const surfaceStyle = (t) => ({
    backgroundColor: t.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.outline,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: t.shadowOpacity,
    shadowRadius: 10,
    elevation: t.shadowOpacity ? 1 : 0,
});
