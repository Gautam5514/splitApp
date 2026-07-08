import { useTheme } from "@/context/ThemeContext";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function InfoPageLayout({
    eyebrow,
    title,
    description,
    icon: Icon,
    sections = [],
    asideTitle,
    asideItems = [],
}) {
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
                {Icon && (
                    <View style={styles.iconBox}>
                        <Icon size={24} color={colors.primary} />
                    </View>
                )}
                {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
                <Text style={styles.title}>{title}</Text>
                {description && <Text style={styles.description}>{description}</Text>}

                {sections.map((section) => (
                    <View key={section.title} style={styles.card}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        {section.body.map((para, i) => (
                            <Text key={i} style={styles.paragraph}>
                                {para}
                            </Text>
                        ))}
                    </View>
                ))}

                {asideItems.length > 0 && (
                    <View style={styles.asideCard}>
                        {asideTitle && <Text style={styles.asideTitle}>{asideTitle}</Text>}
                        {asideItems.map((item) => (
                            <View key={item.label} style={styles.asideRow}>
                                <Text style={styles.asideLabel}>{item.label}</Text>
                                <Text style={styles.asideValue}>{item.value}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 12, paddingVertical: 8 },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    scroll: { paddingHorizontal: 20, paddingBottom: 48 },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
    },
    eyebrow: {
        fontSize: 12,
        fontWeight: "800",
        letterSpacing: 2,
        textTransform: "uppercase",
        color: colors.primary,
        marginBottom: 8,
    },
    title: { fontSize: 30, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
    description: { fontSize: 15, lineHeight: 23, color: colors.textSecondary, marginTop: 10, marginBottom: 8 },
    card: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        padding: 18,
        marginTop: 14,
        gap: 10,
    },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
    paragraph: { fontSize: 14, lineHeight: 22, color: colors.textSecondary },
    asideCard: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        padding: 18,
        marginTop: 18,
        gap: 12,
    },
    asideTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 2 },
    asideRow: { gap: 2 },
    asideLabel: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
    asideValue: { fontSize: 14, lineHeight: 20, color: colors.text },
});
