import { Block, RoundButton, useDesign } from "@/components/ui/Design";
import { TYPE } from "@/constants/design";
import { SCREEN_GUTTER } from "@/constants/layout";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Typography";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AuthInfoPageLayout({
    eyebrow,
    title,
    description,
    icon: Icon,
    sections = [],
    asideTitle,
    asideItems = [],
}) {
    const { colors, isDark, t } = useDesign();

    return (
        <View style={[styles.root, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
            <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
                <View style={styles.header}>
                    <RoundButton onPress={() => router.back()} label="Back">
                        <ChevronLeft size={22} color={colors.text} strokeWidth={2.3} />
                    </RoundButton>
                </View>

                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    {Icon && (
                        <View style={[styles.iconBox, { backgroundColor: t.surfaceAlt }]}>
                            <Icon size={24} color={colors.primary} />
                        </View>
                    )}
                    {eyebrow && <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow}</Text>}
                    <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                    {description && <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>}

                    {sections.map((section) => (
                        <Block key={section.title} style={styles.card}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
                            {section.body.map((para, i) => (
                                <Text key={i} style={[styles.paragraph, { color: colors.textSecondary }]}>
                                    {para}
                                </Text>
                            ))}
                        </Block>
                    ))}

                    {asideItems.length > 0 && (
                        <Block style={styles.card}>
                            {asideTitle && <Text style={[styles.asideTitle, { color: colors.text }]}>{asideTitle}</Text>}
                            {asideItems.map((item) => (
                                <View key={item.label} style={styles.asideRow}>
                                    <Text style={[styles.asideLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                                    <Text style={[styles.asideValue, { color: colors.text }]}>{item.value}</Text>
                                </View>
                            ))}
                        </Block>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: { paddingHorizontal: SCREEN_GUTTER, paddingVertical: 8 },
    scroll: { paddingHorizontal: SCREEN_GUTTER, paddingBottom: 48 },
    iconBox: {
        width: 48, height: 48, borderRadius: 14,
        alignItems: "center", justifyContent: "center",
        marginBottom: 14,
    },
    eyebrow: {
        ...TYPE.label, letterSpacing: 2, marginBottom: 8,
    },
    title: { ...TYPE.pageTitle },
    description: { fontSize: 15, lineHeight: 23, marginTop: 10, marginBottom: 8 },
    card: { marginHorizontal: 0, marginTop: 14, marginBottom: 0, gap: 10 },
    sectionTitle: { ...TYPE.sectionTitle },
    paragraph: { fontSize: 14, lineHeight: 22 },
    asideTitle: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
    asideRow: { gap: 2 },
    asideLabel: { ...TYPE.label, letterSpacing: 0.5 },
    asideValue: { fontSize: 14, lineHeight: 20 },
});
