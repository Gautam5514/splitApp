import { useTheme } from "@/context/ThemeContext";
import {
  BookOpen,
  MessageSquare,
  Plane,
  ShieldCheck,
  WifiOff,
  Zap,
} from "lucide-react-native";
import { Dimensions, StyleSheet, Text, View } from "react-native";

const { width } = Dimensions.get("window");

const FEATURES = [
  {
    id: 1,
    title: "Real-Time Sync",
    desc: "Updates appear instantly for all members.",
    icon: Zap,
    color: "#3B82F6", // Blue
  },
  {
    id: 2,
    title: "Bank Security",
    desc: "AES-256 encryption keeps data safe.",
    icon: ShieldCheck,
    color: "#10B981", // Emerald
  },
  {
    id: 3,
    title: "Global Currency",
    desc: "Auto-conversion for 150+ currencies.",
    icon: Plane,
    color: "#8B5CF6", // Violet
  },
  {
    id: 4,
    title: "PDF Reports",
    desc: "Clean summaries for your records.",
    icon: BookOpen,
    color: "#F43F5E", // Rose
  },
  {
    id: 5,
    title: "Expense Chat",
    desc: "Discuss details on every specific bill.",
    icon: MessageSquare,
    color: "#EC4899", // Pink
  },
  {
    id: 6,
    title: "Offline Mode",
    desc: "Add expenses without internet access.",
    icon: WifiOff,
    color: "#F59E0B", // Amber
  },
];

function FeatureCard({ item, styles, isDark }) {
  const Icon = item.icon;

  return (
    <View style={styles.card}>
      {/* Icon with Tinted Background */}
      <View style={[styles.iconContainer, { backgroundColor: item.color + "20" }]}>
        <Icon size={24} color={item.color} strokeWidth={2.5} />
      </View>

      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardDesc}>{item.desc}</Text>
    </View>
  );
}

export default function FeaturesSection() {
  const { colors, theme } = useTheme();
  const isDark = theme === "dark";
  const styles = getStyles(colors, isDark);

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.heading}>Power-packed Features</Text>
        <Text style={styles.subheading}>
          Everything you need for the perfect trip.
        </Text>
      </View>

      <View style={styles.grid}>
        {FEATURES.map((item) => (
          <FeatureCard
            key={item.id}
            item={item}
            styles={styles}
            isDark={isDark}
          />
        ))}
      </View>
    </View>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  container: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    width: "100%",
  },
  headerContainer: {
    marginBottom: 24,
  },
  heading: {
    fontSize: 28,
    fontWeight: "900", // Heavy bold for impact
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  
  // Grid Layout
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12, // Gap between rows
  },
  
  // Card Styling
  card: {
    width: (width - 40 - 12) / 2, // Calculation for 2 columns with padding/gap
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
    shadowColor: colors.shadow || "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16, // Squircle
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    fontWeight: "500",
  },
});