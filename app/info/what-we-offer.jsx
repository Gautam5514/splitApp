import { Block, IconCircle, PillButton, ScreenHeader, useDesign } from "@/components/ui/Design";
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
    const { colors, t } = useDesign();
    const bottomSpacing = useBottomSpacing(32);
    const styles = getStyles(colors);

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <ScreenHeader title="What we offer" back />

            <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomSpacing }]} showsVerticalScrollIndicator={false}>
                <Text style={styles.eyebrow}>Everything to split smarter</Text>
                <Text style={styles.description}>
                    From AI receipt scanning to one-tap settlement and rewards, SplitEase covers the whole journey.
                </Text>

                <Text style={styles.sectionHeading}>Core features</Text>
                {FEATURES.map((f) => {
                    const Icon = f.icon;
                    return (
                        <Block key={f.title} style={styles.rowBlock}>
                            <IconCircle size={44}>
                                <Icon size={20} color={colors.primary} />
                            </IconCircle>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardTitle}>{f.title}</Text>
                                <Text style={styles.cardDesc}>{f.desc}</Text>
                            </View>
                        </Block>
                    );
                })}

                <Text style={styles.sectionHeading}>How referrals work</Text>
                {REFERRAL_STEPS.map((s, i) => {
                    const Icon = s.icon;
                    return (
                        <Block key={s.title} style={styles.rowBlock}>
                            <IconCircle size={44}>
                                <Icon size={20} color={colors.primary} />
                            </IconCircle>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardTitle}>
                                    {i + 1}. {s.title}
                                </Text>
                                <Text style={styles.cardDesc}>{s.desc}</Text>
                            </View>
                        </Block>
                    );
                })}

                <Text style={styles.sectionHeading}>Elite Club tiers</Text>
                {TIERS.map((tier) => (
                    <Block key={tier.name} style={[styles.tierBlock, tier.featured && { borderColor: t.ink, borderWidth: 1.5 }]}>
                        <View style={styles.tierLeft}>
                            <Trophy size={18} color={tier.featured ? colors.warning : colors.textSecondary} />
                            <View>
                                <Text style={styles.tierName}>{tier.name}</Text>
                                <Text style={styles.tierPerk}>{tier.perk}</Text>
                            </View>
                        </View>
                        <View style={styles.tierCoins}>
                            <Coins size={14} color="#B45309" />
                            <Text style={styles.tierCoinsText}>{tier.coins}</Text>
                        </View>
                    </Block>
                ))}

                <PillButton
                    label="View my rewards"
                    onPress={() => router.push("/(tabs)/profile")}
                    style={styles.cta}
                />
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingTop: 4, paddingBottom: 48 },
    eyebrow: { fontSize: 12, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase", color: colors.primary, marginBottom: 8, marginHorizontal: SCREEN_GUTTER },
    description: { fontSize: 15, lineHeight: 23, color: colors.textSecondary, marginTop: 4, marginHorizontal: SCREEN_GUTTER },
    sectionHeading: { fontSize: 18, fontWeight: "800", color: colors.text, marginTop: 28, marginBottom: 2, marginHorizontal: SCREEN_GUTTER },
    rowBlock: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
    cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
    cardDesc: { fontSize: 13, lineHeight: 20, color: colors.textSecondary, marginTop: 3 },
    tierBlock: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    tierLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
    tierName: { fontSize: 15, fontWeight: "700", color: colors.text },
    tierPerk: { fontSize: 12, color: colors.textSecondary, marginTop: 2, maxWidth: 200 },
    tierCoins: {
        flexDirection: "row", alignItems: "center", gap: 4,
        backgroundColor: "#FEF3C7", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
    },
    tierCoinsText: { fontSize: 13, fontWeight: "800", color: "#92400E" },
    cta: { marginHorizontal: SCREEN_GUTTER, marginTop: 4 },
});
