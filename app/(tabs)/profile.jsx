import { Skeleton } from "@/components/ui/Skeleton";
import { Alert } from "@/lib/alert";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import { auth } from "@/lib/firebaseClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import {
    ChevronRight,
    CircleUserRound,
    FileText,
    Gift,
    HelpCircle,
    Info,
    LogOut,
    Moon,
    Palette,
    ShieldCheck,
    Sun,
    User,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    TouchableOpacity,
    View,
} from "react-native";
import { Text } from "@/components/ui/Typography";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabScreenBottomPadding } from "@/hooks/useSafeSpacing";
import { SCREEN_GUTTER } from "@/constants/layout";

export default function ProfilePage() {
    const { logout } = useAuth();
    const { colors, theme, toggleTheme } = useTheme();
    const tabBottomPadding = useTabScreenBottomPadding();
    const insets = useSafeAreaInsets();
    const isFocused = useIsFocused();
    const isDark = theme === "dark";
    const styles = getStyles(colors, isDark);

    const [profile, setProfile] = useState({});
    const [googlePhoto, setGooglePhoto] = useState(null);
    const [loaded, setLoaded] = useState(false);

    const avatarUrl = profile.profileImage?.url || googlePhoto || auth?.currentUser?.photoURL;
    const nameKnown = profile.name || auth?.currentUser?.displayName;
    const emailKnown = profile.email || auth?.currentUser?.email;
    const displayName = nameKnown || "Your Name";
    const displayEmail = emailKnown || "you@example.com";
    // Placeholder text only after we know there's really nothing to show.
    const showSkeleton = !loaded && !nameKnown;
    const modeLabel = isDark ? "Black" : "Light";

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
            } finally {
                setLoaded(true);
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
        <View style={styles.container}>
            {isFocused && <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />}
            <ScrollView
                contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: tabBottomPadding }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Centered title */}
                <Text style={styles.pageTitle}>Profile</Text>

                {/* Profile card */}
                <TouchableOpacity style={styles.profileCard} activeOpacity={0.85} onPress={() => router.push("/profile-edit")}>
                    {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPh}><User size={34} color={colors.primary} /></View>
                    )}
                    <View style={styles.profileText}>
                        {showSkeleton ? (
                            <>
                                <Skeleton width={140} height={16} />
                                <Skeleton width={190} height={12} style={{ marginTop: 8 }} />
                            </>
                        ) : (
                            <>
                                <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
                                <Text style={styles.profileEmail} numberOfLines={1}>{displayEmail}</Text>
                            </>
                        )}
                    </View>
                </TouchableOpacity>

                {/* Account */}
                <Section label="Account" styles={styles}>
                    <Row styles={styles} colors={colors} Icon={CircleUserRound} label="Manage Profile" onPress={() => router.push("/profile-edit")} />
                    <Divider styles={styles} />
                    <Row
                        styles={styles} colors={colors} Icon={isDark ? Moon : Sun} label="Dark Mode" hideChevron
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
                    <Divider styles={styles} />
                    <Row styles={styles} colors={colors} Icon={ShieldCheck} label="Privacy & Security" onPress={() => router.push("/info/privacy")} />
                </Section>

                {/* Preferences */}
                <Section label="Preferences" styles={styles}>
                    <Row styles={styles} colors={colors} Icon={Palette} label="Appearance" value={modeLabel} onPress={() => router.push("/appearance")} />
                    <Divider styles={styles} />
                    <Row styles={styles} colors={colors} Icon={Gift} label="Referrals & Rewards" onPress={() => router.push("/rewards")} />
                    <Divider styles={styles} />
                    <Row styles={styles} colors={colors} Icon={Info} label="About Us" onPress={() => router.push("/info/what-we-offer")} />
                </Section>

                {/* Support */}
                <Section label="Support" styles={styles}>
                    <Row styles={styles} colors={colors} Icon={HelpCircle} label="Help Center" onPress={() => router.push("/info/help-center")} />
                    <Divider styles={styles} />
                    <Row styles={styles} colors={colors} Icon={FileText} label="Settings" onPress={() => router.push("/settings")} />
                    <Divider styles={styles} />
                    <Row styles={styles} colors={colors} Icon={LogOut} label="Log Out" danger onPress={doLogout} hideChevron />
                </Section>

                <Text style={styles.version}>SplitEase · v1.0.0</Text>
            </ScrollView>
        </View>
    );
}

/* ── Reusable pieces that match the reference style ─────────────────────── */
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
            {trailing ?? (!hideChevron && <ChevronRight size={20} color={colors.textSecondary} style={styles.rowChevron} />)}
        </Wrapper>
    );
}

function Divider({ styles }) {
    return <View style={styles.divider} />;
}

const getStyles = (colors, isDark) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingHorizontal: SCREEN_GUTTER, paddingBottom: 60 },

    pageTitle: { fontSize: 20, fontWeight: "800", color: colors.text, textAlign: "center", marginBottom: 18, letterSpacing: -0.3 },

    // Profile card
    profileCard: {
        flexDirection: "row", alignItems: "center", gap: 16,
        backgroundColor: colors.card, borderRadius: 22, padding: 16,
        borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
        shadowColor: "#0F172A", shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0 : 0.06, shadowRadius: 16, elevation: isDark ? 0 : 2,
        marginBottom: 26,
    },
    avatar: { width: 76, height: 76, borderRadius: 38 },
    avatarPh: {
        width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primaryLight,
        alignItems: "center", justifyContent: "center",
    },
    profileText: { flex: 1, minWidth: 0 },
    profileName: { fontSize: 20, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
    profileEmail: { fontSize: 13.5, color: colors.textSecondary, marginTop: 4 },

    // Section
    sectionLabel: { fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginBottom: 10, marginLeft: 4 },
    card: {
        backgroundColor: colors.card, borderRadius: 22,
        borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
        paddingHorizontal: 16, marginBottom: 26,
        shadowColor: "#0F172A", shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0 : 0.05, shadowRadius: 16, elevation: isDark ? 0 : 2,
    },

    // Row
    row: { flexDirection: "row", alignItems: "center", paddingVertical: 15 },
    rowIcon: { width: 30, alignItems: "flex-start", justifyContent: "center" },
    rowLabel: { flex: 1, fontSize: 16, fontWeight: "500", color: colors.text },
    rowValue: { fontSize: 14, color: colors.textSecondary, marginRight: 8 },
    rowChevron: {},
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 30 },

    version: { textAlign: "center", fontSize: 12, color: colors.textSecondary, marginTop: 6 },
});
