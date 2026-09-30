import { StyleSheet } from "react-native";

// Shared look for the 1:1 and group chat screens (reference: clean white
// bubbles on a soft grey canvas, time under each run of messages).

export const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

/** "Today, Jun 14" · "Yesterday, Jun 13" · "Mon, Jun 10" · "Jun 10, 2024" */
export const dayLabel = (date) => {
    const d = new Date(date), now = new Date();
    const md = d.toLocaleDateString([], { month: "short", day: "numeric" });
    if (d.toDateString() === now.toDateString()) return `Today, ${md}`;
    const yest = new Date(now.getTime() - 86400000);
    if (d.toDateString() === yest.toDateString()) return `Yesterday, ${md}`;
    if (d.getFullYear() !== now.getFullYear()) return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    return `${d.toLocaleDateString([], { weekday: "short" })}, ${md}`;
};

export const timeOf = (d) => new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const RUN_GAP_MS = 5 * 60 * 1000;
const senderOf = (m) => String(m?.sender?._id || m?.sender || "");

/**
 * With newest-first data (inverted list), is `item` the last message of a
 * "run" (same sender, within 5 minutes)? Time + ticks show only there.
 */
export const endsRun = (item, newer) =>
    !newer ||
    senderOf(newer) !== senderOf(item) ||
    !sameDay(newer.createdAt, item.createdAt) ||
    new Date(newer.createdAt) - new Date(item.createdAt) > RUN_GAP_MS;

/** Is `item` the first message of a run (older neighbour is someone else / far apart)? */
export const startsRun = (item, older) => endsRun(older, item);

export const chatStyles = (colors, isDark) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },

        // Header — no call / video buttons by design
        header: {
            flexDirection: "row", alignItems: "center", gap: 12,
            paddingLeft: 6, paddingRight: 16, paddingTop: 6, paddingBottom: 12,
            backgroundColor: colors.card,
            borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
            borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
            shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
            shadowOpacity: isDark ? 0 : 0.05, shadowRadius: 14, elevation: isDark ? 0 : 3,
            zIndex: 2,
        },
        backBtn: { width: 40, height: 44, alignItems: "center", justifyContent: "center" },
        headerTap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
        avatarWrap: { position: "relative" },
        avatar: { width: 48, height: 48, borderRadius: 24 },
        avatarPh: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", overflow: "hidden" },
        avatarText: { fontSize: 19, fontWeight: "700", color: "#fff" },
        onlineDot: {
            position: "absolute", bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6,
            backgroundColor: "#10B981", borderWidth: 2, borderColor: colors.card,
        },
        headerInfo: { flex: 1 },
        headerName: { fontSize: 18, fontWeight: "500", color: colors.text, letterSpacing: -0.2 },
        headerStatus: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },

        // Canvas
        list: { flex: 1 },
        listContent: { paddingHorizontal: 16, paddingVertical: 14 },
        dayLabel: { textAlign: "center", fontSize: 12, color: colors.textSecondary, marginVertical: 14 },

        // Bubbles — same surface for both sides; alignment tells them apart
        row: { width: "100%" },
        rowMine: { alignItems: "flex-end" },
        rowOther: { alignItems: "flex-start" },
        bubble: {
            maxWidth: "78%", paddingHorizontal: 14, paddingVertical: 10,
            borderRadius: 16, backgroundColor: colors.card,
            borderWidth: isDark ? StyleSheet.hairlineWidth : 0, borderColor: colors.border,
        },
        bubbleMedia: { paddingHorizontal: 4, paddingTop: 4, paddingBottom: 6 },
        gapInRun: { marginBottom: 4 },
        gapAfterRun: { marginBottom: 14 },
        media: { width: 230, height: 230, borderRadius: 12, resizeMode: "cover" },

        // WhatsApp-style: text and the time/ticks share the bubble. Short text
        // keeps the time on the same line; long text pushes it to its own line,
        // right-aligned, still inside the bubble.
        body: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "flex-end" },
        bodyMedia: { paddingHorizontal: 8, paddingTop: 6 },
        text: { fontSize: 14.5, lineHeight: 20.5, color: colors.text, flexShrink: 1 },
        meta: { flexDirection: "row", alignItems: "center", gap: 3, marginLeft: "auto", paddingLeft: 10, marginBottom: -1 },
        time: { fontSize: 11, color: colors.textSecondary },

        empty: { alignItems: "center", paddingVertical: 80, transform: [{ scaleY: -1 }] },
        emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: "center", paddingHorizontal: 30 },
    });
