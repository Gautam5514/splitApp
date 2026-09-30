import { Block, IconCircle, PillButton, ScreenHeader, useDesign } from "@/components/ui/Design";
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
            <ScreenHeader title="How it works" back />

            <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomSpacing }]} showsVerticalScrollIndicator={false}>
                <Text style={styles.eyebrow}>From sign-up to settled</Text>
                <Text style={styles.description}>
                    Six simple steps take a shared cost from the first expense to a cleared balance.
                </Text>

                {STEPS.map((step, i) => {
                    const Icon = step.icon;
                    return (
                        <Block key={step.title} style={styles.block}>
                            <View style={styles.stepHeader}>
                                <IconCircle size={44}>
                                    <Icon size={20} color={colors.primary} />
                                </IconCircle>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.stepEyebrow}>
                                        Step {i + 1} · {step.eyebrow}
                                    </Text>
                                    <Text style={styles.stepTitle}>{step.title}</Text>
                                </View>
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
                        </Block>
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
    scroll: { paddingTop: 4, paddingBottom: 48 },
    eyebrow: { fontSize: 12, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase", color: colors.primary, marginBottom: 8, marginHorizontal: SCREEN_GUTTER },
    description: { fontSize: 15, lineHeight: 23, color: colors.textSecondary, marginTop: 4, marginBottom: 8, marginHorizontal: SCREEN_GUTTER },
    block: { gap: 12 },
    stepHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
    stepEyebrow: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, color: colors.primary },
    stepTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: 2 },
    stepDesc: { fontSize: 14, lineHeight: 22, color: colors.textSecondary },
    points: { gap: 8 },
    pointRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    pointText: { fontSize: 13, color: colors.text },
    cta: { marginHorizontal: SCREEN_GUTTER, marginTop: 4 },
});
