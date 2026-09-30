import { GROUP_ICON_CATEGORIES } from "@/lib/groupIcons";
import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ui/Typography";

/**
 * Categorized grid of selectable group icons. Controlled via `value` (an
 * icon key, or null for "no icon / use the letter avatar") and `onChange`.
 */
export default function GroupIconPicker({ value, onChange, colors, tint = colors?.primary || "#0891B2" }) {
    const styles = getStyles(colors);
    const [pressedLabel, setPressedLabel] = useState(null);

    const selectedLabel = GROUP_ICON_CATEGORIES
        .flatMap((s) => s.icons)
        .find((i) => i.key === value)?.label;

    return (
        <View>
            <Text style={styles.activeLabel} numberOfLines={1}>
                {pressedLabel || selectedLabel || " "}
            </Text>

            {GROUP_ICON_CATEGORIES.map(({ category, icons }) => (
                <View key={category} style={styles.section}>
                    <Text style={styles.sectionLabel}>{category}</Text>
                    <View style={styles.grid}>
                        {icons.map(({ key, label, Icon }) => {
                            const selected = value === key;
                            return (
                                <TouchableOpacity
                                    key={key}
                                    activeOpacity={0.75}
                                    onPress={() => onChange(selected ? null : key)}
                                    onPressIn={() => setPressedLabel(label)}
                                    onPressOut={() => setPressedLabel(null)}
                                    style={styles.cellWrap}
                                >
                                    {selected ? (
                                        <View style={[styles.cell, styles.cellSelected, { backgroundColor: tint }]}>
                                            <Icon size={17} color={colors?.onPrimary || "#fff"} strokeWidth={2.5} />
                                        </View>
                                    ) : (
                                        <View style={styles.cell}>
                                            <Icon size={17} color={colors?.textSecondary || "#6B7280"} strokeWidth={2} />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            ))}
        </View>
    );
}

const getStyles = (colors) => StyleSheet.create({
    activeLabel: {
        fontSize: 12.5,
        fontWeight: "700",
        color: colors?.primary || "#0891B2",
        marginBottom: 10,
        minHeight: 16,
    },
    section: {
        marginBottom: 14,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.6,
        textTransform: "uppercase",
        color: colors?.textSecondary || "#9CA3AF",
        marginBottom: 8,
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    cellWrap: {
        width: 40,
        height: 40,
    },
    cell: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: colors?.border || "#E5E7EB",
        backgroundColor: colors?.card || "#fff",
    },
    cellSelected: {
        borderWidth: 0,
        shadowColor: "#0891B2",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
});
