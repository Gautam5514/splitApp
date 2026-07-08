import CoinBadge from "@/components/CoinBadge";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import { auth } from "@/lib/firebaseClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
    Camera,
    ChevronRight,
    Gift,
    HelpCircle,
    LogOut,
    Moon,
    Palette,
    Settings as SettingsIcon,
    Sun,
    User,
    UserCog,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
    Alert,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const COVER_GRADIENT = ["#6366F1", "#8B5CF6"];

export default function ProfilePage() {
    const { logout } = useAuth();
    const { colors, theme, mode, toggleTheme } = useTheme();
    const isDark = theme === "dark";
    const styles = getStyles(colors, isDark);

    const [profile, setProfile] = useState({});
    const [googlePhoto, setGooglePhoto] = useState(null);

    const avatarUrl = profile.profileImage?.url || googlePhoto || auth?.currentUser?.photoURL;
    const displayName = profile.name || auth?.currentUser?.displayName || "Your Name";
    const displayEmail = profile.email || auth?.currentUser?.email || "you@example.com";
    const modeLabel = mode ? mode.charAt(0).toUpperCase() + mode.slice(1) : "Light";

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
                const [pRes, mRes] = await Promise.allSettled([api.get("/profile"), api.get("/users/me")]);
                if (pRes.status === "fulfilled") {
                    setProfile(pRes.value.data || {});
                    AsyncStorage.setItem("profile_cache_v1", JSON.stringify(pRes.value.data || {}));
                }
                if (mRes.status === "fulfilled") {
                    const me = mRes.value.data;
                    setGooglePhoto(me?.imageUrl || me?.photoURL || me?.profileImage?.url || null);
                    AsyncStorage.setItem("me_cache_v1", JSON.stringify(me));
                }
            } catch {
                // keep cache
            }
        })();
    }, []);

    const doLogout = () => {
        Alert.alert("Log out", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            { text: "Log out", style: "destructive", onPress: async () => { await logout(); router.replace("/auth/login"); } },
        ]);
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar barStyle="light-content" />
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Premium header */}
                <LinearGradient colors={COVER_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cover}>
                    <View style={styles.coverTop}>
                        <CoinBadge />
                        <TouchableOpacity style={styles.gear} onPress={() => router.push("/settings")} activeOpacity={0.8}>
                            <SettingsIcon size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                <View style={styles.identity}>
                    <View style={styles.avatarWrap}>
                        {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPh}><User size={44} color={colors.primary} /></View>
                        )}
                        <TouchableOpacity style={styles.cameraBadge} onPress={() => router.push("/profile-edit")} activeOpacity={0.85}>
                            <Camera size={15} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.name}>{displayName}</Text>
                    <Text style={styles.email}>{displayEmail}</Text>

                    <TouchableOpacity style={styles.editProfileBtn} onPress={() => router.push("/profile-edit")} activeOpacity={0.85}>
                        <UserCog size={15} color={colors.primary} />
                        <Text style={styles.editProfileText}>Edit Profile</Text>
                    </TouchableOpacity>
                </View>

                {/* Preferences */}
                <Text style={styles.sectionLabel}>Preferences</Text>
                <View style={styles.card}>
                    <MenuRow
                        styles={styles} colors={colors}
                        icon={<Palette size={19} color="#8B5CF6" />} iconBg="rgba(139,92,246,0.12)"
                        label="Appearance" sub={`${modeLabel} mode`}
                        onPress={() => router.push("/appearance")}
                    />
                    <Divider styles={styles} />
                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.rowIcon, { backgroundColor: "rgba(99,102,241,0.12)" }]}>
                                {isDark ? <Moon size={19} color="#6366F1" /> : <Sun size={19} color="#F59E0B" />}
                            </View>
                            <View>
                                <Text style={styles.rowLabel}>Dark Mode</Text>
                                <Text style={styles.rowSub}>Quick toggle</Text>
                            </View>
                        </View>
                        <Switch
                            value={isDark}
                            onValueChange={toggleTheme}
                            trackColor={{ false: "#E5E7EB", true: colors.primary }}
                            thumbColor="#fff"
                            ios_backgroundColor="#E5E7EB"
                        />
                    </View>
                </View>

                {/* Rewards */}
                <Text style={styles.sectionLabel}>Rewards</Text>
                <View style={styles.card}>
                    <MenuRow
                        styles={styles} colors={colors}
                        icon={<Gift size={19} color="#10B981" />} iconBg="rgba(16,185,129,0.12)"
                        label="Referrals & Rewards" sub="Invite friends, earn coins"
                        onPress={() => router.push("/rewards")}
                    />
                </View>

                {/* More */}
                <Text style={styles.sectionLabel}>More</Text>
                <View style={styles.card}>
                    <MenuRow
                        styles={styles} colors={colors}
                        icon={<SettingsIcon size={19} color={colors.textSecondary} />} iconBg={colors.primaryLight}
                        label="Settings" sub="Account, privacy & storage"
                        onPress={() => router.push("/settings")}
                    />
                    <Divider styles={styles} />
                    <MenuRow
                        styles={styles} colors={colors}
                        icon={<HelpCircle size={19} color={colors.textSecondary} />} iconBg={colors.primaryLight}
                        label="Help Center" sub="Guides & support"
                        onPress={() => router.push("/info/help-center")}
                    />
                </View>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutBtn} onPress={doLogout} activeOpacity={0.85}>
                    <LogOut size={18} color={colors.error} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <Text style={styles.version}>SplitEase · v1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

