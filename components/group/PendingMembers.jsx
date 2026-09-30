import { Block, ListRow, RoundButton, SectionLabel, useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { api } from "@/lib/api";
import { Alert } from "@/lib/alert";
import { Check, X } from "lucide-react-native";
import { StyleSheet, TouchableOpacity, View } from "react-native";

// Creator-only: join-by-link requests to approve, invites waiting to be accepted.
export default function PendingMembers({ groupId, pending, onChanged }) {
    const { colors, t } = useDesign();
    const { invites = [], requests = [] } = pending || {};
    if (!invites.length && !requests.length) return null;

    const act = async (fn) => {
        try {
            await fn();
            onChanged?.();
        } catch (err) {
            Alert.alert("Something went wrong", err?.response?.data?.message || "Please try again.");
        }
    };
    const avatar = (name) => (
        <View style={[styles.avatar, { backgroundColor: t.surfaceAlt }]}>
            <Text style={{ fontWeight: "700", color: colors.textSecondary }}>{(name || "?").charAt(0).toUpperCase()}</Text>
        </View>
    );

    return (
        <>
            {requests.length > 0 && (
                <>
                    <SectionLabel>Join requests ({requests.length})</SectionLabel>
                    <Block padded={false}>
                        {requests.map((r) => (
                            <ListRow key={r._id} leading={avatar(r.user?.name)} title={r.user?.name} subtitle={r.user?.email}
                                trailing={
                                    <View style={styles.actions}>
                                        <RoundButton size={36} label={`Approve ${r.user?.name}`} active
                                            onPress={() => act(() => api.post(`/groups/${groupId}/invites/${r._id}/approve`))}>
                                            <Check size={16} color={t.onInk} />
                                        </RoundButton>
                                        <RoundButton size={36} label={`Reject ${r.user?.name}`}
                                            onPress={() => act(() => api.delete(`/groups/${groupId}/invites/${r._id}`))}>
                                            <X size={16} color={colors.textSecondary} />
                                        </RoundButton>
                                    </View>
                                } />
                        ))}
                    </Block>
                </>
            )}
            {invites.length > 0 && (
                <>
                    <SectionLabel>Waiting to accept ({invites.length})</SectionLabel>
                    <Block padded={false}>
                        {invites.map((r) => (
                            <ListRow key={r._id} leading={avatar(r.user?.name)} title={r.user?.name} subtitle={r.user?.email}
                                trailing={
                                    <TouchableOpacity onPress={() => act(() => api.delete(`/groups/${groupId}/invites/${r._id}`))} hitSlop={8}>
                                        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.error }}>Cancel</Text>
                                    </TouchableOpacity>
                                } />
                        ))}
                    </Block>
                </>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    actions: { flexDirection: "row", gap: 8 },
});
