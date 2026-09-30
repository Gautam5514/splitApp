import { useBottomSpacing } from "@/hooks/useSafeSpacing";
import { SCREEN_GUTTER } from "@/constants/layout";
import CoinBadge from "@/components/CoinBadge";
import ReferralSection from "@/components/ReferralSection";
import { ScreenHeader } from "@/components/ui/Design";
import { useTheme } from "@/context/ThemeContext";
import { ScrollView, StatusBar, StyleSheet } from "react-native";
import { Text } from "@/components/ui/Typography";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RewardsScreen() {
    const { colors, theme } = useTheme();
    const bottomSpacing = useBottomSpacing(32);
    const styles = getStyles(colors);

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />
            <ScreenHeader title="Referrals & Rewards" back right={<CoinBadge />} />

            <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomSpacing }]} showsVerticalScrollIndicator={false}>
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
    scroll: { paddingTop: 4, paddingBottom: 50 },
    intro: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 19, marginBottom: 16, paddingHorizontal: SCREEN_GUTTER },
});