function MenuRow({ icon, iconBg, label, sub, onPress, styles, colors }) {
    return (
        <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
                <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>{icon}</View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{label}</Text>
                    {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
                </View>
            </View>
            <ChevronRight size={19} color={colors.textSecondary} />
        </TouchableOpacity>
    );
}

const Divider = ({ styles }) => <View style={styles.divider} />;

const getStyles = (colors, isDark) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingBottom: 60 },

    cover: { height: 130, paddingTop: 8 },
    coverTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
    gear: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },

    identity: { alignItems: "center", marginTop: -52, paddingHorizontal: 16, marginBottom: 8 },
    avatarWrap: { position: "relative" },
    avatar: { width: 104, height: 104, borderRadius: 52, borderWidth: 4, borderColor: colors.background },
    avatarPh: {
        width: 104, height: 104, borderRadius: 52, backgroundColor: colors.card,
        alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: colors.background,
    },
    cameraBadge: {
        position: "absolute", bottom: 4, right: 4, width: 32, height: 32, borderRadius: 16,
        backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
        borderWidth: 3, borderColor: colors.background,
    },
    name: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: 12, letterSpacing: -0.4 },
    email: { fontSize: 13.5, color: colors.textSecondary, marginTop: 3 },
    editProfileBtn: {
        flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14,
        paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999,
        borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.primaryLight,
    },
    editProfileText: { fontSize: 13.5, fontWeight: "700", color: colors.primary },

    sectionLabel: {
        fontSize: 12, fontWeight: "700", color: colors.textSecondary,
        textTransform: "uppercase", letterSpacing: 0.5, marginTop: 22, marginBottom: 8, marginLeft: 20,
    },
    card: {
        marginHorizontal: 16, backgroundColor: colors.card, borderRadius: 8,
        borderWidth: 1, borderColor: colors.border, overflow: "hidden",
    },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 13 },
    rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
    rowIcon: { width: 38, height: 38, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    rowLabel: { fontSize: 15, fontWeight: "600", color: colors.text },
    rowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
    divider: { height: 1, backgroundColor: colors.border, marginLeft: 64 },

    logoutBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        marginHorizontal: 16, marginTop: 26, paddingVertical: 15, borderRadius: 8,
        borderWidth: 1, borderColor: colors.error, backgroundColor: colors.errorLight,
    },
    logoutText: { fontSize: 15, fontWeight: "700", color: colors.error },
    version: { textAlign: "center", fontSize: 12, color: colors.textSecondary, marginTop: 18 },
});
