import { Block, IconCircle, ScreenHeader, useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { SCREEN_GUTTER } from "@/constants/layout";
import { useBottomSpacing } from "@/hooks/useSafeSpacing";
import { ScrollView, StyleSheet, View } from "react-native";
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
    const { colors } = useDesign();
    const bottomSpacing = useBottomSpacing(32);
    const styles = getStyles(colors);

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <ScreenHeader title={title} back />

            <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomSpacing }]} showsVerticalScrollIndicator={false}>
                {Icon && (
                    <View style={styles.iconWrap}>
                        <IconCircle size={48}>
                            <Icon size={24} color={colors.primary} />
                        </IconCircle>
                    </View>
                )}
                {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
                {description && <Text style={styles.description}>{description}</Text>}

                {sections.map((section) => (
                    <Block key={section.title} style={styles.block}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        {section.body.map((para, i) => (
                            <Text key={i} style={styles.paragraph}>
                                {para}
                            </Text>
                        ))}
                    </Block>
                ))}

                {asideItems.length > 0 && (
                    <Block style={styles.block}>
                        {asideTitle && <Text style={styles.asideTitle}>{asideTitle}</Text>}
                        {asideItems.map((item) => (
                            <View key={item.label} style={styles.asideRow}>
                                <Text style={styles.asideLabel}>{item.label}</Text>
                                <Text style={styles.asideValue}>{item.value}</Text>
                            </View>
                        ))}
                    </Block>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingTop: 4, paddingBottom: 48 },
    iconWrap: { marginHorizontal: SCREEN_GUTTER, marginBottom: 14 },
    eyebrow: {
        fontSize: 12,
        fontWeight: "800",
        letterSpacing: 2,
        textTransform: "uppercase",
        color: colors.primary,
        marginBottom: 8,
        marginHorizontal: SCREEN_GUTTER,
    },
    description: { fontSize: 15, lineHeight: 23, color: colors.textSecondary, marginTop: 4, marginBottom: 8, marginHorizontal: SCREEN_GUTTER },
    block: { gap: 10 },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
    paragraph: { fontSize: 14, lineHeight: 22, color: colors.textSecondary },
    asideTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 2 },
    asideRow: { gap: 2 },
    asideLabel: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
    asideValue: { fontSize: 14, lineHeight: 20, color: colors.text },
});
