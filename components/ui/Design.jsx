/**
 * Shared building blocks of the Messages-tab design. Every screen composes
 * these, so buttons, inputs, headers and lists look identical app-wide.
 * See constants/design.js for the rules.
 */
import { Loader } from "@/components/Loader";
import { Text, TextInput } from "@/components/ui/Typography";
import { SIZE, TYPE, R, surfaceStyle, tokens } from "@/constants/design";
import { SCREEN_GUTTER } from "@/constants/layout";
import { useTheme } from "@/context/ThemeContext";
import { router } from "expo-router";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { forwardRef, useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

/** Theme tokens hook for screens that need raw values. */
export function useDesign() {
    const { colors, theme } = useTheme();
    const isDark = theme === "dark";
    return useMemo(() => ({ colors, isDark, t: tokens(colors, isDark) }), [colors, isDark]);
}

/** 48pt round icon button (surface). `active` → filled ink. */
export function RoundButton({ onPress, label, children, active, size = SIZE.roundBtn, style, disabled }) {
    const { t } = useDesign();
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: !!active, disabled: !!disabled }}
            style={[
                surfaceStyle(t),
                { width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" },
                active && { backgroundColor: t.ink, borderColor: t.ink },
                disabled && { opacity: 0.5 },
                style,
            ]}
        >
            {children}
        </TouchableOpacity>
    );
}

/**
 * Page header. Tab screens: big title (+ optional right actions).
 * Pushed screens: round back button + title. `subtitle` optional.
 */
export function ScreenHeader({ title, subtitle, onBack, back = false, right, style }) {
    const { colors } = useDesign();
    const goBack = onBack || (() => router.back());
    const showBack = back || !!onBack;
    return (
        <View style={[styles.header, style]}>
            {showBack && (
                <RoundButton onPress={goBack} label="Back" style={styles.backBtn}>
                    <ChevronLeft size={22} color={colors.text} strokeWidth={2.3} />
                </RoundButton>
            )}
            <View style={styles.headerText}>
                <Text
                    style={[showBack ? styles.titleSmall : styles.title, { color: colors.text }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                >
                    {title}
                </Text>
                {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>{subtitle}</Text> : null}
            </View>
            {right ? <View style={styles.headerRight}>{right}</View> : null}
        </View>
    );
}

/** 52pt pill text input with an optional leading icon / trailing node. */
export const PillInput = forwardRef(function PillInput({ icon, trailing, style, inputStyle, multiline, ...props }, ref) {
    const { colors, t } = useDesign();
    return (
        <View style={[surfaceStyle(t), styles.pill, multiline && styles.pillMultiline, style]}>
            {icon}
            <TextInput
                ref={ref}
                placeholderTextColor={colors.textSecondary}
                selectionColor={colors.primary}
                multiline={multiline}
                style={[styles.pillInput, { color: colors.text }, multiline && styles.pillInputMultiline, inputStyle]}
                {...props}
            />
            {trailing}
        </View>
    );
});

/** 54pt pill button. variant: "primary" (ink) | "secondary" (surface) | "danger". */
export function PillButton({ label, onPress, icon, variant = "primary", loading, disabled, style, textStyle, accessibilityLabel }) {
    const { colors, t } = useDesign();
    const isPrimary = variant === "primary";
    const isDanger = variant === "danger";
    const fg = isPrimary ? t.onInk : isDanger ? colors.error : colors.text;
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel || label}
            accessibilityState={{ disabled: !!(disabled || loading) }}
            style={[
                styles.button,
                isPrimary ? { backgroundColor: t.ink } : surfaceStyle(t),
                isDanger && { borderColor: colors.error },
                (disabled || loading) && { opacity: 0.5 },
                style,
            ]}
        >
            {loading ? <Loader size={18} color={fg} /> : icon}
            {!loading && label ? <Text style={[styles.buttonText, { color: fg }, textStyle]}>{label}</Text> : null}
        </TouchableOpacity>
    );
}

