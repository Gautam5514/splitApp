import { Block, PillButton, SectionLabel, useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { flatSurface } from "@/constants/design";
import { api } from "@/lib/api";
import { Alert } from "@/lib/alert";
import { AlertCircle, Check, Clock } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

const BATCH_LABEL = {
    scheduled: "Scheduled",
    sending: "Sending",
    done: "Sent to everyone",
    partial: "Sent to some members",
    failed: "Could not be sent",
    superseded: "Replaced by a newer statement",
    cancelled: "Cancelled",
};
const ACTIVE = ["scheduled", "sending"];

/**
 * Settlement statement: who has received the emailed PDF, plus (creator only)
 * send again / retry failed. The server queues the email when a group is
 * completed or fully settled; this card only shows and nudges it.
 */
export default function StatementCard({ groupId, isCreator, reloadKey }) {
    const { colors } = useDesign();
    const [status, setStatus] = useState(null);
    const [busy, setBusy] = useState("");

    const load = useCallback(async () => {
        try {
            const { data } = await api.get(`/groups/${groupId}/report/status`);
            setStatus(data);
        } catch {
            setStatus((s) => s || { latest: null });
        }
    }, [groupId]);

    useEffect(() => { load(); }, [load, reloadKey]);

    const latest = status?.latest;
    const active = !!latest && ACTIVE.includes(latest.status);
    useEffect(() => {
        if (!active) return undefined;
        const id = setInterval(load, 15000);
        return () => clearInterval(id);
    }, [active, load]);

    const act = async (kind) => {
        setBusy(kind);
        try {
            const { data } = await api.post(`/groups/${groupId}/report/${kind}`);
            Alert.alert("Statement", data?.message || "Done");
            load();
        } catch (e) {
            Alert.alert("Statement", e?.response?.data?.message || "Something went wrong. Please try again.");
        } finally {
            setBusy("");
        }
    };

    if (!latest && !isCreator) return null;
    const failedCount = latest?.recipients?.filter((r) => r.status === "failed").length || 0;

    return (
        <>
            <SectionLabel>Settlement statement</SectionLabel>
            <Block style={flatSurface}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                    {latest
                        ? `${BATCH_LABEL[latest.status] || latest.status}${latest.reason === "settled" ? " (all settled)" : latest.reason === "completed" ? " (group completed)" : ""}`
                        : "Emailed to every member when the group is completed or fully settled."}
                </Text>

                {latest?.recipients?.map((r) => {
                    const sent = r.status === "sent";
                    const failed = r.status === "failed";
                    const Icon = sent ? Check : failed ? AlertCircle : Clock;
                    const color = sent ? "#10B981" : failed ? colors.error : colors.textSecondary;
                    return (
                        <View key={r.userId} style={styles.row}>
                            <Text style={{ color: colors.text, flex: 1 }} numberOfLines={1}>{r.name}</Text>
                            <Icon size={14} color={color} />
                            <Text style={{ color, fontSize: 12, fontWeight: "600" }}>
                                {sent ? "Sent" : failed ? "Failed" : r.status === "sending" ? "Sending" : "Queued"}
                            </Text>
                        </View>
                    );
                })}

                {isCreator && (
                    <View style={styles.actions}>
                        <PillButton
                            label={latest ? "Send again" : "Email to everyone"}
                            variant="secondary"
                            loading={busy === "send"}
                            disabled={active}
                            onPress={() => act("send")}
                        />
                        {failedCount > 0 && (
                            <PillButton label={`Retry ${failedCount} failed`} variant="secondary" loading={busy === "retry"} onPress={() => act("retry")} />
                        )}
                    </View>
                )}
            </Block>
        </>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 10 },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
});
