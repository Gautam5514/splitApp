import { Block, IconCircle, PillButton, PillInput, ScreenHeader, useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { SCREEN_GUTTER } from "@/constants/layout";
import { useBottomSpacing } from "@/hooks/useSafeSpacing";
import { router } from "expo-router";
import {
    ChevronDown,
    HelpCircle,
    Mail,
    Search,
    SplitSquareHorizontal,
    Users,
    Wallet,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TOPICS = [
    {
        title: "Groups and invites",
        icon: Users,
        questions: [
            { q: "How do I create a group?", a: "Go to Trips, choose Create, add a name, and invite members by code or link." },
            { q: "How do invite links work?", a: "An invite link opens the join screen. If you are not signed in, SplitEase remembers the invite and applies it after login." },
        ],
    },
    {
        title: "Expenses",
        icon: SplitSquareHorizontal,
        questions: [
            { q: "Which split methods are supported?", a: "You can split equally, by ratio, or with exact amounts for each person." },
            { q: "Can I edit an expense?", a: "Open the group, find the expense, and use the available actions for that record." },
        ],
    },
    {
        title: "Balances",
        icon: Wallet,
        questions: [
            { q: "How are balances calculated?", a: "SplitEase compares what each member paid with what they owe across the group." },
            { q: "What are settlements?", a: "Settlements show the simplest payments needed to bring everyone back to zero." },
        ],
    },
];

export default function HelpCenterScreen() {
    const { colors } = useDesign();
    const bottomSpacing = useBottomSpacing(32);
    const styles = getStyles(colors);
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState("Groups and invites-0");

    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!term) return TOPICS;
        return TOPICS.map((topic) => ({
            ...topic,
            questions: topic.questions.filter(
                (item) =>
                    item.q.toLowerCase().includes(term) ||
                    item.a.toLowerCase().includes(term) ||
                    topic.title.toLowerCase().includes(term)
            ),
        })).filter((topic) => topic.questions.length > 0);
    }, [query]);

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <ScreenHeader title="Help Center" back />

            <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomSpacing }]} showsVerticalScrollIndicator={false}>
                <View style={styles.iconWrap}>
                    <IconCircle size={48}>
                        <HelpCircle size={24} color={colors.primary} />
                    </IconCircle>
                </View>
                <Text style={styles.eyebrow}>Support</Text>
                <Text style={styles.description}>
                    Find quick answers for groups, invite links, expense splitting, balances, and account support.
                </Text>

                <PillInput
                    style={styles.search}
                    icon={<Search size={18} color={colors.textSecondary} />}
                    placeholder="Search help topics"
                    value={query}
                    onChangeText={setQuery}
                />

                {filtered.length === 0 ? (
                    <Block style={styles.emptyBlock}>
                        <Text style={styles.emptyTitle}>No help articles found</Text>
                        <Text style={styles.paragraph}>Try a different keyword or contact support.</Text>
                    </Block>
                ) : (
                    filtered.map((topic) => {
                        const Icon = topic.icon;
                        return (
                            <Block key={topic.title} padded={false} style={styles.topicBlock}>
                                <View style={styles.cardHeader}>
                                    <Icon size={18} color={colors.primary} />
                                    <Text style={styles.cardTitle}>{topic.title}</Text>
                                </View>
                                {topic.questions.map((item, index) => {
                                    const key = `${topic.title}-${index}`;
                                    const isOpen = open === key;
                                    return (
                                        <View key={item.q}>
                                            <TouchableOpacity
                                                style={styles.qaRow}
                                                onPress={() => setOpen(isOpen ? "" : key)}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={styles.question}>{item.q}</Text>
                                                <ChevronDown
                                                    size={16}
                                                    color={colors.textSecondary}
                                                    style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }}
                                                />
                                            </TouchableOpacity>
                                            {isOpen && <Text style={styles.answer}>{item.a}</Text>}
                                        </View>
                                    );
                                })}
                            </Block>
                        );
                    })
                )}

                <Block style={styles.contactBlock}>
                    <Text style={styles.contactTitle}>Still need help?</Text>
                    <Text style={[styles.paragraph, styles.contactText]}>
                        Send the support team your account email, group name, and a short description of the issue.
                    </Text>
                    <PillButton
                        label="Contact us"
                        onPress={() => router.push("/info/contact")}
                        icon={<Mail size={16} color={colors.onPrimary} />}
                        style={styles.contactBtn}
                    />
                </Block>
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingTop: 4, paddingBottom: 48 },
    iconWrap: { marginHorizontal: SCREEN_GUTTER, marginBottom: 14 },
    eyebrow: { fontSize: 12, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase", color: colors.primary, marginBottom: 8, marginHorizontal: SCREEN_GUTTER },
    description: { fontSize: 15, lineHeight: 23, color: colors.textSecondary, marginTop: 4, marginHorizontal: SCREEN_GUTTER },
    search: { marginHorizontal: SCREEN_GUTTER, marginTop: 16, marginBottom: 8 },
    topicBlock: {},
    cardHeader: {
        flexDirection: "row", alignItems: "center", gap: 10,
        paddingHorizontal: SCREEN_GUTTER, paddingTop: 16, paddingBottom: 6,
    },
    cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
    qaRow: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        gap: 12, paddingHorizontal: SCREEN_GUTTER, paddingVertical: 12,
    },
    question: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.text },
    answer: { paddingHorizontal: SCREEN_GUTTER, paddingBottom: 14, fontSize: 14, lineHeight: 21, color: colors.textSecondary },
    emptyBlock: { alignItems: "center", gap: 4 },
    emptyTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
    paragraph: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
    contactBlock: { alignItems: "center", gap: 8 },
    contactTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
    contactText: { textAlign: "center" },
    contactBtn: { alignSelf: "stretch", marginTop: 4 },
});
