import { useBottomSpacing } from "@/hooks/useSafeSpacing";
import { useAuth } from "@/context/AuthContext";
import { Loader } from "@/components/Loader";
import { RoundButton } from "@/components/ui/Design";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import { auth } from "@/lib/firebaseClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import {
    ChevronLeft,
    ChevronRight,
    FileText,
    Gift,
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
    UserCog,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert } from "@/lib/alert";
import {
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    TouchableOpacity,
    View,
} from "react-native";
import { Text } from "@/components/ui/Typography";
import { SafeAreaView } from "react-native-safe-area-context";
import { SCREEN_GUTTER } from "@/constants/layout";

export default function SettingsScreen() {
    const { logout } = useAuth();
    const { theme, toggleTheme, colors } = useTheme();
    const bottomSpacing = useBottomSpacing(24);
    const isDark = theme === "dark";
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
            { text: "Log out", style: "destructive", onPress: async () => { await logout(); router.replace("/auth/login"); } },
        ]);
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            {/* Header: back button + centered title */}
            <View style={styles.header}>
                <RoundButton onPress={() => router.back()} label="Back">
                    <ChevronLeft size={22} color={colors.text} strokeWidth={2.3} />
                </RoundButton>
                <Text style={styles.pageTitle}>Settings</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomSpacing }]} showsVerticalScrollIndicator={false}>
                {/* Account */}
                <Section label="Account" styles={styles}>
                    <Row styles={styles} colors={colors} Icon={Mail} label="Email" value={email || "—"} hideChevron />
                    <Divider styles={styles} />
                    <Row styles={styles} colors={colors} Icon={UserCog} label="Edit profile" onPress={() => router.push("/profile-edit")} />
                    <Divider styles={styles} />
                    <Row styles={styles} colors={colors} Icon={KeyRound} label="Change password" onPress={changePassword} />
                    <Divider styles={styles} />
                    <Row styles={styles} colors={colors} Icon={ShieldCheck} label="Groups & privacy" onPress={() => router.push("/privacy")} />
                    <Divider styles={styles} />
                    <Row styles={styles} colors={colors} Icon={Mail} label="Group invites" onPress={() => router.push("/invites")} />
                </Section>

                {/* Appearance */}
                <Section label="Appearance" styles={styles}>
                    <Row
                        styles={styles} colors={colors} Icon={Moon} label="Dark mode" hideChevron
                        trailing={
                            <Switch
                                value={isDark}
                                onValueChange={toggleTheme}
                                trackColor={{ false: "#E5E7EB", true: colors.primary }}
                                thumbColor="#fff"
                                ios_backgroundColor="#E5E7EB"
                            />
                        }
                    />
                    {Platform.OS === "android" && (
                        <>
                            <Divider styles={styles} />
                            <Row styles={styles} colors={colors} Icon={PanelsTopLeft} label="Home screen widget" value="Design" onPress={() => router.push("/widget-customize")} />
                        </>
                    )}
                </Section>

                {/* Discover */}
                <Section label="Discover" styles={styles}>
                    <Row styles={styles} colors={colors} Icon={Sparkles} label="How it works" onPress={() => router.push("/info/how-it-works")} />
                    <Divider styles={styles} />
                    <Row styles={styles} colors={colors} Icon={Gift} label="What we offer" onPress={() => router.push("/info/what-we-offer")} />
                    <Divider styles={styles} />
                    <Row styles={styles} colors={colors} Icon={Tag} label="Pricing" onPress={() => router.push("/info/pricing")} />
                </Section>

                {/* About & Legal */}
                <Section label="About & Legal" styles={styles}>
                    <Row styles={styles} colors={colors} Icon={FileText} label="Terms of Service" onPress={() => router.push("/info/terms")} />
                    <Divider styles={styles} />
                    <Row styles={styles} colors={colors} Icon={ShieldCheck} label="Privacy Policy" onPress={() => router.push("/info/privacy")} />
                    <Divider styles={styles} />
                    <Row styles={styles} colors={colors} Icon={FileText} label="Help Center" onPress={() => router.push("/info/help-center")} />
                </Section>

                {/* Storage */}
                <Section label="Storage" styles={styles}>
                    <Row styles={styles} colors={colors} Icon={Trash} label="Clear cached data" onPress={clearCache} />
                </Section>

                {/* Danger zone */}
                <Section label="Danger Zone" styles={styles}>
                    <Row
                        styles={styles} colors={colors} Icon={Trash2} label="Delete account permanently" danger
                        onPress={deleting ? undefined : confirmDelete}
                        trailing={deleting ? <Loader size={16} color={colors.error} /> : undefined}
                        hideChevron={deleting}
                    />
                    <Divider styles={styles} />
                    <Row styles={styles} colors={colors} Icon={LogOut} label="Log Out" danger hideChevron onPress={doLogout} />
                </Section>

                <Text style={styles.version}>SplitEase · v1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

/* ── Reusable pieces (match profile page) ───────────────────────────────── */
function Section({ label, children, styles }) {
    return (
        <View>
            <Text style={styles.sectionLabel}>{label}</Text>
            <View style={styles.card}>{children}</View>
        </View>
    );
}

function Row({ styles, colors, Icon, label, value, trailing, onPress, danger, hideChevron }) {
    const tint = danger ? colors.error : colors.text;
    const Wrapper = onPress ? TouchableOpacity : View;
    return (
        <Wrapper style={styles.row} activeOpacity={0.7} onPress={onPress} accessibilityRole={onPress ? "button" : undefined} accessibilityLabel={label}>
            <View style={styles.rowIcon}><Icon size={21} color={tint} strokeWidth={1.9} /></View>
            <Text style={[styles.rowLabel, { color: tint }]} numberOfLines={1}>{label}</Text>
            {value ? <Text style={styles.rowValue} numberOfLines={1}>{value}</Text> : null}
            {trailing ?? (!hideChevron && <ChevronRight size={20} color={colors.textSecondary} />)}
        </Wrapper>
    );
}

function Divider({ styles }) {
    return <View style={styles.divider} />;
}

const getStyles = (colors, isDark) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: SCREEN_GUTTER, paddingTop: 4, paddingBottom: 12 },
    pageTitle: { flex: 1, fontSize: 20, fontWeight: "800", color: colors.text, textAlign: "center", letterSpacing: -0.3 },
    headerSpacer: { width: 44, height: 44 },

    scroll: { paddingHorizontal: SCREEN_GUTTER, paddingTop: 4, paddingBottom: 40 },

    sectionLabel: { fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginBottom: 10, marginLeft: 4 },
    card: {
        backgroundColor: colors.card, borderRadius: 22,
        borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
        paddingHorizontal: 16, marginBottom: 26,
        shadowColor: "#0F172A", shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0 : 0.05, shadowRadius: 16, elevation: isDark ? 0 : 2,
    },

    row: { flexDirection: "row", alignItems: "center", paddingVertical: 15 },
    rowIcon: { width: 30, alignItems: "flex-start", justifyContent: "center" },
    rowLabel: { flex: 1, fontSize: 16, fontWeight: "500", color: colors.text },
    rowValue: { fontSize: 14, color: colors.textSecondary, marginRight: 8, maxWidth: 170 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 30 },

    version: { textAlign: "center", fontSize: 12, color: colors.textSecondary, marginTop: 6 },
});
