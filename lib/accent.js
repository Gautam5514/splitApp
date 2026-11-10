// Accent themes: a theme only swaps the "ink" (primary) colour; White / Black
// mode stays as it is. Themes are unlocked with referral coins or an Elite
// tier (rules live on the server: GET /referrals/me → store.themes).

const HEX = /^#[0-9a-f]{6}$/i;

/** { key, name, light, dark } or null when the stored value isn't usable. */
export const normalizeAccent = (value) => {
    if (!value || typeof value !== "object") return null;
    const light = value.light || value.colors?.light;
    const dark = value.dark || value.colors?.dark;
    if (!value.key || !HEX.test(String(light)) || !HEX.test(String(dark))) return null;
    return { key: String(value.key), name: value.name ? String(value.name) : "", light, dark };
};

const withAlpha = (hex, alpha) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
};

/** The palette for `scheme` ("light" | "dark") with the accent applied. */
export const applyAccent = (base, accent, scheme) => {
    const a = normalizeAccent(accent);
    if (!a) return base;
    const isDark = scheme === "dark";
    const ink = isDark ? a.dark : a.light;
    return {
        ...base,
        primary: ink,
        tint: ink,
        tabIconSelected: ink,
        // Light-mode accents are deep (white text on them); dark-mode ones are bright.
        onPrimary: isDark ? "#141414" : "#FFFFFF",
        primaryLight: withAlpha(ink, isDark ? 0.16 : 0.1),
    };
};
