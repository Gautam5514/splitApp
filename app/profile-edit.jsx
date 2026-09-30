import { useBottomSpacing } from "@/hooks/useSafeSpacing";
import { SCREEN_GUTTER } from "@/constants/layout";
import { Skeleton, SkeletonCircle } from "@/components/ui/Skeleton";
import { PillButton, PillInput, ScreenHeader, SectionLabel, useDesign } from "@/components/ui/Design";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import { auth } from "@/lib/firebaseClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import {
    Wallet,
    AlignLeft,
    Briefcase,
    Camera,
    Globe,
    Heart,
    MapPin,
    Phone,
    QrCode,
    Trash2,
    Upload,
    User,
    UserCircle,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert } from "@/lib/alert";
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { Text } from "@/components/ui/Typography";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileEditScreen() {
    const { colors, theme } = useTheme();
    const { t } = useDesign();
    const bottomSpacing = useBottomSpacing(32);
    const styles = getStyles(colors, t);

    const [profile, setProfile] = useState({});
    const [googlePhoto, setGooglePhoto] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingQr, setUploadingQr] = useState(false);

    const avatarUrl = profile.profileImage?.url || googlePhoto || auth?.currentUser?.photoURL;

    useEffect(() => {
        (async () => {
            const [cp, cm] = await Promise.all([
                AsyncStorage.getItem("profile_cache_v1"),
                AsyncStorage.getItem("me_cache_v1"),
            ]);
            if (cp) setProfile(JSON.parse(cp));
            if (cm) {
                const me = JSON.parse(cm);
                setGooglePhoto(me?.imageUrl || me?.photoURL || me?.profileImage?.url || null);
            }
            try {
                const res = await api.get("/profile");
                setProfile(res.data || {});
                await AsyncStorage.setItem("profile_cache_v1", JSON.stringify(res.data || {}));
            } catch (err) {
                console.log("Profile fetch error", err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleChange = (name, value) => setProfile((p) => ({ ...p, [name]: value }));

    const handleSave = async () => {
        try {
            setSaving(true);
            await api.put("/profile", profile);
            await AsyncStorage.setItem("profile_cache_v1", JSON.stringify(profile));
            Alert.alert("Saved", "Your profile has been updated.", [
                { text: "OK", onPress: () => router.back() },
            ]);
        } catch (err) {
            Alert.alert("Error", err?.response?.data?.message || "Could not save profile.");
        } finally {
            setSaving(false);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });
        if (!result.canceled && result.assets[0].base64) {
            const dataUrl = `data:image/jpeg;base64,${result.assets[0].base64}`;
            try {
                const res = await api.post("/profile/image", { file: dataUrl });
                setProfile((p) => ({ ...p, profileImage: res.data.profileImage }));
            } catch {
                Alert.alert("Error", "Image upload failed");
            }
        }
    };

    const pickQr = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
            base64: true,
        });
        if (!result.canceled && result.assets[0].base64) {
            const mime = result.assets[0].mimeType || "image/jpeg";
            const dataUrl = `data:${mime};base64,${result.assets[0].base64}`;
            setUploadingQr(true);
            try {
                const res = await api.post("/profile/upi-qr", { file: dataUrl });
                setProfile((p) => ({ ...p, upiQr: res.data.upiQr }));
            } catch (err) {
                Alert.alert("Error", err?.response?.data?.message || "QR upload failed");
            } finally {
                setUploadingQr(false);
            }
        }
    };

    const removeQr = async () => {
        try {
            await api.delete("/profile/upi-qr");
            setProfile((p) => ({ ...p, upiQr: { url: "", public_id: "" } }));
        } catch (err) {
            Alert.alert("Error", err?.response?.data?.message || "Could not remove QR");
        }
    };

    if (loading && !profile.email) {
        return (
            <View style={[styles.loadingScreen, { justifyContent: "flex-start", paddingTop: 40 }]}>
                <SkeletonCircle size={96} />
                <View style={{ height: 28 }} />
                {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} width="86%" height={52} radius={16} style={{ marginBottom: 14 }} />
                ))}
            </View>
        );
    }

    const field = (Icon, label, key, extra = {}) => (
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <PillInput
                icon={<Icon size={19} color={colors.textSecondary} />}
                value={profile[key]}
                onChangeText={(v) => handleChange(key, v)}
                placeholder={`Enter ${label.toLowerCase()}`}
                {...extra}
            />
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />
            <ScreenHeader title="Edit Profile" back />

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomSpacing }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {/* Avatar */}
                    <View style={styles.avatarBlock}>
                        <View style={styles.avatarWrap}>
                            {avatarUrl ? (
                                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPh}><User size={44} color={colors.text} /></View>
                            )}
                            <TouchableOpacity style={styles.cameraBadge} onPress={pickImage} activeOpacity={0.85}>
                                <Camera size={16} color={t.onInk} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.avatarHint}>Tap the camera to change your photo</Text>
                    </View>

                    {/* Identity */}
                    <SectionLabel>Identity</SectionLabel>
                    <View style={styles.group}>
                        {field(UserCircle, "Full Name", "name")}
                        {field(Phone, "Mobile Number", "mobile", { keyboardType: "phone-pad" })}
                        {field(Wallet, "UPI ID (to receive payments)", "upiId", { autoCapitalize: "none", autoCorrect: false, keyboardType: "email-address", placeholder: "name@okaxis" })}
                    </View>

                    {/* UPI QR scanner */}
                    <SectionLabel>UPI QR scanner</SectionLabel>
                    <View style={styles.group}>
                        <View style={styles.qrRow}>
                            <View style={styles.qrPreview}>
                                {profile.upiQr?.url ? (
                                    <Image source={{ uri: profile.upiQr.url }} style={styles.qrImg} resizeMode="contain" />
                                ) : (
                                    <QrCode size={34} color={colors.textSecondary} />
                                )}
                            </View>
                            <View style={styles.qrActions}>
                                <TouchableOpacity
                                    style={styles.qrUploadBtn}
                                    onPress={pickQr}
                                    disabled={uploadingQr}
                                    activeOpacity={0.85}
                                >
                                    <Upload size={15} color={colors.primary} />
                                    <Text style={styles.qrUploadText}>
                                        {uploadingQr ? "Uploading…" : profile.upiQr?.url ? "Replace QR" : "Upload QR image"}
                                    </Text>
                                </TouchableOpacity>
                                {profile.upiQr?.url ? (
                                    <TouchableOpacity style={styles.qrRemoveBtn} onPress={removeQr} activeOpacity={0.85}>
                                        <Trash2 size={14} color={colors.error} />
                                        <Text style={[styles.qrRemoveText, { color: colors.error }]}>Remove</Text>
                                    </TouchableOpacity>
                                ) : null}
                                <Text style={styles.qrHint}>Friends who owe you scan this to pay instantly.</Text>
                            </View>
                        </View>
                    </View>

                    {/* Location */}
                    <SectionLabel>Location</SectionLabel>
                    <View style={styles.group}>
                        {field(MapPin, "City", "city")}
                        {field(Globe, "State", "state")}
                    </View>

                    {/* Personal */}
                    <SectionLabel>Personal</SectionLabel>
                    <View style={styles.group}>
                        {field(Briefcase, "Profession", "profession")}
                        {field(Heart, "Favorite Place", "favoritePlace")}
                        {field(AlignLeft, "Bio", "bio", { multiline: true })}
                    </View>

                    <View style={styles.saveWrap}>
                        <PillButton label="Save Changes" onPress={handleSave} loading={saving} disabled={saving} />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const getStyles = (colors, t) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingScreen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
    scroll: { paddingTop: 4, paddingBottom: 50 },

    avatarBlock: { alignItems: "center", marginVertical: 8, paddingHorizontal: SCREEN_GUTTER },
    avatarWrap: { position: "relative" },
    avatar: { width: 104, height: 104, borderRadius: 52 },
    avatarPh: {
        width: 104, height: 104, borderRadius: 52, backgroundColor: t.surfaceAlt,
        alignItems: "center", justifyContent: "center",
    },
    cameraBadge: {
        position: "absolute", bottom: 2, right: 2, width: 34, height: 34, borderRadius: 17,
        backgroundColor: t.ink, alignItems: "center", justifyContent: "center",
        borderWidth: 3, borderColor: colors.background,
    },
    avatarHint: { fontSize: 12, color: colors.textSecondary, marginTop: 10 },

    group: { paddingHorizontal: SCREEN_GUTTER, gap: 12, marginBottom: 24 },
    field: { gap: 8 },
    fieldLabel: { fontSize: 12.5, fontWeight: "600", color: colors.textSecondary, letterSpacing: 0.4, textTransform: "uppercase", marginLeft: 4 },

    saveWrap: { marginTop: 4, marginHorizontal: SCREEN_GUTTER },

    qrRow: { flexDirection: "row", gap: 14, alignItems: "center" },
    qrPreview: {
        width: 92, height: 92, borderRadius: 16,
        backgroundColor: t.surfaceAlt, alignItems: "center", justifyContent: "center",
        overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
    },
    qrImg: { width: "100%", height: "100%" },
    qrActions: { flex: 1, gap: 8 },
    qrUploadBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        paddingVertical: 11, borderRadius: 14,
        backgroundColor: colors.primaryLight,
        borderWidth: StyleSheet.hairlineWidth, borderColor: colors.primary,
    },
    qrUploadText: { fontSize: 13.5, fontWeight: "700", color: colors.primary },
    qrRemoveBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
        paddingVertical: 9, borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
    },
    qrRemoveText: { fontSize: 12.5, fontWeight: "600" },
    qrHint: { fontSize: 11, color: colors.textSecondary, lineHeight: 15 },
});