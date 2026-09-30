import { Loader } from "@/components/Loader";
import { inkTokens } from "@/constants/layout";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import socket from "@/lib/socket";
import * as ImagePicker from "expo-image-picker";
import { ArrowUp, Camera, Paperclip, X } from "lucide-react-native";
import { useState } from "react";
import { Alert } from "@/lib/alert";
import { Image, Linking, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text, TextInput } from "@/components/ui/Typography";

/**
 * Composer: rounded input pill (text + attach) and a round send button.
 * 1:1 chats send optimistically — a temp bubble with a clock appears at once
 * and is swapped for the saved message (single tick) when the server replies.
 * onSend(msg, replaceId): msg=null means "the temp one failed, remove it".
 */
export default function ChatInput({ conversationId, onSend, isGroup = false, meId = null }) {
    const { colors, theme } = useTheme();
    const isDark = theme === "dark";
    const c = inkTokens(isDark, colors);
    const styles = getStyles(colors, c, isDark);

    const [text, setText] = useState("");
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const canSend = !!(text.trim() || file) && !!conversationId;

    const fileToBase64 = (uri) =>
        new Promise(async (resolve, reject) => {
            try {
                const response = await fetch(uri);
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            } catch (error) {
                reject(error);
            }
        });

    const sendMessage = async () => {
        if (!canSend || loading) return;
        const draftText = text;
        const draftFile = file;
        const tempId = `temp-${Date.now()}`;

        // Clear the composer immediately so it feels instant.
        setText("");
        setFile(null);
        setLoading(true);

        if (!isGroup) {
            onSend?.({
                _id: tempId,
                conversationId,
                sender: meId,
                text: draftText.trim(),
                mediaUrl: draftFile?.uri || null,
                createdAt: new Date().toISOString(),
                status: "sending",
            });
        }

        try {
            const base64 = draftFile ? await fileToBase64(draftFile.uri) : null;
            if (isGroup) {
                await api.post(`/groups/${conversationId}/message`, { text: draftText.trim(), file: base64 });
            } else {
                const res = await api.post("/chat/message", { conversationId, text: draftText.trim(), file: base64 });
                onSend?.(res.data.data, tempId);
                socket.emit("sendMessage", res.data.data);
            }
        } catch (err) {
            console.error("send message failed:", err);
            if (!isGroup) onSend?.(null, tempId);
            // Give the draft back so nothing the user typed is lost.
            setText(draftText);
            setFile(draftFile);
            Alert.alert("Message not sent", err?.response?.data?.message || "Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) setFile(result.assets[0]);
    };

    // Take a photo right now and attach it (add a caption if you like, then send).
    const openCamera = async () => {
        try {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) {
                Alert.alert(
                    "Camera access needed",
                    "Allow SplitEase to use your camera to take and send photos.",
                    perm.canAskAgain
                        ? [{ text: "OK" }]
                        : [{ text: "Cancel", style: "cancel" }, { text: "Open Settings", onPress: () => Linking.openSettings() }]
                );
                return;
            }
            const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 });
            if (!result.canceled && result.assets?.[0]) setFile(result.assets[0]);
        } catch (err) {
            console.error("camera failed:", err);
            Alert.alert("Camera unavailable", "Couldn't open the camera on this device.");
        }
    };

    return (
        // The chat screen's SafeAreaView already pads for the home indicator.
        <View style={styles.container}>
            {file && (
                <View style={styles.filePreview}>
                    <Image source={{ uri: file.uri }} style={styles.previewImage} />
                    <Text style={styles.fileName} numberOfLines={1}>{file.fileName || "Photo"}</Text>
                    <TouchableOpacity onPress={() => setFile(null)} style={styles.removeBtn} accessibilityLabel="Remove attachment">
                        <X size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.inputRow}>
                <View style={styles.pill}>
                    <TextInput
                        value={text}
                        onChangeText={setText}
                        placeholder="Enter text"
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        style={styles.input}
                        selectionColor={colors.primary}
                        accessibilityLabel="Message"
                    />
                    <TouchableOpacity onPress={pickImage} style={styles.pillIcon} activeOpacity={0.7} accessibilityLabel="Attach a photo or video">
                        <Paperclip size={20} color={colors.textSecondary} strokeWidth={2} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={openCamera} style={styles.pillIcon} activeOpacity={0.7} accessibilityLabel="Take a photo">
                        <Camera size={20} color={colors.textSecondary} strokeWidth={2} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    onPress={sendMessage}
                    disabled={!canSend || loading}
                    activeOpacity={0.8}
                    style={[styles.sendBtn, canSend && styles.sendBtnActive]}
                    accessibilityRole="button"
                    accessibilityLabel="Send message"
                    accessibilityState={{ disabled: !canSend || loading }}
                >
                    {loading && isGroup ? (
                        <Loader size={18} color={canSend ? c.onInk : colors.textSecondary} />
                    ) : (
                        <ArrowUp size={21} color={canSend ? c.onInk : colors.textSecondary} strokeWidth={2.4} />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const getStyles = (colors, c, isDark) => StyleSheet.create({
    container: {
        backgroundColor: colors.card,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
    },
    filePreview: {
        flexDirection: "row", alignItems: "center", gap: 10,
        padding: 8, marginBottom: 10, borderRadius: 16,
        backgroundColor: colors.background,
    },
    previewImage: { width: 40, height: 40, borderRadius: 10 },
    fileName: { fontSize: 13, color: colors.text, flex: 1, fontWeight: "500" },
    removeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },

    inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
    pill: {
        flex: 1, flexDirection: "row", alignItems: "center",
        minHeight: 52, borderRadius: 26, paddingLeft: 18, paddingRight: 6,
        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : colors.background,
        borderWidth: StyleSheet.hairlineWidth, borderColor: c.outline,
    },
    input: { flex: 1, fontSize: 15, color: colors.text, maxHeight: 110, paddingTop: 14, paddingBottom: 14 },
    pillIcon: { width: 36, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },

    sendBtn: {
        width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center",
        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : colors.background,
        borderWidth: StyleSheet.hairlineWidth, borderColor: c.outline,
    },
    sendBtnActive: { backgroundColor: c.ink, borderColor: c.ink },
});
