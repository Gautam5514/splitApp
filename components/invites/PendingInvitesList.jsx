import { Block, PillButton, RoundButton, SectionLabel, useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { GroupListSkeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { Alert } from "@/lib/alert";
import { getGroupIcon } from "@/lib/groupIcons";
import { groupTypeMeta } from "@/lib/groupPresets";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ban, Check, MailOpen } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";

/**
 * Invites waiting for my answer. Nobody is put in a group without saying yes.
 * compact: card for the Groups tab (renders nothing when empty).
 */
export default function PendingInvitesList({ compact = false, onChanged, refreshKey }) {
    const { colors, t } = useDesign();
    const styles = getStyles(colors, t);
    const [invites, setInvites] = useState(null);
    const [busy, setBusy] = useState(null);

    const load = useCallback(() => api.get("/invites").then((r) => setInvites(r.data || [])).catch(() => setInvites([])), []);
    useEffect(() => { load(); }, [load, refreshKey]);

    const accept = async (inv) => {
        try {
            setBusy(inv._id);
            const r = await api.post(`/invites/${inv._id}/accept`);
            onChanged?.();
            router.push({ pathname: "/groups/[id]", params: { id: r.data.groupId } });
            load();
        } catch (err) {
            Alert.alert("Couldn't join", err?.response?.data?.message || "Please try again.");
            load();
        } finally {
            setBusy(null);
        }
    };
    const decline = (inv, block) => {
        const run = async () => {
            try {
                setBusy(inv._id);
                await api.post(`/invites/${inv._id}/decline`, { block });
                onChanged?.();
                load();
            } catch (err) {
                Alert.alert("Something went wrong", err?.response?.data?.message || "Please try again.");
            } finally {
                setBusy(null);
            }
        };
        if (!block) return run();
        Alert.alert(`Block ${inv.invitedBy?.name || "this person"}?`, "They won't be able to invite you, add you or find you by email.", [
            { text: "Cancel", style: "cancel" },
            { text: "Decline & block", style: "destructive", onPress: run },
        ]);
    };

    // Compact card stays invisible until there is something to show; the full
    // page shows a skeleton instead of a blank screen while loading.
    if (invites === null) return compact ? null : <GroupListSkeleton count={2} />;
    if (!invites.length) {
        if (compact) return null;
        return (
            <Block>
                <View style={styles.empty}>
                    <MailOpen size={22} color={colors.primary} />
                    <Text style={styles.emptyTitle}>No pending invites</Text>
                    <Text style={styles.muted}>When someone invites you to a group, it shows up here.</Text>
                </View>
            </Block>
        );
    }

    return (
        <>
            {compact && <SectionLabel>Group invites ({invites.length})</SectionLabel>}
            {invites.map((inv) => {
                const meta = groupTypeMeta(inv.group.groupType);
                const Icon = getGroupIcon(inv.group.icon) || meta.Icon;
                return (
                    <Block key={inv._id}>
                        <View style={styles.row}>
                            {inv.group.photo?.url ? (
                                <Image source={{ uri: inv.group.photo.url }} style={styles.icon} />
                            ) : (
                                <LinearGradient colors={meta.accent} style={styles.icon}><Icon size={20} color="#fff" /></LinearGradient>
                            )}
                            <View style={{ flex: 1 }}>
                                <Text style={styles.name} numberOfLines={1}>{inv.group.name}</Text>
                                <Text style={styles.muted} numberOfLines={2}>
                                    {inv.invitedBy?.name || "Someone"} ({inv.invitedBy?.email}) · {meta.label} · {inv.group.memberCount} members
                                </Text>
                            </View>
                        </View>
                        <View style={styles.actions}>
                            <PillButton variant="primary" label="Join" icon={<Check size={16} color={t.onInk} />} loading={busy === inv._id}
                                disabled={!!busy} onPress={() => accept(inv)} style={{ flex: 1, height: 44 }} />
                            <PillButton variant="secondary" label="Decline" disabled={!!busy} onPress={() => decline(inv, false)} style={{ flex: 1, height: 44 }} />
                            <RoundButton size={44} label="Decline and block" disabled={!!busy} onPress={() => decline(inv, true)}>
                                <Ban size={17} color={colors.error} />
                            </RoundButton>
                        </View>
                    </Block>
                );
            })}
        </>
    );
}

const getStyles = (colors, t) => StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 12 },
    icon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
    name: { fontSize: 16, fontWeight: "700", color: colors.text },
    muted: { fontSize: 12.5, color: colors.textSecondary },
    actions: { flexDirection: "row", gap: 8, marginTop: 12, alignItems: "center" },
    empty: { alignItems: "center", gap: 6, paddingVertical: 20 },
    emptyTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
});
