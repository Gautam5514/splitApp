import { useTheme } from "@/context/ThemeContext";
import { FileText, X } from "lucide-react-native";
import {
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function OcrViewModal({ ocrText, imageUrl, onClose }) {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    return (
        <Modal visible={true} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <FileText size={20} color={colors.primary} />
                            <Text style={styles.headerTitle}>OCR Receipt Details</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Image Preview */}
                        {imageUrl && (
                            <View style={styles.imageContainer}>
                                <Image
                                    source={{ uri: imageUrl }}
                                    style={styles.image}
                                    resizeMode="contain"
                                />
                            </View>
                        )}

                        {/* OCR Text */}
                        <View style={styles.textContainer}>
                            <Text style={styles.ocrText}>{ocrText}</Text>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const getStyles = (colors) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },
    modalContainer: {
        backgroundColor: colors.card,
        borderRadius: 16,
        width: "100%",
        maxWidth: 600,
        maxHeight: "90%",
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
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
    },
    content: {
        padding: 20,
    },
    imageContainer: {
        borderRadius: 8,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 20,
        backgroundColor: "#000", // Image background usually black
    },
    image: {
        width: "100%",
        height: 320,
    },
    textContainer: {
        backgroundColor: colors.inputBackground,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 16,
    },
    ocrText: {
        fontSize: 13,
        color: colors.text,
        fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
        lineHeight: 20,
    },
});
