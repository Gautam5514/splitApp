import { useBottomSpacing } from "@/hooks/useSafeSpacing";
import { SCREEN_GUTTER } from "@/constants/layout";
import CoinBadge from "@/components/CoinBadge";
import ReferralSection from "@/components/ReferralSection";
import { ScreenHeader } from "@/components/ui/Design";
import { useTheme } from "@/context/ThemeContext";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StatusBar, StyleSheet } from "react-native";
import { Text } from "@/components/ui/Typography";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RewardsScreen() {
    const { colors, theme } = useTheme();
    const bottomSpacing = useBottomSpacing(32);
    const styles = getStyles(colors);
    const [refreshKey, setRefreshKey] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setRefreshKey((k) => k + 1);
        setTimeout(() => setRefreshing(false), 900);
    }, []);

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />
            <ScreenHeader title="Referrals & Rewards" back right={<CoinBadge />} />

            <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomSpacing }]} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}>
                <Text style={styles.intro}>
                    Invite friends to SplitEase and earn coins when they join. Track your referrals and balance below.
                </Text>
                <ReferralSection refreshKey={refreshKey} />
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingTop: 4, paddingBottom: 50 },
    intro: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 19, marginBottom: 16, paddingHorizontal: SCREEN_GUTTER },
});
