import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import socket from "@/lib/socket";
import { Loader } from "@/components/Loader";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { ImagePlus, Send, X } from "lucide-react-native";
import { useRef, useState } from "react";
import {
    Animated,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const SEND_GRADIENT = ["#6366F1", "#8B5CF6"];

export default function ChatInput({ conversationId, onSend, isGroup = false }) {
    const { colors, theme } = useTheme();
    const isDark = theme === "dark";
    const [text, setText] = useState("");
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const scale = useRef(new Animated.Value(0)).current;

    const styles = getStyles(colors, isDark);
    const canSend = !!(text.trim() || file);

    const animateSend = (to) =>
        Animated.spring(scale, { toValue: to, useNativeDriver: true, friction: 6, tension: 120 }).start();

    const onChange = (t) => {
        setText(t);
        const active = !!(t.trim() || file);
        animateSend(active ? 1 : 0);
    };

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
        try {
            setLoading(true);
            const base64 = file ? await fileToBase64(file.uri) : null;

            if (isGroup) {
                await api.post(`/groups/${conversationId}/message`, { text: text.trim(), file: base64 });
            } else {
                const res = await api.post("/chat/message", { conversationId, text: text.trim(), file: base64 });
                onSend(res.data.data);
                socket.emit("sendMessage", res.data.data);
            }
            setText("");
            setFile(null);
            animateSend(0);
        } catch (err) {
            console.error("send message failed:", err);
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
        if (!result.canceled && result.assets[0]) {
            setFile(result.assets[0]);
            animateSend(1);
        }
    };

    return (
        <View style={styles.container}>
            {file && (
                <View style={styles.filePreview}>
                    <View style={styles.fileInfo}>
                        <Image source={{ uri: file.uri }} style={styles.previewImage} />
                        <Text style={styles.fileName} numberOfLines={1}>{file.fileName || "Image attached"}</Text>
                    </View>
                    <TouchableOpacity onPress={() => { setFile(null); if (!text.trim()) animateSend(0); }} style={styles.removeBtn}>
                        <X size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.inputRow}>
                <View style={styles.pill}>
                    <TouchableOpacity onPress={pickImage} style={styles.attachBtn} activeOpacity={0.7}>
                        <ImagePlus size={22} color={colors.primary} />
                    </TouchableOpacity>
                    <TextInput
                        value={text}
                        onChangeText={onChange}
                        placeholder="Type a message…"
                        placeholderTextColor={colors.placeholder}
                        multiline
                        style={styles.input}
                        selectionColor={colors.primary}
                    />
                </View>

                <TouchableOpacity
                    onPress={sendMessage}
                    disabled={!canSend || loading}
                    activeOpacity={0.85}
                    style={styles.sendWrap}
                >
                    <Animated.View
                        style={[
                            styles.sendBtn,
                            { transform: [{ scale: scale.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] },
                        ]}
                    >
                        <LinearGradient
                            colors={canSend ? SEND_GRADIENT : [colors.border, colors.border]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.sendGradient}
                        >
                            {loading
                                ? <Loader size={18} color="#fff" />
                                : <Send size={19} color={canSend ? "#fff" : colors.textSecondary} strokeWidth={2.2} style={{ marginLeft: -1 }} />}
                        </LinearGradient>
                    </Animated.View>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const getStyles = (colors, isDark) => StyleSheet.create({
    container: {
        backgroundColor: colors.background,
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 10,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    filePreview: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 8,
        marginBottom: 8,
        borderRadius: 12,
    },
    fileInfo: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
    previewImage: { width: 38, height: 38, borderRadius: 8 },
    fileName: { fontSize: 13, color: colors.text, flex: 1, fontWeight: "500" },
    removeBtn: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },

    inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
    pill: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 24,
        paddingLeft: 6,
        paddingRight: 14,
        minHeight: 48,
    },
    attachBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
    input: { flex: 1, fontSize: 15, color: colors.text, maxHeight: 110, paddingVertical: 10, paddingTop: 12 },

    sendWrap: { paddingBottom: 1 },
    sendBtn: {
        shadowColor: "#6366F1",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.4 : 0.3,
        shadowRadius: 8,
        elevation: 4,
        borderRadius: 24,
    },
    sendGradient: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
});
