import { Check, CheckCheck, Clock3 } from "lucide-react-native";

/**
 * Message delivery status, WhatsApp-style:
 *   sending   → clock          (not on the server yet)
 *   sent      → single grey ✓   (saved on the server)
 *   delivered → double grey ✓✓  (reached the other person's device)
 *   seen      → double blue ✓✓  (they opened the chat)
 */
export const SEEN_BLUE = "#3B82F6";
export const SEEN_BLUE_DARK = "#60A5FA";

const idOf = (v) => (v && typeof v === "object" ? String(v._id || v.id || "") : String(v || ""));
const has = (list, id) => Array.isArray(list) && list.some((x) => idOf(x) === String(id));

/** Status of MY message in a 1:1 chat with `otherId`. */
export function directStatus(msg, otherId) {
    if (msg.status === "sending" || String(msg._id || "").startsWith("temp-")) return "sending";
    if (otherId && has(msg.seenBy, otherId)) return "seen";
    if (otherId && has(msg.deliveredTo, otherId)) return "delivered";
    return "sent";
}

/**
 * Status of MY message in a group: blue once every other member has seen it,
 * grey double once at least one has, otherwise a single tick.
 */
export function groupStatus(msg, memberIds, meId) {
    if (msg.status === "sending" || String(msg._id || "").startsWith("temp-")) return "sending";
    const others = (memberIds || []).map(String).filter((id) => id && id !== String(meId));
    if (!others.length) return "sent";
    const seen = others.filter((id) => has(msg.seenBy, id)).length;
    if (seen === others.length) return "seen";
    if (seen > 0) return "delivered";
    return "sent";
}

const LABELS = { sending: "Sending", sent: "Sent", delivered: "Delivered", seen: "Seen" };

export default function MessageTicks({ status, greyColor, isDark, size = 15 }) {
    const blue = isDark ? SEEN_BLUE_DARK : SEEN_BLUE;
    const common = { size, strokeWidth: 2.4, accessibilityLabel: LABELS[status] };
    if (status === "sending") return <Clock3 {...common} size={size - 2} color={greyColor} />;
    if (status === "seen") return <CheckCheck {...common} color={blue} />;
    if (status === "delivered") return <CheckCheck {...common} color={greyColor} />;
    return <Check {...common} color={greyColor} />;
}
