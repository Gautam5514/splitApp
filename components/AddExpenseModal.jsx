import useKeyboard from "@/hooks/useKeyboard";
import { Alert } from "@/lib/alert";
import { useModalBackdropPadding } from "@/hooks/useSafeSpacing";
import { PillButton, PillInput, RoundButton, useDesign } from "@/components/ui/Design";
import { TYPE } from "@/constants/design";
import { api } from "@/lib/api";
import { categoriesForGroup, categoryMeta } from "@/lib/groupPresets";
import * as ImagePicker from "expo-image-picker";
import { ImagePlus, Plus, Trash2, X } from "lucide-react-native";
import { useState } from "react";
import { Animated, Image as RNImage, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ui/Typography";

const CURRENCY_SYMBOL = { INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥" };

/**
 * Add expense - kept deliberately simple (same as web): what it was for, how
 * much, a category and an optional bill photo. You are always the payer, and
 * the split is the one chosen when the group was created.
 */
export default function AddExpenseModal({ group, onClose, onSuccess, initialDescription = "", initialCategory }) {
    const { colors, t } = useDesign();
    const keyboard = useKeyboard();
    const backdropPadding = useModalBackdropPadding(20);
    const styles = getStyles(colors, t);

    const categories = categoriesForGroup(group);
    const currency = group?.settings?.currency || "INR";
    const symbol = CURRENCY_SYMBOL[currency] || currency;
    const receiptRequired = !!group?.settings?.receiptRequired;
    const memberCount = group?.members?.length || 1;
    const splitType = group?.settings?.defaultSplit?.type || "equal";
    const splitText = splitType === "shares" ? "by shares" : splitType === "percent" ? "by percentage" : "equally";

    const [description, setDescription] = useState(initialDescription);
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState(
        initialCategory && categories.includes(initialCategory) ? initialCategory : categories[0] || "general"
    );
    const [imageUri, setImageUri] = useState(null);
    const [imageBase64, setImageBase64] = useState(null);
    const [notes, setNotes] = useState("");
    const [showNotes, setShowNotes] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.5,
            base64: true,
        });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setImageUri(asset.uri);
            setImageBase64(`data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`);
            setErrors((e) => ({ ...e, fileUrl: "" }));
        }
    };

    const validate = () => {
        const e = {};
        const amt = parseFloat(amount);
        if (!description.trim()) e.description = "What was it for?";
        if (!amount) e.amount = "Enter the amount.";
        else if (!(amt > 0)) e.amount = "Amount must be more than 0.";
        else if (amt > 9999999) e.amount = "That amount is too large.";
        if (receiptRequired && !imageBase64) e.fileUrl = "This group needs a bill photo.";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        try {
            setLoading(true);
            let fileUrl = null;
            if (imageBase64) {
                try {
                    // Receipt uploads go client -> server -> Cloudinary; give them
                    // more room than the default 15s JSON timeout.
                    const uploadRes = await api.post("/upload", { file: imageBase64, folder: "splitwise_receipts", resourceType: "auto" }, { timeout: 60000 });
                    fileUrl = uploadRes.data?.url;
                } catch (uploadErr) {
                    const isTimeout = uploadErr?.code === "ECONNABORTED";
                    Alert.alert(
                        "Couldn't upload image",
                        isTimeout ? "The upload timed out - check your connection and try again." : uploadErr?.response?.data?.message || "Try again."
                    );
                    setLoading(false);
                    return;
                }
            }
            // No payer / split: the server records me as the payer and applies
            // the group's own split.
            await api.post("/expenses", {
                groupId: group._id,
                description: description.trim(),
                amount: parseFloat(amount),
                category,
                notes: notes.trim(),
                fileUrl,
            });
            onSuccess();
            onClose();
        } catch (err) {
            const data = err?.response?.data;
            if (data?.field) setErrors((p) => ({ ...p, [data.field]: data.message }));
            else Alert.alert("Couldn't add expense", data?.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <Animated.View style={[styles.overlay, backdropPadding, { paddingBottom: Animated.add(keyboard.anim, backdropPadding.paddingBottom) }]}>
                <View style={styles.card}>
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>Add expense</Text>
                            <Text style={styles.subtitle} numberOfLines={1}>
                                You paid · split {splitText} among {memberCount} in <Text style={{ color: colors.text, fontWeight: "600" }}>{group?.name}</Text>
                            </Text>
                        </View>
                        <RoundButton onPress={onClose} label="Close" size={38}><X size={17} color={colors.text} /></RoundButton>
                    </View>

                    <ScrollView style={styles.form} contentContainerStyle={{ gap: 16, paddingBottom: 6 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                        <View>
                            <Text style={styles.label}>Description</Text>
                            <PillInput placeholder="e.g. Dinner, Cab ride" value={description} maxLength={200} autoFocus
                                onChangeText={(v) => { setDescription(v); setErrors((e) => ({ ...e, description: "" })); }} />
                            {errors.description ? <Text style={styles.error}>{errors.description}</Text> : null}
                        </View>

                        <View>
                            <Text style={styles.label}>Amount</Text>
                            <PillInput placeholder="0" keyboardType="decimal-pad" value={amount}
                                icon={<Text style={styles.symbol}>{symbol}</Text>}
                                inputStyle={{ fontWeight: "700" }}
                                onChangeText={(v) => { setAmount(v.replace(/[^0-9.]/g, "")); setErrors((e) => ({ ...e, amount: "" })); }} />
                            {errors.amount ? <Text style={styles.error}>{errors.amount}</Text> : null}
                        </View>

                        <View>
                            <Text style={styles.label}>Category</Text>
                            <View style={styles.chips}>
                                {categories.map((c) => {
                                    const { label, Icon } = categoryMeta(c);
                                    const on = category === c;
                                    return (
                                        <TouchableOpacity key={c} onPress={() => setCategory(c)} activeOpacity={0.8}
                                            style={[styles.chip, on && { backgroundColor: t.ink, borderColor: t.ink }]} accessibilityState={{ selected: on }}>
                                            <Icon size={13} color={on ? t.onInk : colors.textSecondary} />
                                            <Text style={[styles.chipText, on && { color: t.onInk }]}>{label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <View>
                            <Text style={styles.label}>Bill / receipt {receiptRequired ? "(required)" : "(optional)"}</Text>
                            {imageUri ? (
                                <View style={styles.fileRow}>
                                    <RNImage source={{ uri: imageUri }} style={styles.thumb} />
                                    <Text style={styles.fileText} numberOfLines={1}>Bill photo added</Text>
                                    <TouchableOpacity onPress={() => { setImageUri(null); setImageBase64(null); }} hitSlop={8} accessibilityLabel="Remove bill photo">
                                        <Trash2 size={16} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity onPress={pickImage} activeOpacity={0.8}
                                    style={[styles.dropzone, errors.fileUrl && { borderColor: colors.error }]}>
                                    <ImagePlus size={17} color={errors.fileUrl ? colors.error : colors.textSecondary} />
                                    <Text style={[styles.dropText, errors.fileUrl && { color: colors.error }]}>Add bill photo</Text>
                                </TouchableOpacity>
                            )}
                            {errors.fileUrl ? <Text style={styles.error}>{errors.fileUrl}</Text> : null}
                        </View>

                        {showNotes ? (
                            <View>
                                <Text style={styles.label}>Note</Text>
                                <PillInput multiline placeholder="Anything to remember - e.g. invoice no." value={notes} onChangeText={setNotes} maxLength={500} autoFocus />
                            </View>
                        ) : (
                            <TouchableOpacity onPress={() => setShowNotes(true)} style={styles.noteBtn} activeOpacity={0.8}>
                                <Plus size={14} color={colors.textSecondary} />
                                <Text style={styles.noteText}>Add note</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>

                    <View style={styles.footer}>
                        <PillButton variant="secondary" label="Cancel" onPress={onClose} style={{ flex: 1 }} />
                        <PillButton variant="primary" label={loading ? (imageBase64 ? "Uploading…" : "Saving…") : "Add expense"}
                            onPress={handleSubmit} loading={loading} disabled={loading} style={{ flex: 1.4 }} />
                    </View>
                </View>
            </Animated.View>
        </Modal>
    );
}

const getStyles = (colors, t) => StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 16 },
    card: {
        backgroundColor: colors.background, borderRadius: 28, width: "100%", maxWidth: 500, maxHeight: "92%",
        borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline,
    },
    header: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 4 },
    title: { ...TYPE.sectionTitle, color: colors.text },
    subtitle: { fontSize: 12.5, color: colors.textSecondary, marginTop: 2 },
    form: { paddingHorizontal: 20, paddingTop: 12 },
    label: { fontSize: 12.5, fontWeight: "600", color: colors.textSecondary, marginBottom: 7 },
    error: { fontSize: 12, color: colors.error, marginTop: 5, marginLeft: 4 },
    symbol: { fontSize: 16, fontWeight: "700", color: colors.textSecondary },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    chip: {
        flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
        backgroundColor: t.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline,
    },
    chipText: { fontSize: 12.5, fontWeight: "600", color: colors.text },
    dropzone: {
        height: 52, borderRadius: 26, borderWidth: 1, borderStyle: "dashed", borderColor: t.outline,
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    },
    dropText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
    fileRow: {
        height: 52, borderRadius: 26, paddingLeft: 6, paddingRight: 16, flexDirection: "row", alignItems: "center", gap: 10,
        backgroundColor: t.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline,
    },
    thumb: { width: 40, height: 40, borderRadius: 20 },
    fileText: { flex: 1, fontSize: 13.5, color: colors.text },
    noteBtn: {
        alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: 999, borderWidth: 1, borderColor: t.outline,
    },
    noteText: { fontSize: 12.5, fontWeight: "600", color: colors.textSecondary },
    footer: { flexDirection: "row", gap: 10, padding: 16, paddingTop: 12 },
});
