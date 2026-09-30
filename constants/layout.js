/**
 * App-wide layout system: EDGE-TO-EDGE ("full width").
 *
 * Content surfaces span the full screen width - no side gaps, no rounded
 * floating cards. A surface is separated from the next by 1px top/bottom
 * dividers, and everything inside it (text, rows, inputs, buttons) is inset
 * from the screen edge by SCREEN_GUTTER. This is the look Trips and Group
 * details already used; every screen now follows it.
 *
 * Want the app wider or tighter? Change SCREEN_GUTTER - every screen follows.
 */

/** Horizontal inset of all content from the screen edge. */
export const SCREEN_GUTTER = 20;

/** Vertical space between two full-width sections. */
export const SECTION_GAP = 20;

/** Divider thickness used on full-width sections and between rows. */
export const DIVIDER_WIDTH = 1;

/**
 * Style for a full-width content surface (replaces rounded "cards").
 * Spread it into a StyleSheet entry: `section: { ...fullBleedSection(colors) }`.
 */
export const fullBleedSection = (colors) => ({
    backgroundColor: colors.card,
    borderTopWidth: DIVIDER_WIDTH,
    borderBottomWidth: DIVIDER_WIDTH,
    borderColor: colors.border,
});

/**
 * Monochrome "ink" accents for pill buttons and badges (Messages screen style):
 * black on light mode, white on dark mode, with matching text colours.
 */
export const inkTokens = (isDark, colors) => ({
    // Follows the theme accent (default = monochrome), so Messages and every
    // other screen always use the same accent.
    ink: colors?.primary || (isDark ? "#FFFFFF" : "#141414"),
    onInk: colors?.onPrimary || (isDark ? "#141414" : "#FFFFFF"),
    surface: isDark ? "rgba(255,255,255,0.07)" : "#FFFFFF",
    outline: isDark ? "rgba(255,255,255,0.10)" : "rgba(20,20,20,0.08)",
    shadow: isDark ? 0 : 0.05,
});
