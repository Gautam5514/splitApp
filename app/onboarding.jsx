import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  CheckCircle2,
  MessageCircle,
  PlusCircle,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react-native";
import { useMemo } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ONBOARDING_KEY = "onboarding_seen_v1";

export default function OnboardingScreen() {
  const { colors, theme } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const gradientColors =
    theme === "dark"
      ? [colors.background, colors.card, colors.background]
      : ["#EEF2FF", "#F8FAFC", "#FFFFFF"];

  const steps = [
    {
      title: "Create Your First Group",
      description:
        "Open the Create Trips tab, tap New Trip, and add your friends. This becomes your shared space.",
      Icon: Users,
    },
    {
      title: "Add Expenses Fast",
      description:
        "Use the Plus button to log bills, who paid, and who owes. We split it instantly.",
      Icon: PlusCircle,
    },
    {
      title: "Chat With the Group",
      description:
        "Jump into the Chat tab to discuss plans, payments, or reminders without leaving the trip.",
      Icon: MessageCircle,
    },
    {
      title: "Ask the AI Assistant",
      description:
        "Tap the green Sparkles button to get smart suggestions, summaries, or settle-up tips.",
      Icon: Sparkles,
    },
    {
      title: "Settle and Track",
      description:
        "Check balances any time and mark payments as settled to keep everything clean.",
      Icon: Wallet,
    },
  ];

  const tips = [
    "Invite members right away so they can add expenses too.",
    "Add a short note to each expense for clarity.",
    "Use AI to summarize who owes what before settling.",
  ];

  const handleDone = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    } catch (error) {
      console.log("Error saving onboarding status:", error);
    }

    router.replace("/(tabs)/home");
  };

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.hero}>
            <View style={styles.heroLogoRow}>
              <Image
                source={require("../assets/images/icon.png")}
                style={styles.heroLogo}
                resizeMode="contain"
              />
              <View style={styles.heroBadge}>
                <Sparkles size={14} color={colors.primary} />
                <Text style={styles.heroBadgeText}>First Time Setup</Text>
              </View>
            </View>
            <Text style={styles.title}>Welcome to SplitEase</Text>
            <Text style={styles.subtitle}>
              Here is a quick, complete walkthrough so you can start splitting
              expenses with confidence.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How It Works</Text>
            {steps.map(({ title, description, Icon }) => (
              <View key={title} style={styles.card}>
                <View style={styles.cardIcon}>
                  <Icon size={22} color={colors.primary} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{title}</Text>
                  <Text style={styles.cardText}>{description}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pro Tips</Text>
            {tips.map((tip) => (
              <View key={tip} style={styles.tipRow}>
                <CheckCircle2 size={18} color={colors.success} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.cta} onPress={handleDone}>
            <Text style={styles.ctaText}>{"I'm Ready"}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
    },
     hero: {
      marginBottom: 24,
    },
    heroLogoRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    heroLogo: {
      width: 48,
      height: 48,
      borderRadius: 12,
    },
    heroBadge: {
      alignSelf: "flex-start",
      backgroundColor: colors.primaryLight,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 999,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    heroBadgeText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.primary,
      letterSpacing: 0.3,
    },
    title: {
      marginTop: 12,
      fontSize: 30,
      fontWeight: "800",
      color: colors.text,
    },
    subtitle: {
      marginTop: 10,
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    section: {
      marginTop: 18,
      gap: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      gap: 12,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    cardIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.primaryLight,
      justifyContent: "center",
      alignItems: "center",
    },
    cardBody: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    cardText: {
      marginTop: 6,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    tipRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tipText: {
      flex: 1,
      fontSize: 14,
      color: colors.textSecondary,
    },
    cta: {
      marginTop: 28,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: "center",
      shadowColor: colors.primary,
      shadowOpacity: 0.35,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    ctaText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
  });
