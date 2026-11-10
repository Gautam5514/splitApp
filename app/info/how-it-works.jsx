import { IconCircle, PillButton, ScreenHeader, SectionLabel, useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { SCREEN_GUTTER } from "@/constants/layout";
import { useBottomSpacing } from "@/hooks/useSafeSpacing";
import { router } from "expo-router";
import {
    Check,
    QrCode,
    ReceiptText,
    SplitSquareHorizontal,
    UserPlus,
    Users,
    Wallet,
} from "lucide-react-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const STEPS = [
    {
        icon: UserPlus,
        eyebrow: "Open the app",
        title: "Create your account",
        desc: "Sign up with your email or Google in under a minute. Your dashboard is ready the moment you land.",
        points: ["Email or Google sign-in", "No card, no setup fees", "Works on phone and desktop"],
    },
    {
        icon: Users,
        eyebrow: "Start a group",
        title: "Create a group for anything",
        desc: "A Goa trip, monthly flat expenses, or a one-off dinner. Name the group and it becomes the single home for every shared cost.",
        points: ["Unlimited groups", "Trip, home, or custom budgets", "Group chat built in"],
    },
    {
        icon: QrCode,
        eyebrow: "Bring friends in",
        title: "Invite with link or code",
        desc: "Every group gets an invite code and link. Friends tap or paste the code and they are in. No complicated onboarding.",
        points: ["One-tap share links", "Invite codes for the rest", "Auto-join after sign in"],
    },
    {
        icon: ReceiptText,
        eyebrow: "Log expenses",
        title: "Add costs or scan the receipt",
        desc: "Type an expense in seconds, or snap a photo of any bill and the AI receipt scanner reads every line item and adds it for you.",
        points: ["Manual entry in two taps", "AI receipt scanning", "Every item auto-categorized"],
    },
    {
        icon: SplitSquareHorizontal,
        eyebrow: "The math",
        title: "Split it any way you like",
        desc: "Choose equal, percentage, shares, or exact amounts per person. SplitEase nets everyone's balance, so you only see who owes whom.",
        points: ["Equal, percent, shares, or exact", "Balances netted automatically", "Minimum-transfer algorithm"],
    },
    {
        icon: Wallet,
        eyebrow: "Settle up",
        title: "Clear every debt in one tap",
        desc: "When the trip ends, hit Settle Up. The optimizer routes the fewest possible payments, records each one, and zeroes the ledger.",
        points: ["Instant UPI settlement", "Payments logged in chat", "Balances reset to zero"],
    },
];

export default function HowItWorksScreen() {
    const { colors } = useDesign();
    const bottomSpacing = useBottomSpacing(32);
    const styles = getStyles(colors);

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <ScreenHeader flat back title="How it works" />

            <ScrollView contentContainerStyle={{ paddingBottom: bottomSpacing }} showsVerticalScrollIndicator={false}>
                <Text style={styles.description}>
                    Six simple steps take a shared cost from the first expense to a cleared balance.
                </Text>

                {STEPS.map((step, i) => {
                    const Icon = step.icon;
                    return (
                        <View key={step.title}>
                            <SectionLabel line>Step {i + 1}</SectionLabel>
                            <View style={styles.step}>
                                <View style={styles.stepHeader}>
                                    <IconCircle size={40} tint={colors.primaryLight}>
                                        <Icon size={18} color={colors.text} strokeWidth={2} />
                                    </IconCircle>
                                    <Text style={styles.stepTitle}>{step.title}</Text>
                                </View>
                                <Text style={styles.stepDesc}>{step.desc}</Text>
                                <View style={styles.points}>
                                    {step.points.map((point) => (
                                        <View key={point} style={styles.pointRow}>
                                            <Check size={15} color={colors.success} />
                                            <Text style={styles.pointText}>{point}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>
                    );
                })}

                <PillButton
                    label="Get started"
                    onPress={() => router.replace("/(tabs)/home")}
                    style={styles.cta}
                />
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    description: { fontSize: 15, lineHeight: 23, color: colors.textSecondary, marginBottom: 14, marginHorizontal: SCREEN_GUTTER },
    // Steps sit straight on the canvas under a lined "Step N" heading (no cards)
    step: { paddingHorizontal: SCREEN_GUTTER, gap: 10, marginBottom: 18 },
    stepHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
    stepTitle: { flex: 1, fontSize: 16.5, fontWeight: "600", color: colors.text, letterSpacing: -0.2 },
    stepDesc: { fontSize: 14.5, lineHeight: 22, color: colors.textSecondary },
    points: { gap: 8 },
    pointRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    pointText: { fontSize: 13.5, color: colors.text },
    cta: { marginHorizontal: SCREEN_GUTTER, marginTop: 6 },
});
