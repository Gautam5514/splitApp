import { PillButton, ScreenHeader, SectionLabel, useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { SCREEN_GUTTER } from "@/constants/layout";
import { useBottomSpacing } from "@/hooks/useSafeSpacing";
import { router } from "expo-router";
import { Check, Clock } from "lucide-react-native";
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
    const { colors } = useDesign();
    const bottomSpacing = useBottomSpacing(32);
    const styles = getStyles(colors);

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <ScreenHeader flat back title="Pricing" />

            <ScrollView contentContainerStyle={{ paddingBottom: bottomSpacing }} showsVerticalScrollIndicator={false}>
                <Text style={styles.description}>
                    The core app is free forever. A Pro tier is on the way for power users.
                </Text>

                {PLANS.map((plan) => (
                    <View key={plan.name}>
                        <SectionLabel line>{plan.name}</SectionLabel>
                        <View style={styles.section}>
                            <Text style={[styles.planPrice, !plan.highlight && styles.planPriceMuted]}>{plan.price}</Text>
                            <Text style={styles.planBlurb}>{plan.blurb}</Text>
                            <PillButton
                                label={plan.cta}
                                variant={plan.highlight ? "primary" : "secondary"}
                                onPress={() => (plan.highlight ? router.replace("/(tabs)/home") : router.push("/info/contact"))}
                                style={styles.planCta}
                            />
                        </View>
                    </View>
                ))}

                {FEATURE_GROUPS.map((group) => (
                    <View key={group.title}>
                        <SectionLabel line>{group.title}</SectionLabel>
                        <View style={styles.section}>
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
                        </View>
                    </View>
                ))}

                <SectionLabel line>Questions</SectionLabel>
                <View style={[styles.section, styles.faqs]}>
                    {FAQS.map((f) => (
                        <View key={f.q} style={styles.faq}>
                            <Text style={styles.faqQ}>{f.q}</Text>
                            <Text style={styles.faqA}>{f.a}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    description: { fontSize: 15, lineHeight: 23, color: colors.textSecondary, marginBottom: 14, marginHorizontal: SCREEN_GUTTER },
    // Everything sits straight on the canvas under a lined heading (no cards)
    section: { paddingHorizontal: SCREEN_GUTTER, gap: 10, marginBottom: 18 },
    planPrice: { fontSize: 30, fontWeight: "700", color: colors.text, letterSpacing: -0.3 },
    planPriceMuted: { fontSize: 22, color: colors.textSecondary },
    planBlurb: { fontSize: 14.5, lineHeight: 22, color: colors.textSecondary },
    planCta: { marginTop: 4 },
    featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    featureLabel: { flex: 1, fontSize: 14.5, color: colors.text },
    soonTag: { fontSize: 12, fontWeight: "600", color: colors.warning },
    faqs: { gap: 16 },
    faq: { gap: 4 },
    faqQ: { fontSize: 15, fontWeight: "600", color: colors.text },
    faqA: { fontSize: 14.5, lineHeight: 22, color: colors.textSecondary },
});
