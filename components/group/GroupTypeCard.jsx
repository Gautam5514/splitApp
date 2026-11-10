import { Block, useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { flatFill } from "@/constants/design";
import { getGroupIcon } from "@/lib/groupIcons";
import { formatMoney, groupTypeMeta } from "@/lib/groupPresets";
import { LinearGradient } from "expo-linear-gradient";
import { CalendarDays, Pencil, Receipt, Settings2, TrendingUp, TriangleAlert, UserRoundCheck } from "lucide-react-native";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";

const fmtDay = (d) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });

/**
 * Card under the group header. First line answers "where do I stand?" (my
 * balance in this group); below it the stats change with the type:
 * Trip = budget meter, day X of Y, per-day, who pays next · Roommates = this
 * month · Business = receipts missing · Other = total.
 * `myNet`: my balance (+ = I get, - = I owe), `undefined` while it loads.
 */
export default function GroupTypeCard({ group, summary, isCreator, onOpenSettings, onEditLook, myNet }) {
    const { colors, t } = useDesign();
    const styles = getStyles(colors, t);
    const type = group.groupType || "general";
    const meta = groupTypeMeta(type);
    const currency = summary?.currency || group.settings?.currency || "INR";
    const money = (v) => formatMoney(v, currency);
    const GroupIcon = getGroupIcon(group.icon) || meta.Icon;
    const owes = typeof myNet === "number" && myNet < -0.01;
    const gets = typeof myNet === "number" && myNet > 0.01;
    const standing = myNet === undefined ? "…"
        : owes ? `You owe ${money(Math.round(-myNet))}`
        : gets ? `You get ${money(Math.round(myNet))}`
        : "All settled up";

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

    let body = null;
    if (!summary) {
        body = null; // stats still loading (or failed): the balance line stands alone
    } else if (type === "trip") {
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
        const month = new Date().toLocaleDateString(undefined, { month: "long" });
        body = (
            <>
                <View style={[styles.row, { marginBottom: 12 }]}>
                    {stat(`${month} total`, money(summary.thisMonth), summary.lastMonth ? `${diff >= 0 ? "+" : "-"}${money(Math.abs(diff))} vs last month` : "First month")}
                    {stat("Your share", money(summary.myShare), `You paid ${money(summary.myPaid)}`)}
                </View>
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
        <Block style={styles.card}>
            <View style={[styles.inline, { gap: 12 }, body ? { marginBottom: 14 } : null]}>
                <TouchableOpacity onPress={isCreator ? onEditLook : undefined}
                    disabled={!isCreator} accessibilityLabel={isCreator ? "Change group photo or icon" : undefined}>
                    <View>
                        {group.photo?.url ? (
                            <Image source={{ uri: group.photo.url }} style={styles.avatar} />
                        ) : (
                            <LinearGradient colors={meta.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
                                <GroupIcon size={21} color="#fff" strokeWidth={2.2} />
                            </LinearGradient>
                        )}
                        {/* Small pencil = "you can change this" (creator only) */}
                        {isCreator ? (
                            <View style={styles.editBadge}>
                                <Pencil size={9} color={t.onInk} strokeWidth={2.6} />
                            </View>
                        ) : null}
                    </View>
                </TouchableOpacity>
                {/* The one thing everyone opens a group for */}
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.statLabel}>Your balance</Text>
                    <Text
                        style={[styles.standing, owes && { color: colors.error }, gets && { color: colors.success }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                    >
                        {standing}
                    </Text>
                </View>
            </View>
            {body}
        </Block>
    );
}

const getStyles = (colors, t) => StyleSheet.create({
    card: flatFill(t), // borderless tinted fill, no shadow
    standing: { fontSize: 24, fontWeight: "800", color: colors.text, letterSpacing: -0.4, marginTop: 2 },
    avatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    editBadge: {
        position: "absolute", right: -2, bottom: -2,
        width: 18, height: 18, borderRadius: 9,
        alignItems: "center", justifyContent: "center",
        backgroundColor: t.ink, borderWidth: 2, borderColor: colors.background,
    },
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
    track: { height: 8, borderRadius: 4, backgroundColor: t.outline, overflow: "hidden", marginTop: 8 },
    fill: { height: "100%", borderRadius: 4 },
});
