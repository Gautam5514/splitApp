import BottomSheet from "@/components/ui/BottomSheet";
import { useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { api } from "@/lib/api";
import { Alert } from "@/lib/alert";
import { GROUP_ICONS, getGroupIcon } from "@/lib/groupIcons";
import { groupTypeMeta } from "@/lib/groupPresets";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { Camera } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

/**
 * Group photo & icon (creator only, same as web). Minimal: avatar in the
 * middle (tap to upload a photo), then every icon in one quiet grid.
 */
export default function GroupAvatarSheet({ visible, group, onClose, onChange }) {
    const { colors, t } = useDesign();
    const styles = getStyles(colors, t);
    const meta = groupTypeMeta(group.groupType);
    const [busy, setBusy] = useState(null);
    const photoUrl = group.photo?.url;
    const CurrentIcon = getGroupIcon(group.icon) || meta.Icon;
    const photoBusy = busy === "photo" || busy === "remove";

    const uploadPhoto = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });
        if (result.canceled || !result.assets?.[0]) return;
        const a = result.assets[0];
        try {
            setBusy("photo");
            const res = await api.post(`/groups/${group._id}/photo`, { file: `data:${a.mimeType || "image/jpeg"};base64,${a.base64}` }, { timeout: 60000 });
            onChange?.({ photo: res.data.group.photo, icon: null });
        } catch (err) {
            Alert.alert("Photo upload failed", err?.response?.data?.message || "Please try again.");
        } finally {
            setBusy(null);
        }
    };

    // Removing the photo falls back to the type's icon, never a bare letter.
    const removePhoto = async () => {
        try {
            setBusy("remove");
            await api.delete(`/groups/${group._id}/photo`);
            const icon = meta.icon || null;
            if (icon) await api.put(`/groups/${group._id}/icon`, { icon });
            onChange?.({ photo: { url: "", public_id: "" }, icon });
        } catch (err) {
            Alert.alert("Couldn't remove the photo", err?.response?.data?.message || "Please try again.");
        } finally {
            setBusy(null);
        }
    };

    const pickIcon = async (key) => {
        if (key === group.icon && !photoUrl) return;
        try {
            setBusy(key);
            await api.put(`/groups/${group._id}/icon`, { icon: key });
            onChange?.({ icon: key, photo: { url: "", public_id: "" } });
        } catch (err) {
            Alert.alert("Couldn't update the icon", err?.response?.data?.message || "Please try again.");
        } finally {
            setBusy(null);
        }
    };

    return (
        <BottomSheet visible={visible} onClose={onClose} backgroundColor={colors.background}>
            <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
                {/* Avatar: tap to upload */}
                <View style={styles.center}>
                    <TouchableOpacity onPress={uploadPhoto} disabled={!!busy} activeOpacity={0.85}
                        accessibilityLabel={photoUrl ? "Change photo" : "Upload photo"}>
                        {photoUrl ? (
                            <Image source={{ uri: photoUrl }} style={styles.avatar} />
                        ) : (
                            <LinearGradient colors={meta.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
                                <CurrentIcon size={32} color="#fff" strokeWidth={2} />
                            </LinearGradient>
                        )}
                        <View style={styles.badge}>
                            {photoBusy ? <ActivityIndicator size="small" color={t.onInk} /> : <Camera size={13} color={t.onInk} />}
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.name} numberOfLines={1}>{group.name}</Text>
                    <View style={styles.links}>
                        <TouchableOpacity onPress={uploadPhoto} disabled={!!busy} hitSlop={8}>
                            <Text style={styles.link}>{photoUrl ? "Change photo" : "Upload photo"}</Text>
                        </TouchableOpacity>
                        {photoUrl ? (
                            <>
                                <Text style={styles.dot}>•</Text>
                                <TouchableOpacity onPress={removePhoto} disabled={!!busy} hitSlop={8}>
                                    <Text style={styles.remove}>Remove</Text>
                                </TouchableOpacity>
                            </>
                        ) : null}
                    </View>
                </View>

                {/* Icons */}
                <Text style={styles.label}>{photoUrl ? "OR USE AN ICON" : "ICON"}</Text>
                <View style={styles.grid}>
                    {GROUP_ICONS.map(({ key, label, Icon }) => {
                        const selected = !photoUrl && group.icon === key;
                        return (
                            <TouchableOpacity key={key} onPress={() => pickIcon(key)} disabled={!!busy} activeOpacity={0.7}
                                style={[styles.cell, selected && { backgroundColor: t.ink }]}
                                accessibilityLabel={label} accessibilityState={{ selected }}>
                                {busy === key
                                    ? <ActivityIndicator size="small" color={colors.textSecondary} />
                                    : <Icon size={19} color={selected ? t.onInk : colors.textSecondary} strokeWidth={2} />}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        </BottomSheet>
    );
}

const getStyles = (colors, t) => StyleSheet.create({
    center: { alignItems: "center", paddingTop: 4 },
    avatar: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    badge: {
        position: "absolute", right: -4, bottom: -4, width: 28, height: 28, borderRadius: 14,
        backgroundColor: t.ink, borderWidth: 2, borderColor: colors.background, alignItems: "center", justifyContent: "center",
    },
    name: { marginTop: 12, fontSize: 15, fontWeight: "600", color: colors.text },
    links: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
    link: { fontSize: 13, fontWeight: "600", color: colors.primary },
    dot: { fontSize: 12, color: colors.textSecondary },
    remove: { fontSize: 13, color: colors.textSecondary },
    label: { marginTop: 24, marginBottom: 10, fontSize: 11, fontWeight: "600", letterSpacing: 0.8, color: colors.textSecondary },
    grid: { flexDirection: "row", flexWrap: "wrap", paddingBottom: 12 },
    cell: { width: "12.5%", aspectRatio: 1, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
