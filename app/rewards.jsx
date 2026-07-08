import CoinBadge from "@/components/CoinBadge";
import ReferralSection from "@/components/ReferralSection";
import { useTheme } from "@/context/ThemeContext";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RewardsScreen() {
    const { colors, theme } = useTheme();
    const styles = getStyles(colors);

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <ArrowLeft size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Referrals & Rewards</Text>
                <CoinBadge />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.intro}>
                    Invite friends to SplitEase and earn coins when they join. Track your referrals and balance below.
                </Text>
                <ReferralSection />
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 18, fontWeight: "800", color: colors.text, flex: 1, marginLeft: 4 },
    scroll: { padding: 16, paddingBottom: 50 },
    intro: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 19, marginBottom: 16 },
});
