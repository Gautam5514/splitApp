import { Text } from "@/components/ui/Typography";
import { useTheme } from "@/context/ThemeContext";
import { Award } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

// Elite tier earned by referring friends. Starter has no badge.
// [light text, dark text] — the fill is the same colour, faded.
const TIERS = {
    bronze: { label: "Bronze", light: "#9A5B21", dark: "#E0A26A" },
    silver: { label: "Silver", light: "#5B6676", dark: "#C4CCD8" },
    gold: { label: "Gold", light: "#A16207", dark: "#FACC15" },
    elite: { label: "Elite", light: "#6D28D9", dark: "#C4B5FD" },
};

export const tierLabel = (tier) => TIERS[tier]?.label || "";

/** Small pill: 🏅 Gold. Renders nothing for "starter" / unknown tiers. */
export default function TierBadge({ tier, style }) {
    const { theme } = useTheme();
    const meta = TIERS[tier];
    if (!meta) return null;
    const color = theme === "dark" ? meta.dark : meta.light;
    return (
        <View
            style={[styles.pill, { backgroundColor: `${color}22` }, style]}
            accessible
            accessibilityLabel={`${meta.label} member`}
        >
            <Award size={11} color={color} strokeWidth={2.4} />
            <Text style={[styles.text, { color }]}>{meta.label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    pill: {
        flexDirection: "row", alignItems: "center", gap: 3,
        paddingHorizontal: 7, height: 20, borderRadius: 10,
    },
    text: { fontSize: 11, fontWeight: "600", letterSpacing: 0.1 },
});
