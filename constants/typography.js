// Import each weight from its own subpath so ONLY these 7 font files are
// bundled (the package index would pull in all ~21 files, ~2 MB).
import { BricolageGrotesque_700Bold } from "@expo-google-fonts/bricolage-grotesque/700Bold";
import { BricolageGrotesque_800ExtraBold } from "@expo-google-fonts/bricolage-grotesque/800ExtraBold";
import { PlusJakartaSans_300Light } from "@expo-google-fonts/plus-jakarta-sans/300Light";
import { PlusJakartaSans_400Regular } from "@expo-google-fonts/plus-jakarta-sans/400Regular";
import { PlusJakartaSans_400Regular_Italic } from "@expo-google-fonts/plus-jakarta-sans/400Regular_Italic";
import { PlusJakartaSans_500Medium } from "@expo-google-fonts/plus-jakarta-sans/500Medium";
import { PlusJakartaSans_600SemiBold } from "@expo-google-fonts/plus-jakarta-sans/600SemiBold";

/**
 * ONE typeface system for the whole app:
 *   • Plus Jakarta Sans — everything (light → semibold)
 *   • Bricolage Grotesque — anything bold (700+): titles, amounts, emphasis
 *
 * Screens keep writing normal styles (`fontWeight: "700"`); the app's <Text>
 * (components/ui/Typography) turns the weight into the right font file. That
 * matters on Android, which ignores fontWeight for custom fonts.
 */
export const FONT_ASSETS = {
    PlusJakartaSans_300Light,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_400Regular_Italic,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
};

export const FONTS = {
    light: "PlusJakartaSans_300Light",
    regular: "PlusJakartaSans_400Regular",
    italic: "PlusJakartaSans_400Regular_Italic",
    medium: "PlusJakartaSans_500Medium",
    semibold: "PlusJakartaSans_600SemiBold",
    bold: "BricolageGrotesque_700Bold",
    extrabold: "BricolageGrotesque_800ExtraBold",
};

const WEIGHT_NAMES = { normal: 400, bold: 700 };

/** fontWeight (+ fontStyle) → font family name. */
export const fontFamilyFor = (fontWeight, fontStyle) => {
    const w = Number(WEIGHT_NAMES[fontWeight] ?? fontWeight ?? 400) || 400;
    if (w >= 800) return FONTS.extrabold;
    if (w >= 700) return FONTS.bold;
    if (w >= 600) return FONTS.semibold;
    if (w >= 500) return FONTS.medium;
    if (w <= 300) return FONTS.light;
    return fontStyle === "italic" ? FONTS.italic : FONTS.regular;
};

// Families we manage. A style that names some OTHER family (e.g. a code
// block in monospace) is left untouched.
const MANAGED = new Set([undefined, null, "", "System", ...Object.values(FONTS)]);
export const isManagedFamily = (family) => MANAGED.has(family);
