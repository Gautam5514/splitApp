import { useTheme } from "@/context/ThemeContext";
import { Loader } from "@/components/Loader";
import { api } from "@/lib/api";
import * as ImagePicker from "expo-image-picker";
import { Image as ImageIcon, Wallet2, X } from "lucide-react-native";
import { useState } from "react";
import {
    Modal,
    Image as RNImage,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function AddExpenseModal({ group, onClose, onSuccess, initialDescription = "", initialCategory = "general" }) {
    const { colors } = useTheme();
    const [description, setDescription] = useState(initialDescription);
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState(initialCategory);
    const [imageUri, setImageUri] = useState(null);
    const [loading, setLoading] = useState(false);

    const styles = getStyles(colors);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
            base64: true,
        });

        if (!result.canceled && result.assets[0]) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleSubmit = async () => {
        if (!description.trim() || !amount) {
            return;
        }

        if (parseFloat(amount) <= 0) {
            return;
        }

        try {
            setLoading(true);
            let fileUrl = null;

            if (imageUri) {
                const response = await fetch(imageUri);
                const blob = await response.blob();
                const reader = new FileReader();

                const base64 = await new Promise((resolve, reject) => {
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });

                const uploadRes = await api.post("/upload", {
                    file: base64,
                    folder: "splitwise_receipts",
                    resourceType: "auto",
                });

                fileUrl = uploadRes.data?.url;
            }

            await api.post("/expenses", {
                groupId: group._id,
                description: description.trim(),
                amount: parseFloat(amount),
                splitType: "equal",
                category,
                fileUrl,
            });

            onSuccess();
            onClose();
        } catch (err) {
            console.error("Failed to add expense:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={true} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Close Button */}
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <X size={22} color={colors.textSecondary} />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerContent}>
                            <Wallet2 size={22} color={colors.primary} />
                            <Text style={styles.headerTitle}>Add New Expense</Text>
                        </View>
                        <Text style={styles.headerSubtitle}>
                            Split equally among members of{" "}
                            <Text style={styles.groupName}>{group?.name}</Text>.
                        </Text>
                    </View>

                    {/* Form */}
                    <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                        {/* Description */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Description</Text>
                            <TextInput
                                placeholder="E.g. Dinner, Cab Ride"
                                placeholderTextColor={colors.placeholder}
                                style={styles.input}
                                value={description}
                                onChangeText={setDescription}
                            />
                        </View>

                        {/* Amount */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Amount (₹)</Text>
                            <TextInput
                                placeholder="Enter amount"
                                placeholderTextColor={colors.placeholder}
                                keyboardType="numeric"
                                style={styles.input}
                                value={amount}
                                onChangeText={setAmount}
                            />
                        </View>

                        {/* Category */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Category</Text>
                            <View style={styles.pickerContainer}>
                                <Text style={styles.pickerText}>{category}</Text>
                            </View>
                            <View style={styles.categoryButtons}>
                                {["general", "food", "travel", "stay", "shopping", "bills"].map((cat) => (
                                    <TouchableOpacity
                                        key={cat}
                                        onPress={() => setCategory(cat)}
                                        style={[
                                            styles.categoryButton,
                                            category === cat && styles.categoryButtonActive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.categoryButtonText,
                                                category === cat && styles.categoryButtonTextActive,
                                            ]}
                                        >
                                            {cat}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Upload */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Upload Bill / Receipt (optional)</Text>
                            <TouchableOpacity onPress={pickImage} style={styles.uploadContainer}>
                                <ImageIcon size={20} color={colors.textSecondary} />
                                <Text style={styles.uploadText}>
                                    {imageUri ? "Change Image" : "Pick an image"}
                                </Text>
                            </TouchableOpacity>
                            {imageUri && (
                                <RNImage source={{ uri: imageUri }} style={styles.preview} />
                            )}
                        </View>
                    </ScrollView>

                    {/* Buttons */}
                    <View style={styles.footer}>
                        <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={loading}
                            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                        >
                            {loading ? (
                                <>
                                    <Loader size={18} color="#fff" />
                                    <Text style={styles.submitButtonText}>Uploading...</Text>
                                </>
                            ) : (
                                <Text style={styles.submitButtonText}>Add Expense</Text>
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
        padding: 20,
    },
    modalContainer: {
        backgroundColor: colors.card,
        borderRadius: 16,
        width: "100%",
        maxWidth: 500,
        maxHeight: "90%",
        borderWidth: 1,
        borderColor: colors.border,
    },
    closeButton: {
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 10,
        padding: 8,
    },
    header: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.inputBackground, // Light grey in light mode, darker in dark mode
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    headerContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.text,
    },
    headerSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    groupName: {
        fontWeight: "600",
        color: colors.primary,
    },
    form: {
        padding: 20,
    },
    formGroup: {
        marginBottom: 16,
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
        padding: 12,
        fontSize: 14,
        color: colors.text,
    },
    pickerContainer: {
        backgroundColor: colors.inputBackground,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
    pickerText: {
        fontSize: 14,
        color: colors.text,
        textTransform: "capitalize",
    },
    categoryButtons: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    categoryButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
    },
    categoryButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    categoryButtonText: {
        fontSize: 12,
        color: colors.textSecondary,
        textTransform: "capitalize",
    },
    categoryButtonTextActive: {
        color: "white",
    },
    uploadContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 16,
        backgroundColor: colors.inputBackground,
    },
    uploadText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    preview: {
        width: "100%",
        height: 160,
        borderRadius: 8,
        marginTop: 12,
        resizeMode: "contain",
    },
    footer: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 12,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    cancelButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.textSecondary,
    },
    submitButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
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
