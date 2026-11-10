import { useBottomSpacing } from "@/hooks/useSafeSpacing";
import { useAuth } from "@/context/AuthContext";
import { Loader } from "@/components/Loader";
import { IconCircle, ListRow, ScreenHeader, SectionLabel, useDesign } from "@/components/ui/Design";
import { TYPE } from "@/constants/design";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import { auth } from "@/lib/firebaseClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import {
    ChevronRight,
    FileText,
    KeyRound,
    LogOut,
    Mail,
    Moon,
    PanelsTopLeft,
    ShieldCheck,
    Sparkles,
    Tag,
    Trash,
    Trash2,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert } from "@/lib/alert";
import {
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    View,
} from "react-native";
import { Text } from "@/components/ui/Typography";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
    const { logout } = useAuth();
    const { toggleTheme, setAccent } = useTheme();
    const { colors, isDark, t } = useDesign();
    const bottomSpacing = useBottomSpacing(24);
    const styles = getStyles(colors, isDark);

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
                        const cacheKeys = keys.filter((k) => k.includes("cache") || k.includes("_v1"));
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
                { text: "Delete", style: "destructive", onPress: deleteAccount },
            ]
        );
    };

    const deleteAccount = async () => {
        try {
            setDeleting(true);
            await api.delete("/profile/account");
            await setAccent(null);
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
                    // Don't leave this person's cached profile for the next login.
                    await Promise.all([
                        AsyncStorage.removeItem("profile_cache_v1"),
                        AsyncStorage.removeItem("me_cache_v1"),
                        setAccent(null), // an unlocked theme belongs to the account, not the phone
                    ]).catch(() => {});
                    router.replace("/auth/login");
                },
            },
        ]);
    };

    // One row style for the whole screen: icon circle, label, value / chevron.
    const row = (Icon, title, onPress, extra = {}) => {
        const tint = extra.danger ? colors.error : colors.text;
        return (
            <ListRow
                style={[styles.row, extra.danger && styles.dangerRow]}
                onPress={onPress}
                title={title}
                subtitle={extra.subtitle}
                danger={extra.danger}
                leading={
                    <IconCircle size={40} tint={extra.danger ? dangerTint(isDark, 0.16) : t.fillStrong}>
                        <Icon size={18} color={tint} strokeWidth={2} />
                    </IconCircle>
                }
                trailing={
                    extra.trailing ?? (
                        <View style={styles.rowTrailing}>
                            {extra.value ? <Text style={styles.rowValue} numberOfLines={1}>{extra.value}</Text> : null}
                            {onPress ? <ChevronRight size={20} color={colors.textSecondary} /> : null}
                        </View>
                    )
                }
            />
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <ScreenHeader flat back title="Settings" />

            <ScrollView contentContainerStyle={{ paddingBottom: bottomSpacing }} showsVerticalScrollIndicator={false}>
                <SectionLabel line>Account</SectionLabel>
                <View style={styles.group}>
                    {row(Mail, "Email", undefined, { value: email || "—" })}
                    {row(KeyRound, "Change password", changePassword, { subtitle: "We'll email you a reset link" })}
                </View>

                <SectionLabel line>App</SectionLabel>
                <View style={styles.group}>
                    {row(Moon, "Dark mode", undefined, {
                        trailing: (
                            <Switch
                                value={isDark}
                                onValueChange={toggleTheme}
                                accessibilityLabel="Dark mode"
                                trackColor={{ false: t.fillStrong, true: isDark ? "#3A3A3C" : t.ink }}
                                thumbColor="#FFFFFF"
                                ios_backgroundColor={t.fillStrong}
                            />
                        ),
                    })}
                    {Platform.OS === "android" &&
                        row(PanelsTopLeft, "Home screen widget", () => router.push("/widget-customize"))}
                    {row(Trash, "Clear cached data", clearCache, { subtitle: "Your account is not affected" })}
                </View>

                <SectionLabel line>About</SectionLabel>
                <View style={styles.group}>
                    {row(Sparkles, "How it works", () => router.push("/info/how-it-works"))}
                    {row(Tag, "Pricing", () => router.push("/info/pricing"))}
                    {row(FileText, "Terms of Service", () => router.push("/info/terms"))}
                    {row(ShieldCheck, "Privacy Policy", () => router.push("/info/privacy"))}
                </View>

                <SectionLabel line>Leave</SectionLabel>
                <View style={styles.group}>
                    {row(LogOut, "Log out", doLogout)}
                    {row(Trash2, "Delete account", deleting ? undefined : confirmDelete, {
                        danger: true,
                        subtitle: "Permanently erases your account and data",
                        trailing: deleting ? <Loader size={16} color={colors.error} /> : undefined,
                    })}
                </View>

                <Text style={styles.version}>SplitEase v10.0.3</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

// Faded red: enough to say "careful", not a solid alarm block.
const dangerTint = (isDark, alpha) => (isDark ? `rgba(248,113,113,${alpha})` : `rgba(239,68,68,${alpha})`);

const getStyles = (colors, isDark) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    // Rows sit straight on the canvas under a lined heading (no cards) — same as Profile
    group: { marginBottom: 10 },
    row: { paddingVertical: 8 },
    // Inset 12 + padding 8 keeps the icon lined up with the rows above (gutter 20).
    dangerRow: {
        marginHorizontal: 12, marginTop: 4, paddingHorizontal: 8, paddingVertical: 10,
        borderRadius: 18, backgroundColor: dangerTint(isDark, 0.08),
    },
    rowTrailing: { flexDirection: "row", alignItems: "center", gap: 8, maxWidth: "55%" },
    rowValue: { ...TYPE.secondary, color: colors.textSecondary, flexShrink: 1 },
    version: { ...TYPE.meta, color: colors.textSecondary, textAlign: "center", marginTop: 12 },
});
