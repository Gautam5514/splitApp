import { useTheme } from "@/context/ThemeContext";
import { Calendar, FileText, Trash2 } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function NotepadItem({ step, onDelete }) {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const formattedDate = step.date
        ? new Date(step.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
        : null;

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>{step.title}</Text>

                {step.notes && (
                    <View style={styles.notesRow}>
                        <FileText size={12} color={colors.textSecondary} />
                        <Text style={styles.notes}>{step.notes}</Text>
                    </View>
                )}

                {formattedDate && (
                    <View style={styles.dateRow}>
                        <Calendar size={12} color={colors.textSecondary} />
                        <Text style={styles.date}>{formattedDate}</Text>
                    </View>
                )}
            </View>

            <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
                <Trash2 size={16} color={colors.textSecondary} />
            </TouchableOpacity>
        </View>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 12,
    },
    content: {
        flex: 1,
        gap: 8,
    },
    title: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
    },
    notesRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    notes: {
        fontSize: 12,
        color: colors.textSecondary,
        flex: 1,
    },
    dateRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    date: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    deleteButton: {
        padding: 8,
        marginLeft: 16,
    },
});
