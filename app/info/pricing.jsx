import { Block, PillButton, ScreenHeader, useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { SCREEN_GUTTER } from "@/constants/layout";
import { useBottomSpacing } from "@/hooks/useSafeSpacing";
import { router } from "expo-router";
import { Check, Clock, Sparkles } from "lucide-react-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PLANS = [
    {
        name: "SplitEase",
        price: "Free",
        blurb: "Everything you need to split with friends. Groups, AI receipt scanning, chat, and UPI settlement.",
        cta: "Start for free",
        highlight: true,
    },
    {
        name: "SplitEase Pro",
        price: "Coming Soon",
        blurb: "Power features for heavy groups. Reports, exports, multi-currency, and priority scanning.",
        cta: "Get in touch",
        highlight: false,
    },
];

const FEATURE_GROUPS = [
    {
        title: "Groups & Splitting",
        features: [
            ["Unlimited groups", true],
            ["Unlimited members per group", true],
            ["Equal, percent, shares & exact splits", true],
            ["Shared group notepad", true],
        ],
    },
    {
        title: "AI & Receipts",
        features: [
            ["Auto-itemized line entries", true],
            ["Built-in AI assistant", true],
            ["Priority scan queue", "soon"],
            ["Bulk receipt import", "soon"],
        ],
    },
    {
        title: "Chat & Settling",
        features: [
            ["Real-time group chat", true],
            ["Payments recorded in chat", true],
            ["Minimum-transfer settlement", true],
            ["One-tap UPI settle up", true],
            ["Automatic payment reminders", "soon"],
        ],
    },
    {
        title: "Insights",
        features: [
            ["Live balance dashboard", true],
            ["Spending charts", true],
            ["Monthly spend reports", "soon"],
            ["Multi-currency groups", "soon"],
        ],
    },
];

const FAQS = [
    { q: "Is SplitEase really free?", a: "Yes. Every core feature, including groups, splits, AI receipt scanning, chat, and UPI settlement, is free. There are no member caps, trial timers, or locked features." },
    { q: "Will I ever have to pay?", a: "The core app stays free. SplitEase Pro will be an optional paid tier later, adding power features like reports, exports, and multi-currency." },
    { q: "Is there a limit on groups or friends?", a: "No. Create as many groups as you need and invite as many friends as you like. There are no per-member charges." },
    { q: "Do I need a card to sign up?", a: "No. Sign up with your email or Google account and start splitting immediately." },
];

export default function PricingScreen() {
    const { colors, t } = useDesign();
    const bottomSpacing = useBottomSpacing(32);
    const styles = getStyles(colors);

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <ScreenHeader title="Pricing" back />

            <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomSpacing }]} showsVerticalScrollIndicator={false}>
                <Text style={styles.eyebrow}>Simple, honest pricing</Text>
                <Text style={styles.description}>
                    The core app is free forever. A Pro tier is on the way for power users.
                </Text>

                {PLANS.map((plan) => (
                    <Block
                        key={plan.name}
                        style={[styles.planBlock, plan.highlight && { borderColor: t.ink, borderWidth: 1.5 }]}
                    >
                        {plan.highlight && (
                            <View style={[styles.badge, { backgroundColor: t.ink }]}>
                                <Sparkles size={12} color={colors.onPrimary} />
                                <Text style={[styles.badgeText, { color: colors.onPrimary }]}>Most popular</Text>
                            </View>
                        )}
                        <Text style={styles.planName}>{plan.name}</Text>
                        <Text style={styles.planPrice}>{plan.price}</Text>
                        <Text style={styles.planBlurb}>{plan.blurb}</Text>
                        <PillButton
                            label={plan.cta}
                            variant={plan.highlight ? "primary" : "secondary"}
                            onPress={() => (plan.highlight ? router.replace("/(tabs)/home") : router.push("/info/contact"))}
                            style={styles.planCta}
                        />
                    </Block>
                ))}

                <Text style={styles.sectionHeading}>What{"'"}s included</Text>
                {FEATURE_GROUPS.map((group) => (
                    <Block key={group.title} style={styles.block}>
                        <Text style={styles.cardTitle}>{group.title}</Text>
                        {group.features.map(([label, state]) => (
                            <View key={label} style={styles.featureRow}>
                                {state === "soon" ? (
                                    <Clock size={16} color={colors.warning} />
                                ) : (
                                    <Check size={16} color={colors.success} />
                                )}
                                <Text style={styles.featureLabel}>{label}</Text>
                                {state === "soon" && <Text style={styles.soonTag}>Soon</Text>}
                            </View>
                        ))}
                    </Block>
                ))}

                <Text style={styles.sectionHeading}>Frequently asked</Text>
                {FAQS.map((f) => (
                    <Block key={f.q} style={styles.block}>
                        <Text style={styles.faqQ}>{f.q}</Text>
                        <Text style={styles.faqA}>{f.a}</Text>
                    </Block>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingTop: 4, paddingBottom: 48 },
    eyebrow: { fontSize: 12, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase", color: colors.primary, marginBottom: 8, marginHorizontal: SCREEN_GUTTER },
    description: { fontSize: 15, lineHeight: 23, color: colors.textSecondary, marginTop: 4, marginBottom: 8, marginHorizontal: SCREEN_GUTTER },
    planBlock: { gap: 6 },
    badge: {
        flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start",
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 4,
    },
    badgeText: { fontSize: 11, fontWeight: "800" },
    planName: { fontSize: 18, fontWeight: "800", color: colors.text },
    planPrice: { fontSize: 28, fontWeight: "800", color: colors.text },
    planBlurb: { fontSize: 14, lineHeight: 21, color: colors.textSecondary, marginVertical: 4 },
    planCta: { marginTop: 6 },
    sectionHeading: { fontSize: 18, fontWeight: "800", color: colors.text, marginTop: 28, marginBottom: 2, marginHorizontal: SCREEN_GUTTER },
    block: { gap: 10 },
    cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
    featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    featureLabel: { flex: 1, fontSize: 14, color: colors.text },
    soonTag: { fontSize: 11, fontWeight: "700", color: colors.warning },
    faqQ: { fontSize: 15, fontWeight: "700", color: colors.text },
    faqA: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
});
