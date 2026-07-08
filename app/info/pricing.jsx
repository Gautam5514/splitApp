import { useTheme } from "@/context/ThemeContext";
import { router } from "expo-router";
import { ArrowLeft, Check, Clock, Sparkles } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
                <Text style={styles.eyebrow}>Pricing</Text>
                <Text style={styles.title}>Simple, honest pricing</Text>
                <Text style={styles.description}>
                    The core app is free forever. A Pro tier is on the way for power users.
                </Text>

                {PLANS.map((plan) => (
                    <View
                        key={plan.name}
                        style={[styles.planCard, plan.highlight && styles.planCardHighlight]}
                    >
                        {plan.highlight && (
                            <View style={styles.badge}>
                                <Sparkles size={12} color="#FFFFFF" />
                                <Text style={styles.badgeText}>Most popular</Text>
                            </View>
                        )}
                        <Text style={styles.planName}>{plan.name}</Text>
                        <Text style={[styles.planPrice, plan.highlight && { color: colors.primary }]}>{plan.price}</Text>
                        <Text style={styles.planBlurb}>{plan.blurb}</Text>
                        <TouchableOpacity
                            style={[styles.planCta, plan.highlight ? styles.planCtaPrimary : styles.planCtaOutline]}
                            onPress={() => (plan.highlight ? router.replace("/(tabs)/home") : router.push("/info/contact"))}
                            activeOpacity={0.85}
                        >
                            <Text style={[styles.planCtaText, plan.highlight && { color: "#FFFFFF" }]}>{plan.cta}</Text>
                        </TouchableOpacity>
                    </View>
                ))}

                <Text style={styles.sectionHeading}>What's included</Text>
                {FEATURE_GROUPS.map((group) => (
                    <View key={group.title} style={styles.card}>
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
                    </View>
                ))}

                <Text style={styles.sectionHeading}>Frequently asked</Text>
                {FAQS.map((f) => (
                    <View key={f.q} style={styles.card}>
                        <Text style={styles.faqQ}>{f.q}</Text>
                        <Text style={styles.faqA}>{f.a}</Text>
                    </View>
                ))}
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
    description: { fontSize: 15, lineHeight: 23, color: colors.textSecondary, marginTop: 10, marginBottom: 8 },
    planCard: {
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        borderRadius: 16, padding: 20, marginTop: 14, gap: 6,
    },
    planCardHighlight: { borderColor: colors.primary, borderWidth: 2 },
    badge: {
        flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start",
        backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 4,
    },
    badgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
    planName: { fontSize: 18, fontWeight: "800", color: colors.text },
    planPrice: { fontSize: 28, fontWeight: "800", color: colors.text },
    planBlurb: { fontSize: 14, lineHeight: 21, color: colors.textSecondary, marginVertical: 4 },
    planCta: { paddingVertical: 13, borderRadius: 12, alignItems: "center", marginTop: 6 },
    planCtaPrimary: { backgroundColor: colors.primary },
    planCtaOutline: { borderWidth: 1, borderColor: colors.border },
    planCtaText: { fontSize: 14, fontWeight: "700", color: colors.text },
    sectionHeading: { fontSize: 18, fontWeight: "800", color: colors.text, marginTop: 28, marginBottom: 2 },
    card: {
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        borderRadius: 14, padding: 18, marginTop: 12, gap: 10,
    },
    cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
    featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    featureLabel: { flex: 1, fontSize: 14, color: colors.text },
    soonTag: { fontSize: 11, fontWeight: "700", color: colors.warning },
    faqQ: { fontSize: 15, fontWeight: "700", color: colors.text },
    faqA: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
});
