import { useTheme } from "@/context/ThemeContext";
import { Loader } from "@/components/Loader";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Plus } from "lucide-react-native";
import { useState } from "react";
import {
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function AddStepForm({ onAdd }) {
    const { colors } = useTheme();
    const [title, setTitle] = useState("");
    const [notes, setNotes] = useState("");
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const styles = getStyles(colors);

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
            <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Add a new step (e.g., Book flight tickets)"
                placeholderTextColor={colors.placeholder}
                style={styles.input}
            />

            <View style={styles.row}>
                <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Notes (optional)"
                    placeholderTextColor={colors.placeholder}
                    style={[styles.input, styles.inputHalf]}
                />

                <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    style={[styles.input, styles.inputHalf, styles.dateButton]}
                >
                    <Text style={styles.dateText}>
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

            <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading || !title.trim()}
                style={[styles.submitButton, (loading || !title.trim()) && styles.submitButtonDisabled]}
            >
                {loading ? (
                    <>
                        <Loader size={18} color="#fff" />
                        <Text style={styles.submitButtonText}>Adding...</Text>
                    </>
                ) : (
                    <>
                        <Plus size={16} color="white" />
                        <Text style={styles.submitButtonText}>Add Step</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: {
        gap: 12,
        marginTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 16,
    },
    input: {
        backgroundColor: colors.inputBackground,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: colors.text,
    },
    row: {
        flexDirection: "row",
        gap: 12,
    },
    inputHalf: {
        flex: 1,
    },
    dateButton: {
        justifyContent: "center",
    },
    dateText: {
        fontSize: 14,
        color: colors.text,
    },
    submitButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: colors.primary,
        paddingVertical: 12,
        borderRadius: 8,
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        color: "white",
        fontSize: 14,
        fontWeight: "600",
    },
});
