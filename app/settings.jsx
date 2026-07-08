import { useAuth } from "@/context/AuthContext";
import { Loader } from "@/components/Loader";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import { auth } from "@/lib/firebaseClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import {
    ArrowLeft,
    ChevronRight,
    FileText,
    Gift,
    KeyRound,
    LogOut,
    Mail,
    Moon,
    ShieldCheck,
    Sparkles,
    Tag,
    Trash2,
    Trash,
    UserCog,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
    const { logout } = useAuth();
    const { theme, toggleTheme, colors } = useTheme();
    const isDark = theme === "dark";
    const styles = getStyles(colors);

    const [email, setEmail] = useState("");
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        let alive = true;
        api
            .get("/profile")
            .then((res) => alive && setEmail(res.data?.email || auth.currentUser?.email || ""))
            .catch(() => alive && setEmail(auth.currentUser?.email || ""));
        return () => {
            alive = false;
        };
    }, []);

    const changePassword = async () => {
        const target = email || auth.currentUser?.email;
        if (!target) {
            Alert.alert("No email", "We couldn't find an email on your account.");
            return;
        }
        try {
            await sendPasswordResetEmail(auth, target);
            Alert.alert("Reset link sent", `Check ${target} for a password reset link.`);
        } catch (e) {
            Alert.alert("Couldn't send", e?.message || "Please try again later.");
        }
    };

    const clearCache = async () => {
        Alert.alert("Clear cached data", "This clears locally cached data. Your account is unaffected.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Clear",
                style: "destructive",
                onPress: async () => {
                    try {
                        const keys = await AsyncStorage.getAllKeys();
                        const cacheKeys = keys.filter(
                            (k) => k.includes("cache") || k.includes("_v1")
                        );
                        await AsyncStorage.multiRemove(cacheKeys);
                        Alert.alert("Done", "Cached data cleared.");
                    } catch {
                        Alert.alert("Error", "Couldn't clear cache.");
                    }
                },
            },
        ]);
    };

    const confirmDelete = () => {
        Alert.alert(
            "Delete account permanently",
            "This erases your account, groups you own, expenses and chats. This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: deleteAccount,
                },
            ]
        );
    };

    const deleteAccount = async () => {
        try {
            setDeleting(true);
            await api.delete("/profile/account");
            await logout();
            router.replace("/auth/login");
        } catch (e) {
            setDeleting(false);
            Alert.alert("Couldn't delete", e?.response?.data?.message || "Please try again.");
        }
    };

    const doLogout = () => {
        Alert.alert("Log out", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Log out",
                style: "destructive",
                onPress: async () => {
                    await logout();
                    router.replace("/auth/login");
                },
            },
        ]);
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <ArrowLeft size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Account */}
                <Text style={styles.sectionLabel}>Account</Text>
                <View style={styles.card}>
                    <Row icon={<Mail size={18} color={colors.textSecondary} />} label="Email" value={email || "—"} styles={styles} />
                    <Divider styles={styles} />
                    <Row
                        icon={<UserCog size={18} color={colors.textSecondary} />}
                        label="Edit profile"
                        onPress={() => router.push("/profile-edit")}
                        chevron
                        styles={styles}
                    />
                    <Divider styles={styles} />
                    <Row
                        icon={<KeyRound size={18} color={colors.textSecondary} />}
                        label="Change password"
                        onPress={changePassword}
                        chevron
                        styles={styles}
                    />
                </View>

                {/* Appearance */}
                <Text style={styles.sectionLabel}>Appearance</Text>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <Moon size={18} color={colors.textSecondary} />
                            <Text style={styles.rowLabel}>Dark mode</Text>
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

                {/* Discover */}
                <Text style={styles.sectionLabel}>Discover</Text>
                <View style={styles.card}>
                    <Row
                        icon={<Sparkles size={18} color={colors.textSecondary} />}
                        label="How it works"
                        onPress={() => router.push("/info/how-it-works")}
                        chevron
                        styles={styles}
                    />
                    <Divider styles={styles} />
                    <Row
                        icon={<Gift size={18} color={colors.textSecondary} />}
                        label="What we offer"
                        onPress={() => router.push("/info/what-we-offer")}
                        chevron
                        styles={styles}
                    />
                    <Divider styles={styles} />
                    <Row
                        icon={<Tag size={18} color={colors.textSecondary} />}
                        label="Pricing"
                        onPress={() => router.push("/info/pricing")}
                        chevron
                        styles={styles}
                    />
                </View>

                {/* Legal */}
                <Text style={styles.sectionLabel}>About & Legal</Text>
                <View style={styles.card}>
                    <Row
                        icon={<FileText size={18} color={colors.textSecondary} />}
                        label="Terms of Service"
                        onPress={() => router.push("/info/terms")}
                        chevron
                        styles={styles}
                    />
                    <Divider styles={styles} />
                    <Row
                        icon={<ShieldCheck size={18} color={colors.textSecondary} />}
                        label="Privacy Policy"
                        onPress={() => router.push("/info/privacy")}
                        chevron
                        styles={styles}
                    />
                    <Divider styles={styles} />
                    <Row
                        icon={<FileText size={18} color={colors.textSecondary} />}
                        label="Help Center"
                        onPress={() => router.push("/info/help-center")}
                        chevron
                        styles={styles}
                    />
                </View>

                {/* Storage */}
                <Text style={styles.sectionLabel}>Storage</Text>
                <View style={styles.card}>
                    <Row
                        icon={<Trash size={18} color={colors.textSecondary} />}
                        label="Clear cached data"
                        onPress={clearCache}
                        chevron
                        styles={styles}
                    />
                </View>

                {/* Danger zone */}
                <Text style={[styles.sectionLabel, { color: colors.error }]}>Danger Zone</Text>
                <View style={[styles.card, { borderColor: colors.error }]}>
                    <TouchableOpacity style={styles.dangerRow} onPress={confirmDelete} disabled={deleting} activeOpacity={0.7}>
                        <View style={styles.rowLeft}>
                            <Trash2 size={18} color={colors.error} />
                            <Text style={[styles.rowLabel, { color: colors.error }]}>Delete account permanently</Text>
                        </View>
                        {deleting ? (
                            <Loader size={16} color={colors.error} />
                        ) : (
                            <ChevronRight size={18} color={colors.error} />
                        )}
                    </TouchableOpacity>
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

