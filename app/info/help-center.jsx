import { useTheme } from "@/context/ThemeContext";
import { router } from "expo-router";
import {
    ArrowLeft,
    ChevronDown,
    HelpCircle,
    Mail,
    Search,
    SplitSquareHorizontal,
    Users,
    Wallet,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
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
    const { colors } = useTheme();
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
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <ArrowLeft size={20} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={styles.iconBox}>
                    <HelpCircle size={24} color={colors.primary} />
                </View>
                <Text style={styles.eyebrow}>Support</Text>
                <Text style={styles.title}>Help Center</Text>
                <Text style={styles.description}>
                    Find quick answers for groups, invite links, expense splitting, balances, and account support.
                </Text>

                <View style={styles.searchBox}>
                    <Search size={16} color={colors.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search help topics"
                        placeholderTextColor={colors.placeholder || colors.textSecondary}
                        value={query}
                        onChangeText={setQuery}
                    />
                </View>

                {filtered.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>No help articles found</Text>
                        <Text style={styles.paragraph}>Try a different keyword or contact support.</Text>
                    </View>
                ) : (
                    filtered.map((topic) => {
                        const Icon = topic.icon;
                        return (
                            <View key={topic.title} style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <Icon size={18} color={colors.primary} />
                                    <Text style={styles.cardTitle}>{topic.title}</Text>
                                </View>
                                {topic.questions.map((item, index) => {
                                    const key = `${topic.title}-${index}`;
                                    const isOpen = open === key;
                                    return (
                                        <View key={item.q} style={styles.qaBlock}>
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
                            </View>
                        );
                    })
                )}

                <View style={styles.contactCard}>
                    <Text style={styles.contactTitle}>Still need help?</Text>
                    <Text style={styles.paragraph}>
                        Send the support team your account email, group name, and a short description of the issue.
                    </Text>
                    <TouchableOpacity
                        style={styles.contactBtn}
                        onPress={() => router.push("/info/contact")}
                        activeOpacity={0.85}
                    >
                        <Mail size={16} color="#FFFFFF" />
                        <Text style={styles.contactBtnText}>Contact us</Text>
                    </TouchableOpacity>
                </View>
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
        width: 48, height: 48, borderRadius: 12, backgroundColor: colors.primaryLight,
        alignItems: "center", justifyContent: "center", marginBottom: 14,
    },
    eyebrow: { fontSize: 12, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase", color: colors.primary, marginBottom: 8 },
    title: { fontSize: 30, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
    description: { fontSize: 15, lineHeight: 23, color: colors.textSecondary, marginTop: 10 },
    searchBox: {
        flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16,
        paddingHorizontal: 14, height: 48, borderRadius: 12, borderWidth: 1,
        borderColor: colors.border, backgroundColor: colors.card,
    },
    searchInput: { flex: 1, fontSize: 14, color: colors.text },
    card: {
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        borderRadius: 14, marginTop: 14, overflow: "hidden",
    },
    cardHeader: {
        flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16,
        paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
    qaBlock: { borderBottomWidth: 1, borderBottomColor: colors.border },
    qaRow: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        gap: 12, paddingHorizontal: 16, paddingVertical: 14,
    },
    question: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.text },
    answer: { paddingHorizontal: 16, paddingBottom: 16, fontSize: 14, lineHeight: 21, color: colors.textSecondary },
    emptyCard: {
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        borderRadius: 14, padding: 24, marginTop: 14, alignItems: "center", gap: 4,
    },
    emptyTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
    paragraph: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
    contactCard: {
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        borderRadius: 14, padding: 20, marginTop: 16, alignItems: "center", gap: 8,
    },
    contactTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
    contactBtn: {
        flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.primary,
        paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 4,
    },
    contactBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
