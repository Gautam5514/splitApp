import { PillButton, PillInput, useDesign } from "@/components/ui/Design";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar, Plus } from "lucide-react-native";
import { useState } from "react";
import {
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { Text } from "@/components/ui/Typography";

export default function AddStepForm({ onAdd }) {
    const { colors, t } = useDesign();
    const [title, setTitle] = useState("");
    const [notes, setNotes] = useState("");
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const styles = getStyles(colors, t);

    const handleSubmit = async () => {
        if (!title.trim()) return;

        setLoading(true);
        try {
            await onAdd({ title, notes, date: date.toISOString() });
            setTitle("");
            setNotes("");
            setDate(new Date());
        } finally {
            setLoading(false);
        }
    };

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === "ios");
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    return (
        <View style={styles.container}>
            <PillInput
                value={title}
                onChangeText={setTitle}
                placeholder="Add a new step (e.g., Book flight tickets)"
                placeholderTextColor={colors.placeholder}
            />

            <View style={styles.row}>
                <PillInput
                    style={styles.inputHalf}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Notes (optional)"
                    placeholderTextColor={colors.placeholder}
                />

                <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    style={[styles.dateButton, styles.inputHalf]}
                    activeOpacity={0.8}
                >
                    <Calendar size={16} color={colors.textSecondary} />
                    <Text style={styles.dateText} numberOfLines={1}>
                        {date.toLocaleDateString()}
                    </Text>
                </TouchableOpacity>
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                    themeVariant={colors.background === "#000000" ? "dark" : "light"}
                />
            )}

            <PillButton
                variant="primary"
                loading={loading}
                disabled={loading || !title.trim()}
                onPress={handleSubmit}
                icon={<Plus size={16} color={t.onInk} />}
                label={loading ? "Adding..." : "Add Step"}
            />
        </View>
    );
}

const getStyles = (colors, t) => StyleSheet.create({
    container: {
        gap: 12,
        marginTop: 4,
    },
    row: {
        flexDirection: "row",
        gap: 12,
    },
    inputHalf: {
        flex: 1,
    },
    dateButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minHeight: 52,
        borderRadius: 26,
        paddingHorizontal: 18,
        backgroundColor: t.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: t.outline,
    },
    dateText: {
        fontSize: 14,
        color: colors.text,
    },
});
