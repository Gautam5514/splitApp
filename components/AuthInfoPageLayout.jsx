import { ScreenHeader, SectionLabel, useDesign } from "@/components/ui/Design";
import { TYPE } from "@/constants/design";
import { SCREEN_GUTTER } from "@/constants/layout";
import { ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Typography";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Plain reading page (Terms, Privacy Policy): title, one intro line, then
 * lined headings with the text straight on the canvas — no cards.
 * `eyebrow` and `icon` are accepted for compatibility but no longer drawn.
 */
export default function AuthInfoPageLayout({
    title,
    description,
    sections = [],
    asideTitle,
    asideItems = [],
}) {
    const { colors, isDark } = useDesign();

    return (
        <View style={[styles.root, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
            <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
                <ScreenHeader flat back title={title} />

                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    {description ? <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text> : null}

                    {sections.map((section) => (
                        <View key={section.title}>
                            <SectionLabel line>{section.title}</SectionLabel>
                            <View style={styles.body}>
                                {section.body.map((para, i) => (
                                    <Text key={i} style={[styles.paragraph, { color: colors.textSecondary }]}>
                                        {para}
                                    </Text>
                                ))}
                            </View>
                        </View>
                    ))}

                    {asideItems.length > 0 && (
                        <View>
                            <SectionLabel line>{asideTitle || "Summary"}</SectionLabel>
                            <View style={styles.body}>
                                {asideItems.map((item) => (
                                    <View key={item.label} style={styles.asideRow}>
                                        <Text style={[styles.asideLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                                        <Text style={[styles.asideValue, { color: colors.text }]}>{item.value}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    scroll: { paddingBottom: 48 },
    description: { fontSize: 15, lineHeight: 23, marginHorizontal: SCREEN_GUTTER, marginBottom: 14 },
    body: { paddingHorizontal: SCREEN_GUTTER, gap: 10, marginBottom: 18 },
    paragraph: { fontSize: 14.5, lineHeight: 22 },
    asideRow: { gap: 2 },
    asideLabel: { ...TYPE.meta },
    asideValue: { fontSize: 14.5, lineHeight: 21 },
});
