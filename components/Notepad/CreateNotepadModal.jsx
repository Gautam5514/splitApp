import useKeyboard from "@/hooks/useKeyboard";
import { useModalBackdropPadding } from "@/hooks/useSafeSpacing";
import { PillButton, PillInput, RoundButton, useDesign } from "@/components/ui/Design";
import { TYPE } from "@/constants/design";
import { X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
    Animated,
    Modal,
    StyleSheet,
    View,
} from "react-native";
import { Text } from "@/components/ui/Typography";

export default function CreateNotepadModal({ isOpen, onConfirm, onCancel, creating }) {
    const { colors, t } = useDesign();
    const keyboard = useKeyboard();
    const backdropPadding = useModalBackdropPadding(16);
    const [title, setTitle] = useState("");

    const styles = getStyles(colors, t);

    useEffect(() => {
        if (isOpen) setTitle("");
    }, [isOpen]);

    const handleSubmit = () => {
        if (title.trim()) onConfirm(title);
    };

    return (
        <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onCancel}>
            <Animated.View
                style={[
                    styles.overlay,
                    backdropPadding,
                    // Lift the card above the keyboard — a Modal window doesn't resize for it.
                    { paddingBottom: Animated.add(keyboard.anim, backdropPadding.paddingBottom) },
                ]}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Create New Notepad</Text>
                        <RoundButton onPress={onCancel} label="Close" size={40}>
                            <X size={18} color={colors.text} />
                        </RoundButton>
                    </View>

                    <View style={styles.content}>
                        <Text style={styles.label}>Notepad Title</Text>
                        <PillInput
                            value={title}
                            onChangeText={setTitle}
                            placeholder="e.g., Trip to the Mountains"
                        />
                    </View>

                    <View style={styles.footer}>
                        <PillButton variant="secondary" label="Cancel" onPress={onCancel} style={styles.footerBtn} />
                        <PillButton
                            variant="primary"
                            label={creating ? "Creating..." : "Create Notepad"}
                            onPress={handleSubmit}
                            disabled={creating || !title.trim()}
                            loading={creating}
                            style={styles.footerBtn}
                        />
                    </View>
                </View>
            </Animated.View>
        </Modal>
    );
}

const getStyles = (colors, t) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },
    modalContainer: {
        backgroundColor: t.surface,
        borderRadius: 28,
        width: "100%",
        maxWidth: 400,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: t.outline,
        padding: 20,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    headerTitle: {
        ...TYPE.sectionTitle,
        color: colors.text,
    },
    content: {
        marginBottom: 20,
    },
    label: {
        ...TYPE.secondary,
        color: colors.textSecondary,
        marginBottom: 8,
    },
    footer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    footerBtn: {
        flex: 1,
    },
});
