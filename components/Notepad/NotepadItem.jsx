import { IconCircle, ListRow, RoundButton, useDesign } from "@/components/ui/Design";
import { Calendar, FileText, Trash2 } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Typography";

export default function NotepadItem({ step, onDelete }) {
    const { colors } = useDesign();
    const styles = getStyles(colors);

    const formattedDate = step.date
        ? new Date(step.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
        : null;

    const subtitle = (
        <View style={styles.metaWrap}>
            {step.notes ? (
                <View style={styles.metaRow}>
                    <FileText size={12} color={colors.textSecondary} />
                    <Text style={styles.meta} numberOfLines={2}>{step.notes}</Text>
                </View>
            ) : null}
            {formattedDate ? (
                <View style={styles.metaRow}>
                    <Calendar size={12} color={colors.textSecondary} />
                    <Text style={styles.meta}>{formattedDate}</Text>
                </View>
            ) : null}
        </View>
    );

    return (
        <ListRow
            leading={
                <IconCircle size={40}>
                    <FileText size={16} color={colors.primary} />
                </IconCircle>
            }
            title={step.title}
            subtitle={step.notes || formattedDate ? subtitle : null}
            numberOfLines={2}
            trailing={
                <RoundButton label="Delete step" size={36} onPress={onDelete}>
                    <Trash2 size={15} color={colors.textSecondary} />
                </RoundButton>
            }
            style={styles.row}
        />
    );
}

const getStyles = (colors) => StyleSheet.create({
    row: {
        paddingHorizontal: 0,
        alignItems: "flex-start",
    },
    metaWrap: {
        gap: 4,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    meta: {
        fontSize: 13,
        color: colors.textSecondary,
        flexShrink: 1,
    },
});
