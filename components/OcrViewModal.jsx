import { useModalBackdropPadding } from "@/hooks/useSafeSpacing";
import { RoundButton, useDesign } from "@/components/ui/Design";
import { TYPE } from "@/constants/design";
import { FileText, X } from "lucide-react-native";
import {
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { Text } from "@/components/ui/Typography";

export default function OcrViewModal({ ocrText, imageUrl, onClose }) {
    const { colors, t } = useDesign();
    const backdropPadding = useModalBackdropPadding(16);
    const styles = getStyles(colors, t);

    return (
        <Modal visible={true} transparent animationType="fade" onRequestClose={onClose}>
            <View style={[styles.overlay, backdropPadding]}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <FileText size={20} color={colors.primary} />
                            <Text style={styles.headerTitle}>OCR Receipt Details</Text>
                        </View>
                        <RoundButton onPress={onClose} label="Close" size={40}>
                            <X size={18} color={colors.text} />
                        </RoundButton>
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

const getStyles = (colors, t) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },
    modalContainer: {
        backgroundColor: t.surface,
        borderRadius: 28,
        width: "100%",
        maxWidth: 600,
        maxHeight: "90%",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: t.outline,
        overflow: "hidden",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    headerTitle: {
        ...TYPE.sectionTitle,
        color: colors.text,
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    imageContainer: {
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: t.outline,
        marginBottom: 20,
        backgroundColor: "#000", // Image background usually black
    },
    image: {
        width: "100%",
        height: 320,
    },
    textContainer: {
        backgroundColor: t.surfaceAlt,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: t.outline,
        borderRadius: 16,
        padding: 16,
    },
    ocrText: {
        fontSize: 13,
        color: colors.text,
        fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
        lineHeight: 20,
    },
});