function Row({ icon, label, value, onPress, chevron, styles }) {
    const content = (
        <View style={styles.row}>
            <View style={styles.rowLeft}>
                {icon}
                <Text style={styles.rowLabel}>{label}</Text>
            </View>
            <View style={styles.rowRight}>
                {value != null && <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>}
                {chevron && <ChevronRight size={18} color="#9CA3AF" />}
            </View>
        </View>
    );
    if (onPress) {
        return (
            <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
                {content}
            </TouchableOpacity>
        );
    }
    return content;
}

function Divider({ styles }) {
    return <View style={styles.divider} />;
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
    scroll: { padding: 16, paddingBottom: 40 },
    sectionLabel: {
        fontSize: 12,
        fontWeight: "700",
        color: colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginTop: 20,
        marginBottom: 8,
        marginLeft: 4,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    dangerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
    rowRight: { flexDirection: "row", alignItems: "center", gap: 6, maxWidth: "55%" },
    rowLabel: { fontSize: 15, fontWeight: "500", color: colors.text },
    rowValue: { fontSize: 13, color: colors.textSecondary, flexShrink: 1 },
    divider: { height: 1, backgroundColor: colors.border, marginLeft: 46 },
    logoutBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginTop: 24,
        paddingVertical: 15,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.error,
        backgroundColor: colors.errorLight,
    },
    logoutText: { fontSize: 15, fontWeight: "700", color: colors.error },
    version: { textAlign: "center", fontSize: 12, color: colors.textSecondary, marginTop: 20 },
});
