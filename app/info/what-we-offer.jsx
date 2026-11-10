import { IconCircle, PillButton, ScreenHeader, SectionLabel, useDesign } from "@/components/ui/Design";
import CoinIcon from "@/components/icons/CoinIcon";
import { Text } from "@/components/ui/Typography";
import { SCREEN_GUTTER } from "@/constants/layout";
import { useBottomSpacing } from "@/hooks/useSafeSpacing";
import { router } from "expo-router";
import {
    Calculator,
    Coins,
    Link2,
    MessageCircleMore,
    ScanLine,
    Trophy,
    UserPlus,
    Wallet,
    Zap,
} from "lucide-react-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FEATURES = [
    { icon: Calculator, title: "Smart Split Engine", desc: "Split equally, by percentage, shares, or exact amounts. The math is handled the moment an expense lands." },
    { icon: ScanLine, title: "AI Receipt Scanner", desc: "Snap any bill and OCR reads every line item, itemizes it, and adds it to the group automatically." },
    { icon: MessageCircleMore, title: "Settle Chat", desc: "Talk and split in the same place. Every expense and payment lives inside the group conversation." },
    { icon: Zap, title: "Minimal Transfers", desc: "Our optimizer nets all balances and routes the fewest possible payments to settle the whole group." },
    { icon: Wallet, title: "One-Tap UPI Settle", desc: "Clear every debt with UPI in seconds. Each settlement is recorded and balances reset to zero." },
    { icon: Trophy, title: "Elite Club Rewards", desc: "Earn coins by referring friends and unlock badges, custom themes, priority support, and early access." },
];

const REFERRAL_STEPS = [
    { icon: Link2, title: "Share your link", desc: "Your profile has a unique referral code. Share it anywhere." },
    { icon: UserPlus, title: "Friend joins", desc: "They sign up through your link and start splitting with their groups." },
    { icon: Zap, title: "Rewarded instantly", desc: "No waiting, no conditions — coins are credited the moment they join." },
    { icon: Coins, title: "You both earn", desc: "50 coins land in your wallet, 25 in theirs. Automatically." },
];

const TIERS = [
    { name: "Bronze", coins: "100", perk: "Bronze badge + 1 custom theme" },
    { name: "Silver", coins: "300", perk: "Silver badge + all custom themes" },
    { name: "Gold", coins: "750", perk: "Gold badge + priority support + early access" },
    { name: "Elite Club", coins: "1,500", perk: "Elite badge + every future reward", featured: true },
];

export default function WhatWeOfferScreen() {
    const { colors } = useDesign();
    const bottomSpacing = useBottomSpacing(32);
    const styles = getStyles(colors);

    const item = (Icon, title, desc) => (
        <View key={title} style={styles.item}>
            <IconCircle size={40} tint={colors.primaryLight}>
                <Icon size={18} color={colors.text} strokeWidth={2} />
            </IconCircle>
            <View style={styles.itemText}>
                <Text style={styles.itemTitle}>{title}</Text>
                <Text style={styles.itemDesc}>{desc}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <ScreenHeader flat back title="What SplitEase offers" />

            <ScrollView contentContainerStyle={{ paddingBottom: bottomSpacing }} showsVerticalScrollIndicator={false}>
                <Text style={styles.description}>
                    From AI receipt scanning to one-tap settlement and rewards, SplitEase covers the whole journey.
                </Text>

                <SectionLabel line>Features</SectionLabel>
                <View style={styles.section}>{FEATURES.map((f) => item(f.icon, f.title, f.desc))}</View>

                <SectionLabel line>How referrals work</SectionLabel>
                <View style={styles.section}>
                    {REFERRAL_STEPS.map((s, i) => item(s.icon, `${i + 1}. ${s.title}`, s.desc))}
                </View>

                <SectionLabel line>Elite Club tiers</SectionLabel>
                <View style={styles.section}>
                    {TIERS.map((tier) => (
                        <View key={tier.name} style={styles.tier}>
                            <Trophy size={18} color={tier.featured ? colors.warning : colors.textSecondary} />
                            <View style={styles.itemText}>
                                <Text style={styles.itemTitle}>{tier.name}</Text>
                                <Text style={styles.itemDesc}>{tier.perk}</Text>
                            </View>
                            <View style={styles.tierCoins}>
                                <CoinIcon size={18} />
                                <Text style={styles.tierCoinsText}>{tier.coins}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                <PillButton
                    label="View my rewards"
                    onPress={() => router.push("/rewards")}
                    style={styles.cta}
                />
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    description: { fontSize: 15, lineHeight: 23, color: colors.textSecondary, marginBottom: 14, marginHorizontal: SCREEN_GUTTER },
    // Everything sits straight on the canvas under a lined heading (no cards)
    section: { paddingHorizontal: SCREEN_GUTTER, gap: 16, marginBottom: 20 },
    item: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
    itemText: { flex: 1, minWidth: 0, gap: 3 },
    itemTitle: { fontSize: 16, fontWeight: "600", color: colors.text, letterSpacing: -0.2 },
    itemDesc: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
    tier: { flexDirection: "row", alignItems: "center", gap: 14 },
    tierCoins: { flexDirection: "row", alignItems: "center", gap: 5 },
    tierCoinsText: { fontSize: 15, fontWeight: "700", color: colors.text },
    cta: { marginHorizontal: SCREEN_GUTTER, marginTop: 2 },
});