/** Segmented pill switch (like Chats | Groups). */
export function Segmented({ options, value, onChange, style }) {
    const { colors, t } = useDesign();
    return (
        <View style={[surfaceStyle(t), styles.segment, style]} accessibilityRole="tablist">
            {options.map((o) => {
                const active = o.value === value;
                return (
                    <TouchableOpacity
                        key={o.value}
                        onPress={() => onChange(o.value)}
                        activeOpacity={0.8}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: active }}
                        style={[styles.segmentBtn, active && { backgroundColor: t.ink }]}
                    >
                        <Text style={[styles.segmentText, { color: active ? t.onInk : colors.textSecondary }, active && styles.segmentTextActive]}>
                            {o.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

/** Small uppercase label above a group of rows / a block. */
export function SectionLabel({ children, right, style }) {
    const { colors } = useDesign();
    return (
        <View style={[styles.sectionLabelRow, style]}>
            <Text style={[TYPE.sectionTitle, { color: colors.text }]}>{children}</Text>
            {right}
        </View>
    );
}

/** Rounded surface block for grouped content (stats, charts, forms, menus). */
export function Block({ children, style, padded = true }) {
    const { t } = useDesign();
    return <View style={[surfaceStyle(t), styles.block, padded && styles.blockPadded, style]}>{children}</View>;
}

/**
 * List row in the Messages style: leading visual, title/subtitle, trailing.
 * No divider lines. `chevron` shows a › when there's no custom trailing.
 */
export function ListRow({ leading, title, subtitle, trailing, onPress, chevron, danger, style, accessibilityLabel, numberOfLines = 1 }) {
    const { colors } = useDesign();
    const Wrapper = onPress ? TouchableOpacity : View;
    return (
        <Wrapper
            onPress={onPress}
            activeOpacity={0.7}
            accessibilityRole={onPress ? "button" : undefined}
            accessibilityLabel={accessibilityLabel || (typeof title === "string" ? title : undefined)}
            style={[styles.row, style]}
        >
            {leading}
            <View style={styles.rowText}>
                <Text style={[TYPE.rowTitle, { color: danger ? colors.error : colors.text }]} numberOfLines={numberOfLines}>{title}</Text>
                {subtitle ? <Text style={[TYPE.secondary, { color: colors.textSecondary }]} numberOfLines={2}>{subtitle}</Text> : null}
            </View>
            {trailing ?? (chevron ? <ChevronRight size={20} color={colors.textSecondary} /> : null)}
        </Wrapper>
    );
}

/** Round icon badge used as a row's leading visual. */
export function IconCircle({ children, size = 44, tint }) {
    const { t } = useDesign();
    return (
        <View style={[{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }, { backgroundColor: tint || t.surfaceAlt }]}>
            {children}
        </View>
    );
}

/** Ink count badge (like unread counts). */
export function CountBadge({ value }) {
    const { t } = useDesign();
    if (!value) return null;
    return (
        <View style={[styles.badge, { backgroundColor: t.ink }]}>
            <Text style={[styles.badgeText, { color: t.onInk }]}>{value > 99 ? "99+" : value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row", alignItems: "center", gap: 12,
        paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: 16,
    },
    backBtn: {},
    headerText: { flex: 1, minWidth: 0 },
    title: { ...TYPE.pageTitle },
    titleSmall: { fontSize: 22, fontWeight: "700", letterSpacing: -0.3 },
    subtitle: { ...TYPE.secondary, marginTop: 2 },
    headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },

    pill: {
        flexDirection: "row", alignItems: "center", gap: 10,
        minHeight: SIZE.input, borderRadius: SIZE.input / 2, paddingHorizontal: 18,
    },
    pillMultiline: { borderRadius: R.block, alignItems: "flex-start", paddingVertical: 12 },
    pillInput: { flex: 1, fontSize: 15.5, paddingVertical: 0, minHeight: 24 },
    pillInputMultiline: { minHeight: 90, textAlignVertical: "top" },

    button: {
        height: SIZE.button, borderRadius: SIZE.button / 2, paddingHorizontal: 22,
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    },
    buttonText: { fontSize: 16, fontWeight: "600" },

    segment: { flexDirection: "row", padding: 4, gap: 2, borderRadius: 24, alignSelf: "flex-start" },
    segmentBtn: { height: 38, minWidth: 76, paddingHorizontal: 16, borderRadius: 19, alignItems: "center", justifyContent: "center" },
    segmentText: { fontSize: 14, fontWeight: "500" },
    segmentTextActive: { fontWeight: "600" },

    sectionLabelRow: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: SCREEN_GUTTER, marginTop: 8, marginBottom: 10,
    },

    block: { marginHorizontal: SCREEN_GUTTER, marginBottom: 24, borderRadius: R.block, overflow: "hidden" },
    blockPadded: { padding: 16 },

    row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: SCREEN_GUTTER, paddingVertical: 11 },
    rowText: { flex: 1, minWidth: 0, gap: 3 },

    badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: "center", justifyContent: "center" },
    badgeText: { fontSize: 11.5, fontWeight: "700" },
});
