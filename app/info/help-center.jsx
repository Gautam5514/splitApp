import { PillButton, PillInput, ScreenHeader, SectionLabel, useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { SCREEN_GUTTER } from "@/constants/layout";
import { useBottomSpacing } from "@/hooks/useSafeSpacing";
import { router } from "expo-router";
import {
    ChevronDown,
    Mail,
    Search,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TOPICS = [
    {
        title: "Groups and invites",
        questions: [
            { q: "How do I create a group?", a: "Open the Groups tab, tap +, add a name, and invite members by code or link." },
            { q: "How do invite links work?", a: "An invite link opens the join screen. If you are not signed in, SplitEase remembers the invite and applies it after login." },
        ],
    },
    {
        title: "Expenses",
        questions: [
            { q: "Which split methods are supported?", a: "You can split equally, by ratio, or with exact amounts for each person." },
            { q: "Can I edit an expense?", a: "Open the group, find the expense, and use the available actions for that record." },
        ],
    },
    {
        title: "Balances",
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
            <ScreenHeader flat back title="Help Center" />

            <ScrollView
                contentContainerStyle={{ paddingBottom: bottomSpacing }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <PillInput
                    style={styles.search}
                    icon={<Search size={18} color={colors.textSecondary} />}
                    placeholder="Search help"
                    value={query}
                    onChangeText={setQuery}
                    autoCorrect={false}
                />

                {filtered.length === 0 ? (
                    <Text style={styles.empty}>
                        Nothing matches “{query.trim()}”. Try another word, or contact us below.
                    </Text>
                ) : (
                    filtered.map((topic) => (
                        <View key={topic.title}>
                            <SectionLabel line>{topic.title}</SectionLabel>
                            <View style={styles.section}>
                                {topic.questions.map((item, index) => {
                                    const key = `${topic.title}-${index}`;
                                    // While searching, show every matching answer opened.
                                    const isOpen = !!query.trim() || open === key;
                                    return (
                                        <View key={item.q}>
                                            <TouchableOpacity
                                                style={styles.qaRow}
                                                onPress={() => setOpen(open === key ? "" : key)}
                                                activeOpacity={0.7}
                                                accessibilityRole="button"
                                                accessibilityState={{ expanded: isOpen }}
                                            >
                                                <Text style={styles.question}>{item.q}</Text>
                                                <ChevronDown
                                                    size={18}
                                                    color={colors.textSecondary}
                                                    style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }}
                                                />
                                            </TouchableOpacity>
                                            {isOpen && <Text style={styles.answer}>{item.a}</Text>}
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    ))
                )}

                <SectionLabel line>Still need help?</SectionLabel>
                <View style={styles.section}>
                    <Text style={styles.paragraph}>
                        Tell us your account email, the group name and what went wrong. We{"'"}ll get back to you.
                    </Text>
                    <PillButton
                        label="Contact us"
                        onPress={() => router.push("/info/contact")}
                        icon={<Mail size={16} color={colors.onPrimary} />}
                        style={styles.contactBtn}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    search: { marginHorizontal: SCREEN_GUTTER, marginBottom: 16 },
    // Topics sit straight on the canvas under a lined heading (no cards)
    section: { paddingHorizontal: SCREEN_GUTTER, marginBottom: 14 },
    qaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 10 },
    question: { flex: 1, fontSize: 15.5, fontWeight: "500", color: colors.text, letterSpacing: -0.1 },
    answer: { fontSize: 14.5, lineHeight: 22, color: colors.textSecondary, paddingBottom: 10, paddingRight: 30 },
    empty: { fontSize: 14.5, lineHeight: 22, color: colors.textSecondary, marginHorizontal: SCREEN_GUTTER, marginBottom: 18 },
    paragraph: { fontSize: 14.5, lineHeight: 22, color: colors.textSecondary },
    contactBtn: { marginTop: 14 },
});
