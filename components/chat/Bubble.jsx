import { Image, View } from "react-native";
import { Text } from "@/components/ui/Typography";
import MessageTicks from "./MessageStatus";
import { timeOf } from "./chatUi";

/**
 * One chat bubble with the time (and, for my messages, the ticks) tucked into
 * its bottom-right corner — like WhatsApp.
 *
 *   status: "sending" | "sent" | "delivered" | "seen" | null (others' messages)
 */
export default function Bubble({ item, status, styles, colors, isDark, spacingStyle }) {
    const hasMedia = !!item.mediaUrl;
    const hasText = !!item.text;

    return (
        <View style={[styles.bubble, hasMedia && styles.bubbleMedia, spacingStyle]}>
            {hasMedia && <Image source={{ uri: item.mediaUrl }} style={styles.media} accessibilityLabel="Photo" />}
            <View style={[styles.body, hasMedia && styles.bodyMedia]}>
                {hasText && <Text style={styles.text}>{item.text}</Text>}
                <View style={styles.meta}>
                    <Text style={styles.time}>{timeOf(item.createdAt)}</Text>
                    {status && <MessageTicks status={status} greyColor={colors.textSecondary} isDark={isDark} size={14} />}
                </View>
            </View>
        </View>
    );
}
