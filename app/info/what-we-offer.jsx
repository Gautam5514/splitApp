import { useTheme } from "@/context/ThemeContext";
import { router } from "expo-router";
import {
    ArrowLeft,
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
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
    const { colors } = useTheme();
    const styles = getStyles(colors);

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <ArrowLeft size={20} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.eyebrow}>What we offer</Text>
                <Text style={styles.title}>Everything to split smarter</Text>
                <Text style={styles.description}>
                    From AI receipt scanning to one-tap settlement and rewards, SplitEase covers the whole journey.
                </Text>

                <Text style={styles.sectionHeading}>Core features</Text>
                {FEATURES.map((f) => {
                    const Icon = f.icon;
                    return (
                        <View key={f.title} style={styles.card}>
                            <View style={styles.cardIcon}>
                                <Icon size={20} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardTitle}>{f.title}</Text>
                                <Text style={styles.cardDesc}>{f.desc}</Text>
                            </View>
                        </View>
                    );
                })}

                <Text style={styles.sectionHeading}>How referrals work</Text>
                {REFERRAL_STEPS.map((s, i) => {
                    const Icon = s.icon;
                    return (
                        <View key={s.title} style={styles.card}>
                            <View style={styles.cardIcon}>
                                <Icon size={20} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardTitle}>
                                    {i + 1}. {s.title}
                                </Text>
                                <Text style={styles.cardDesc}>{s.desc}</Text>
                            </View>
                        </View>
                    );
                })}

                <Text style={styles.sectionHeading}>Elite Club tiers</Text>
                {TIERS.map((t) => (
                    <View key={t.name} style={[styles.tierCard, t.featured && styles.tierFeatured]}>
                        <View style={styles.tierLeft}>
                            <Trophy size={18} color={t.featured ? colors.warning : colors.textSecondary} />
                            <View>
                                <Text style={styles.tierName}>{t.name}</Text>
                                <Text style={styles.tierPerk}>{t.perk}</Text>
                            </View>
                        </View>
                        <View style={styles.tierCoins}>
                            <Coins size={14} color="#B45309" />
                            <Text style={styles.tierCoinsText}>{t.coins}</Text>
                        </View>
                    </View>
                ))}

                <TouchableOpacity style={styles.cta} onPress={() => router.push("/(tabs)/profile")} activeOpacity={0.85}>
                    <Text style={styles.ctaText}>View my rewards</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 12, paddingVertical: 8 },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    scroll: { paddingHorizontal: 20, paddingBottom: 48 },
    eyebrow: { fontSize: 12, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase", color: colors.primary, marginBottom: 8 },
    title: { fontSize: 30, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
    description: { fontSize: 15, lineHeight: 23, color: colors.textSecondary, marginTop: 10 },
    sectionHeading: { fontSize: 18, fontWeight: "800", color: colors.text, marginTop: 28, marginBottom: 2 },
    card: {
        flexDirection: "row", alignItems: "flex-start", gap: 14,
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        borderRadius: 14, padding: 16, marginTop: 12,
    },
    cardIcon: {
        width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryLight,
        alignItems: "center", justifyContent: "center",
    },
    cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
    cardDesc: { fontSize: 13, lineHeight: 20, color: colors.textSecondary, marginTop: 3 },
    tierCard: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        borderRadius: 14, padding: 16, marginTop: 12,
    },
    tierFeatured: { borderColor: colors.warning, borderWidth: 2 },
    tierLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
    tierName: { fontSize: 15, fontWeight: "700", color: colors.text },
    tierPerk: { fontSize: 12, color: colors.textSecondary, marginTop: 2, maxWidth: 200 },
    tierCoins: {
        flexDirection: "row", alignItems: "center", gap: 4,
        backgroundColor: "#FEF3C7", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
    },
    tierCoinsText: { fontSize: 13, fontWeight: "800", color: "#92400E" },
    cta: {
        backgroundColor: colors.primary, paddingVertical: 15, borderRadius: 14,
        alignItems: "center", marginTop: 24,
    },
    ctaText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
