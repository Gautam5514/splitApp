import { useTheme } from "@/context/ThemeContext";
import { Loader } from "@/components/Loader";
import { X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function CreateNotepadModal({ isOpen, onConfirm, onCancel, creating }) {
    const { colors } = useTheme();
    const [title, setTitle] = useState("");

    const styles = getStyles(colors);

    useEffect(() => {
        if (isOpen) setTitle("");
    }, [isOpen]);

    const handleSubmit = () => {
        if (title.trim()) onConfirm(title);
    };

    return (
        <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onCancel}>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Create New Notepad</Text>
                        <TouchableOpacity onPress={onCancel}>
                            <X size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <Text style={styles.label}>Notepad Title</Text>
                        <TextInput
                            value={title}
                            onChangeText={setTitle}
                            placeholder="e.g., Trip to the Mountains"
                            placeholderTextColor={colors.placeholder}
                            style={styles.input}
                        />
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={creating || !title.trim()}
                            style={[
                                styles.submitButton,
                                (creating || !title.trim()) && styles.submitButtonDisabled,
                            ]}
                        >
                            {creating ? (
                                <>
                                    <Loader size={18} color="#fff" />
                                    <Text style={styles.submitButtonText}>Creating...</Text>
                                </>
                            ) : (
                                <Text style={styles.submitButtonText}>Create Notepad</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const getStyles = (colors) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },
    modalContainer: {
        backgroundColor: colors.card,
        borderRadius: 16,
        width: "100%",
        maxWidth: 400,
        borderWidth: 1,
        borderColor: colors.border,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
    },
    content: {
        padding: 16,
    },
    label: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 8,
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
    footer: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 12,
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background, // Or subtle footer background
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
    },
    cancelButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
    },
    cancelButtonText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    submitButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: colors.primary,
        borderRadius: 8,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "white",
    },
});
