import { useBottomSpacing } from "@/hooks/useSafeSpacing";
import ReferralSection from "@/components/ReferralSection";
import { ScreenHeader } from "@/components/ui/Design";
import { useTheme } from "@/context/ThemeContext";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StatusBar, StyleSheet } from "react-native";
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
            <ScreenHeader flat back title="Refer & earn" />

            <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomSpacing }]} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}>
                <ReferralSection refreshKey={refreshKey} />
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingTop: 4, paddingBottom: 50 },
});
