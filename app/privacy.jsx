import { Block, ListRow, ScreenHeader, SectionLabel, useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { api } from "@/lib/api";
import { Alert } from "@/lib/alert";
import { Check } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const POLICIES = [
    { key: "contacts", title: "People I know add me directly", hint: "Anyone else sends an invite I accept or decline" },
    { key: "invite", title: "Always ask me first", hint: "Every group add is an invite" },
];

// Who can add me to groups / find me by email, and who I've blocked.
export default function PrivacyScreen() {
    const { colors, t } = useDesign();
    const styles = getStyles(colors, t);
    const [data, setData] = useState(null);

    useEffect(() => {
        api.get("/users/me/privacy").then((r) => setData(r.data)).catch(() => setData(null));
    }, []);

    const save = async (patch) => {
        const prev = data;
        setData({ ...data, ...patch });
        try {
            const r = await api.patch("/users/me/privacy", patch);
            setData(r.data);
        } catch (err) {
            setData(prev);
            Alert.alert("Couldn't save", err?.response?.data?.message || "Please try again.");
        }
    };
    const unblock = async (u) => {
        try {
            await api.delete(`/users/${u._id}/block`);
            setData((d) => ({ ...d, blocked: d.blocked.filter((b) => b._id !== u._id) }));
        } catch {
            Alert.alert("Couldn't unblock", "Please try again.");
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <ScreenHeader back title="Groups & privacy" />
            {!data ? (
                <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
            ) : (
                <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                    <SectionLabel>Who can add me to a group</SectionLabel>
                    <Block padded={false}>
                        {POLICIES.map((p) => (
                            <ListRow key={p.key} title={p.title} subtitle={p.hint} onPress={() => save({ addPolicy: p.key })}
                                accessibilityLabel={p.title}
                                trailing={
                                    <View style={[styles.radio, data.addPolicy === p.key && { backgroundColor: t.ink, borderColor: t.ink }]}>
                                        {data.addPolicy === p.key && <Check size={13} color={t.onInk} strokeWidth={3} />}
                                    </View>
                                } />
                        ))}
                    </Block>

                    <Block padded={false}>
                        <ListRow title="Let people find me by email" subtitle="Off = only people you know, or an invite link, can reach you"
                            trailing={
                                <Switch value={data.discoverableByEmail} onValueChange={(v) => save({ discoverableByEmail: v })}
                                    trackColor={{ false: "#E5E7EB", true: colors.primary }} thumbColor="#fff" ios_backgroundColor="#E5E7EB" />
                            } />
                    </Block>

                    <SectionLabel>Blocked people</SectionLabel>
                    <Block padded={false}>
                        {data.blocked?.length ? (
                            data.blocked.map((u) => (
                                <ListRow key={u._id} title={u.name} subtitle={u.email}
                                    trailing={
                                        <TouchableOpacity onPress={() => unblock(u)} hitSlop={8}>
                                            <Text style={styles.link}>Unblock</Text>
                                        </TouchableOpacity>
                                    } />
                            ))
                        ) : (
                            <View style={{ padding: 16 }}><Text style={styles.muted}>Nobody. Use the block button on an invite to stop someone.</Text></View>
                        )}
                    </Block>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const getStyles = (colors, t) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: t.outline, alignItems: "center", justifyContent: "center" },
    link: { fontSize: 14, fontWeight: "700", color: colors.primary },
    muted: { fontSize: 13, color: colors.textSecondary },
});
