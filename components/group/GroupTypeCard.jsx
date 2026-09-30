import { Block, useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { getGroupIcon } from "@/lib/groupIcons";
import { formatMoney, groupTypeMeta } from "@/lib/groupPresets";
import { LinearGradient } from "expo-linear-gradient";
import { CalendarDays, Receipt, Repeat, Settings2, TrendingUp, TriangleAlert, UserRoundCheck } from "lucide-react-native";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";

const fmtDay = (d) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });

/**
 * Card under the group header that changes with the type (same as web):
 * Trip = budget meter, day X of Y, per-day, who pays next · Roommates = this
 * month, next bill · Business = receipts missing · Other = total.
 */
export default function GroupTypeCard({ group, summary, isCreator, onOpenSettings, onOpenBills, onEditLook }) {
    const { colors, t } = useDesign();
    const styles = getStyles(colors, t);
    const type = group.groupType || "general";
    const meta = groupTypeMeta(type);
    const currency = summary?.currency || group.settings?.currency || "INR";
    const money = (v) => formatMoney(v, currency);
    const GroupIcon = getGroupIcon(group.icon) || meta.Icon;

    if (!summary) return <Block style={{ minHeight: 120 }}><View /></Block>;

    const stat = (label, value, hint) => (
        <View style={{ flex: 1 }}>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
            {hint ? <Text style={styles.hint} numberOfLines={1}>{hint}</Text> : null}
        </View>
    );
    const link = (Icon, label, onPress, tint) => (
        <TouchableOpacity onPress={onPress} style={styles.inline} accessibilityRole="button">
            <Icon size={13} color={tint || colors.primary} />
            <Text style={[styles.linkText, tint && { color: tint }]}>{label}</Text>
        </TouchableOpacity>
    );

    let body;
    if (type === "trip") {
        const tr = summary.trip || {};
        const budget = tr.budget;
        const pct = budget ? Math.min(100, Math.round((summary.total / budget) * 100)) : 0;
        const over = budget && summary.total > budget;
        const timeline =
            tr.status === "ongoing" && tr.totalDays ? `Day ${tr.dayNumber} of ${tr.totalDays}`
            : tr.status === "upcoming" ? `Starts ${fmtDay(tr.startDate)}`
            : tr.status === "ended" ? "Trip ended"
            : tr.status === "ongoing" ? `Day ${tr.dayNumber}` : null;
        body = (
            <>
                {budget ? (
                    <View style={{ marginBottom: 12 }}>
                        <View style={styles.spread}>
                            <Text style={styles.muted}><Text style={styles.big}>{money(summary.total)}</Text> of {money(budget)}</Text>
                            <View style={styles.inline}>
                                {over ? <TriangleAlert size={12} color={colors.error} /> : null}
                                <Text style={[styles.hintStrong, over && { color: colors.error }]}>
                                    {over ? `${money(summary.total - budget)} over` : `${money(budget - summary.total)} left`}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }}>
                            <View style={[styles.fill, { width: `${Math.max(pct, 2)}%`, backgroundColor: over ? colors.error : pct > 80 ? "#F59E0B" : colors.primary }]} />
                        </View>
                    </View>
                ) : (
                    <View style={[styles.spread, { marginBottom: 12 }]}>
                        <Text style={styles.big}>{money(summary.total)}</Text>
                        {isCreator ? link(Settings2, "Set a budget", onOpenSettings) : null}
                    </View>
                )}
                <View style={styles.metaWrap}>
                    {timeline ? <View style={styles.inline}><CalendarDays size={12} color={colors.textSecondary} /><Text style={styles.hint}>{timeline}</Text></View> : null}
                    <View style={styles.inline}><TrendingUp size={12} color={colors.textSecondary} /><Text style={styles.hint}>{money(tr.perDay || 0)}/day</Text></View>
                    {summary.nextPayer ? (
                        <View style={styles.inline}><UserRoundCheck size={12} color={colors.primary} /><Text style={styles.hint}>Next to pay: <Text style={styles.hintStrong}>{summary.nextPayer.name}</Text></Text></View>
                    ) : null}
                </View>
            </>
        );
    } else if (type === "roommate") {
        const diff = summary.thisMonth - summary.lastMonth;
        const bills = summary.upcomingBills || [];
        const month = new Date().toLocaleDateString(undefined, { month: "long" });
        body = (
            <>
                <View style={[styles.row, { marginBottom: 12 }]}>
                    {stat(`${month} total`, money(summary.thisMonth), summary.lastMonth ? `${diff >= 0 ? "+" : "-"}${money(Math.abs(diff))} vs last month` : "First month")}
                    {stat("Your share", money(summary.myShare), `You paid ${money(summary.myPaid)}`)}
                </View>
                {bills.length
                    ? link(Repeat, `Next: ${bills[0].description} ${money(bills[0].amount)} on ${fmtDay(bills[0].nextRunAt)}${bills.length > 1 ? ` · +${bills.length - 1}` : ""}`, onOpenBills)
                    : link(Repeat, "Set up monthly bills (rent, WiFi…)", onOpenBills)}
            </>
        );
    } else if (type === "business") {
        body = (
            <>
                <View style={[styles.row, { marginBottom: 12 }]}>
                    {stat("Total spend", money(summary.total), `${summary.count} expenses`)}
                    {stat("You paid", money(summary.myPaid), `Your share ${money(summary.myShare)}`)}
                </View>
                <View style={styles.spread}>
                    <View style={styles.inline}>
                        <Receipt size={12} color={summary.missingReceipts ? "#D97706" : colors.textSecondary} />
                        <Text style={[styles.hint, summary.missingReceipts && { color: "#D97706", fontWeight: "700" }]}>
                            {summary.missingReceipts ? `${summary.missingReceipts} without receipt` : "All receipts attached"}
                        </Text>
                    </View>
                </View>
            </>
        );
    } else {
        body = (
            <View style={styles.row}>
                {stat("Total spend", money(summary.total), `${summary.count} expenses`)}
                {stat("Your share", money(summary.myShare), `You paid ${money(summary.myPaid)}`)}
            </View>
        );
    }

    return (
        <Block>
            <View style={[styles.spread, { marginBottom: 12 }]}>
                <TouchableOpacity style={[styles.inline, { gap: 10 }]} onPress={isCreator ? onEditLook : undefined}
                    disabled={!isCreator} accessibilityLabel={isCreator ? "Change group photo or icon" : undefined}>
                    {group.photo?.url ? (
                        <Image source={{ uri: group.photo.url }} style={styles.avatar} />
                    ) : (
                        <LinearGradient colors={meta.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
                            <GroupIcon size={18} color="#fff" strokeWidth={2.2} />
                        </LinearGradient>
                    )}
                    <View style={styles.inline}>
                        <meta.Icon size={13} color={colors.primary} />
                        <Text style={styles.typeLabel}>{meta.label}</Text>
                    </View>
                </TouchableOpacity>
                {isCreator ? link(Settings2, "Settings", onOpenSettings, colors.textSecondary) : null}
            </View>
            {body}
        </Block>
    );
}

const getStyles = (colors, t) => StyleSheet.create({
    avatar: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    typeLabel: { fontSize: 13, fontWeight: "700", color: colors.text },
    spread: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    row: { flexDirection: "row", gap: 12 },
    inline: { flexDirection: "row", alignItems: "center", gap: 5 },
    metaWrap: { flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 6 },
    big: { fontSize: 22, fontWeight: "800", color: colors.text },
    muted: { fontSize: 13, color: colors.textSecondary },
    statLabel: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.4 },
    statValue: { fontSize: 20, fontWeight: "800", color: colors.text, marginTop: 3 },
    hint: { fontSize: 12, color: colors.textSecondary },
    hintStrong: { fontSize: 12, fontWeight: "700", color: colors.text },
    linkText: { fontSize: 12.5, fontWeight: "700", color: colors.primary, flexShrink: 1 },
    track: { height: 8, borderRadius: 4, backgroundColor: t.surfaceAlt, overflow: "hidden", marginTop: 8 },
    fill: { height: "100%", borderRadius: 4 },
});
