import { Loader } from "@/components/Loader";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import { auth } from "@/lib/firebaseClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import {
    AlignLeft,
    ArrowLeft,
    Briefcase,
    Camera,
    Globe,
    Heart,
    MapPin,
    Phone,
    User,
    UserCircle,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileEditScreen() {
    const { colors, theme } = useTheme();
    const styles = getStyles(colors);

    const [profile, setProfile] = useState({});
    const [googlePhoto, setGooglePhoto] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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
        } catch {
            Alert.alert("Error", "Could not save profile.");
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

    if (loading && !profile.email) {
        return <View style={styles.loadingScreen}><Loader size={48} /></View>;
    }

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <ArrowLeft size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <View style={{ width: 36 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {/* Avatar */}
                    <View style={styles.avatarBlock}>
                        <View style={styles.avatarWrap}>
                            {avatarUrl ? (
                                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPh}><User size={44} color={colors.primary} /></View>
                            )}
                            <TouchableOpacity style={styles.cameraBadge} onPress={pickImage} activeOpacity={0.85}>
                                <Camera size={16} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.avatarHint}>Tap the camera to change your photo</Text>
                    </View>

                    {/* Identity */}
                    <Text style={styles.sectionLabel}>Identity</Text>
                    <View style={styles.card}>
                        <Field icon={<UserCircle size={19} color={colors.textSecondary} />} label="Full Name" value={profile.name} onChangeText={(t) => handleChange("name", t)} styles={styles} colors={colors} divider />
                        <Field icon={<Phone size={19} color={colors.textSecondary} />} label="Mobile Number" value={profile.mobile} onChangeText={(t) => handleChange("mobile", t)} keyboardType="phone-pad" styles={styles} colors={colors} />
                    </View>

                    {/* Location */}
                    <Text style={styles.sectionLabel}>Location</Text>
                    <View style={styles.card}>
                        <Field icon={<MapPin size={19} color={colors.textSecondary} />} label="City" value={profile.city} onChangeText={(t) => handleChange("city", t)} styles={styles} colors={colors} divider />
                        <Field icon={<Globe size={19} color={colors.textSecondary} />} label="State" value={profile.state} onChangeText={(t) => handleChange("state", t)} styles={styles} colors={colors} />
                    </View>

                    {/* Personal */}
                    <Text style={styles.sectionLabel}>Personal</Text>
                    <View style={styles.card}>
                        <Field icon={<Briefcase size={19} color={colors.textSecondary} />} label="Profession" value={profile.profession} onChangeText={(t) => handleChange("profession", t)} styles={styles} colors={colors} divider />
                        <Field icon={<Heart size={19} color={colors.textSecondary} />} label="Favorite Place" value={profile.favoritePlace} onChangeText={(t) => handleChange("favoritePlace", t)} styles={styles} colors={colors} divider />
                        <Field icon={<AlignLeft size={19} color={colors.textSecondary} />} label="Bio" value={profile.bio} onChangeText={(t) => handleChange("bio", t)} multiline styles={styles} colors={colors} />
                    </View>

                    <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                        {saving ? <Loader size={20} color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const Field = ({ icon, label, value, onChangeText, styles, colors, divider, multiline, ...props }) => (
    <View style={styles.fieldRow}>
        <View style={styles.fieldIcon}>{icon}</View>
        <View style={[styles.fieldContent, divider && styles.fieldDivider]}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                style={[styles.fieldInput, multiline && styles.fieldTextarea]}
                placeholder={`Enter ${label.toLowerCase()}`}
                placeholderTextColor={colors.placeholder}
                selectionColor={colors.primary}
                multiline={multiline}
                textAlignVertical={multiline ? "top" : "center"}
                {...props}
            />
        </View>
    </View>
);

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingScreen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
    scroll: { padding: 16, paddingBottom: 50 },

    avatarBlock: { alignItems: "center", marginVertical: 8 },
    avatarWrap: { position: "relative" },
    avatar: { width: 104, height: 104, borderRadius: 52, borderWidth: 3, borderColor: colors.card },
    avatarPh: {
        width: 104, height: 104, borderRadius: 52, backgroundColor: colors.card,
        alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: colors.border,
    },
    cameraBadge: {
        position: "absolute", bottom: 2, right: 2, width: 34, height: 34, borderRadius: 17,
        backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
        borderWidth: 3, borderColor: colors.background,
    },
    avatarHint: { fontSize: 12, color: colors.textSecondary, marginTop: 10 },

    sectionLabel: {
        fontSize: 12, fontWeight: "700", color: colors.textSecondary,
        textTransform: "uppercase", letterSpacing: 0.5, marginTop: 22, marginBottom: 8, marginLeft: 2,
    },
    card: { backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },

    fieldRow: { flexDirection: "row", alignItems: "flex-start", paddingLeft: 14 },
    fieldIcon: { width: 30, paddingTop: 16 },
    fieldContent: { flex: 1, paddingVertical: 10, paddingRight: 14 },
    fieldDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
    fieldLabel: { fontSize: 11.5, fontWeight: "600", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.3 },
    fieldInput: { fontSize: 15, color: colors.text, fontWeight: "500", paddingVertical: 4, marginTop: 2 },
    fieldTextarea: { minHeight: 64 },

    saveBtn: {
        marginTop: 28, height: 52, borderRadius: 8, backgroundColor: colors.primary,
        alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8,
    },
    saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
