import { useTheme } from "@/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { Check, DollarSign, Users } from "lucide-react-native";
import { Dimensions, StyleSheet, Text, View } from "react-native";

const { width } = Dimensions.get("window");

const STEPS = [
  {
    id: "01",
    title: "Create Group",
    desc: "Start a trip and invite your friends in seconds via link or contacts.",
    icon: Users,
    gradient: ["#6366F1", "#818CF8"], // Indigo
  },
  {
    id: "02",
    title: "Add Expenses",
    desc: "Scan receipts or enter manually. We support split by %, shares, or exact amounts.",
    icon: DollarSign,
    gradient: ["#EC4899", "#F472B6"], // Pink
  },
  {
    id: "03",
    title: "Settle Up",
    desc: "Our algorithm calculates the minimum number of transactions to clear debts.",
    icon: Check,
    gradient: ["#10B981", "#34D399"], // Emerald
  },
];

function TimelineItem({ item, index, isLast, colors, styles, isDark }) {
  const Icon = item.icon;

  return (
    <View style={styles.stepRow}>
      {/* Left: Timeline & Icon */}
      <View style={styles.timelineColumn}>
        <LinearGradient
          colors={item.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconContainer}
        >
          <Icon size={24} color="white" strokeWidth={2.5} />
        </LinearGradient>
        
        {/* Connector Line */}
        {!isLast && (
          <View style={[styles.connectorLine, { backgroundColor: isDark ? '#333' : '#E5E7EB' }]} />
        )}
      </View>

      {/* Right: Content Card */}
      <View style={styles.contentContainer}>
        {/* Watermark Number */}
        <Text style={styles.watermarkNum}>{item.id}</Text>
        
        <View style={styles.textWrapper}>
            <Text style={styles.stepEyebrow}>STEP {item.id}</Text>
            <Text style={styles.stepTitle}>{item.title}</Text>
            <Text style={styles.stepDesc}>{item.desc}</Text>
        </View>
      </View>
    </View>
  );
}

export default function StepsSection() {
  const { colors, theme } = useTheme();
  const isDark = theme === "dark";
  const styles = getStyles(colors, isDark);

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.heading}>How it works</Text>
        <Text style={styles.subheading}>
            Effortless splitting in 3 simple steps.
        </Text>
      </View>

      <View style={styles.stepsWrapper}>
        {STEPS.map((item, index) => (
          <TimelineItem
            key={item.id}
            item={item}
            index={index}
            isLast={index === STEPS.length - 1}
            colors={colors}
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
    width: "100%",
    paddingHorizontal: 24,
  },
  headerContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  heading: {
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
    color: colors.text,
    letterSpacing: -1,
    marginBottom: 8,
  },
  subheading: {
    textAlign: "center",
    fontSize: 16,
    color: colors.textSecondary,
    maxWidth: '80%',
    lineHeight: 24,
  },
  stepsWrapper: {
    marginTop: 10,
  },
  
  // Row Layout
  stepRow: {
    flexDirection: "row",
    marginBottom: 0, // Handled by minHeight or content
    minHeight: 140, // Ensure height for connector line
  },
  
  // Timeline Column
  timelineColumn: {
    alignItems: "center",
    width: 50,
    marginRight: 20,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 18, // Squircle
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 2,
  },
  connectorLine: {
    width: 2,
    flex: 1,
    marginVertical: 8,
    borderRadius: 1,
    opacity: 0.5,
  },

  // Content Column
  contentContainer: {
    flex: 1,
    paddingTop: 4, // Align text with icon top
    position: 'relative',
  },
  watermarkNum: {
    position: 'absolute',
    right: 0,
    top: 0,
    fontSize: 80,
    fontWeight: '900',
    color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
    zIndex: 0,
  },
  textWrapper: {
    zIndex: 1,
  },
  stepEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: 4,
    letterSpacing: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
  },
  stepDesc: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "500",
  },
});