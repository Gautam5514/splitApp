import { Text } from "@/components/ui/Typography";
import { useTheme } from "@/context/ThemeContext";
import { BlurView } from "expo-blur";
import {
    AlertTriangle,
    CheckCircle2,
    HelpCircle,
    Info,
    Trash2,
    XCircle,
} from "lucide-react-native";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import {
    Animated,
    Modal,
    Pressable,
    StyleSheet,
    View,
} from "react-native";

/**
 * Premium in-app alert / confirmation dialog.
 *
 * Replaces the OS `Alert.alert` so save / delete / logout confirmations look
 * on-brand in both light and dark mode. Two ways to use it:
 *
 *   1. Hook:      const { showAlert } = usePremiumAlert(); showAlert({ ... })
 *   2. Anywhere:  import { showAlert } from "@/lib/alert"; showAlert({ ... })
 *
 * `showAlert` accepts either an options object, OR the same positional args as
 * Alert.alert(title, message, buttons) for drop-in replacement.
 */

const AlertContext = createContext(null);

// Imperative bridge so non-React code (async handlers) can trigger the dialog.
let externalShow = null;
let externalHide = null;

const TONE = {
    default: { Icon: Info, color: "#3B82F6", tint: "rgba(59,130,246,0.14)" },
    info: { Icon: Info, color: "#3B82F6", tint: "rgba(59,130,246,0.14)" },
    success: { Icon: CheckCircle2, color: "#10B981", tint: "rgba(16,185,129,0.14)" },
    warning: { Icon: AlertTriangle, color: "#F59E0B", tint: "rgba(245,158,11,0.16)" },
    danger: { Icon: Trash2, color: "#F43F5E", tint: "rgba(244,63,94,0.14)" },
    error: { Icon: XCircle, color: "#F43F5E", tint: "rgba(244,63,94,0.14)" },
    question: { Icon: HelpCircle, color: "#6366F1", tint: "rgba(99,102,241,0.14)" },
};

// Infer a tone when none is given, so existing call sites look right for free.
function inferTone(title = "", buttons = []) {
    const t = title.toLowerCase();
    if (buttons.some((b) => b?.style === "destructive")) return "danger";
    if (/delete|remove|clear|log ?out|discard/.test(t)) return "danger";
    if (/error|failed|couldn't|unable|invalid|not sent|unavailable/.test(t)) return "error";
    if (/saved|done|success|sent|unlocked|updated|created|added|copied|cleared/.test(t)) return "success";
    if (/\?$|are you sure|confirm/.test(t)) return "question";
    if (/missing|warning|careful/.test(t)) return "warning";
    return "default";
}

// Normalise both call styles into a single options object.
export function normalizeAlertArgs(a, b, c) {
    if (a && typeof a === "object" && !Array.isArray(a)) return a;
    return { title: a, message: b, buttons: c };
}

export function PremiumAlertProvider({ children }) {
    const { colors, theme } = useTheme();
    const isDark = theme === "dark";
    const styles = getStyles(colors, isDark);

    const [visible, setVisible] = useState(false);
    const [opts, setOpts] = useState(null);
    const fade = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.92)).current;
    const iconPop = useRef(new Animated.Value(0)).current;

    const hide = useCallback(() => {
        Animated.parallel([
            Animated.timing(fade, { toValue: 0, duration: 140, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 0.94, duration: 140, useNativeDriver: true }),
        ]).start(() => {
            setVisible(false);
            setOpts(null);
        });
    }, [fade, scale]);

    const showAlert = useCallback((a, b, c) => {
        const o = normalizeAlertArgs(a, b, c);
        setOpts(o);
        setVisible(true);
        fade.setValue(0);
        scale.setValue(0.92);
        iconPop.setValue(0);
        Animated.parallel([
            Animated.timing(fade, { toValue: 1, duration: 190, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
        ]).start();
        // The icon springs in a touch later so it "lands" on the card.
        Animated.spring(iconPop, { toValue: 1, friction: 5, tension: 90, delay: 90, useNativeDriver: true }).start();
    }, [fade, scale, iconPop]);

    useEffect(() => {
        externalShow = showAlert;
        externalHide = hide;
        return () => { externalShow = null; externalHide = null; };
    }, [showAlert, hide]);

    // Build the button list. When only one action is provided, pair it with a
    // Cancel so every dialog has an obvious dismiss option (opt out with
    // hideCancel: true). Already-multi-button dialogs are left as-is.
    const rawButtons = (opts?.buttons && opts.buttons.length ? opts.buttons : [{ text: "OK" }]);
    const hasCancel = rawButtons.some((b) => b?.style === "cancel");
    const buttons = (rawButtons.length === 1 && !hasCancel && !opts?.hideCancel)
        ? [{ text: "Cancel", style: "cancel" }, rawButtons[0]]
        : rawButtons;
    const tone = TONE[opts?.tone || inferTone(opts?.title, rawButtons)] || TONE.default;
    const Icon = tone.Icon;

    const onPressButton = (btn) => {
        hide();
        // Let the exit animation start before running the callback.
        setTimeout(() => btn?.onPress?.(), 60);
    };

    // Stack vertically when there are 3+ actions; otherwise a tidy row.
    const stacked = buttons.length >= 3;

    return (
        <AlertContext.Provider value={{ showAlert, hideAlert: hide }}>
            {children}
            <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={hide}>
                <Animated.View style={[styles.backdrop, { opacity: fade }]}>
                    <BlurView intensity={isDark ? 40 : 24} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                    <Pressable style={StyleSheet.absoluteFill} onPress={hide} accessibilityLabel="Dismiss dialog" />

                    <Animated.View style={[styles.card, { opacity: fade, transform: [{ scale }] }]}>
                        {/* Layered icon badge — soft outer ring + inner circle, springs in */}
                        <Animated.View
                            style={[
                                styles.iconRing,
                                { backgroundColor: tone.tint, transform: [{ scale: iconPop }] },
                            ]}
                        >
                            <View style={[styles.iconInner, { backgroundColor: tone.color }]}>
                                <Icon size={28} color="#FFFFFF" strokeWidth={2.6} />
                            </View>
                        </Animated.View>

                        {!!opts?.title && <Text style={styles.title}>{opts.title}</Text>}
                        {!!opts?.message && <Text style={styles.message}>{opts.message}</Text>}

                        <View style={[styles.actions, stacked ? styles.actionsStacked : styles.actionsRow]}>
                            {buttons.map((btn, i) => {
                                const isDestructive = btn.style === "destructive";
                                const isCancel = btn.style === "cancel";
                                const isPrimary = !isCancel && !isDestructive;
                                return (
                                    <Pressable
                                        key={`${btn.text}-${i}`}
                                        onPress={() => onPressButton(btn)}
                                        accessibilityRole="button"
                                        accessibilityLabel={btn.text}
                                        style={({ pressed }) => [
                                            styles.btn,
                                            stacked ? styles.btnFull : styles.btnFlex,
                                            isDestructive && { backgroundColor: TONE.danger.color, shadowColor: TONE.danger.color },
                                            isPrimary && { backgroundColor: colors.primary, shadowColor: colors.primary },
                                            (isPrimary || isDestructive) && styles.btnSolid,
                                            isCancel && styles.btnCancel,
                                            pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.btnText,
                                                (isPrimary || isDestructive) && { color: "#FFFFFF" },
                                                isCancel && { color: colors.text },
                                            ]}
                                        >
                                            {btn.text}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </Animated.View>
                </Animated.View>
            </Modal>
        </AlertContext.Provider>
    );
}

export function usePremiumAlert() {
    const ctx = useContext(AlertContext);
    if (!ctx) {
        return { showAlert: (...a) => externalShow?.(...a), hideAlert: () => externalHide?.() };
    }
    return ctx;
}

// Imperative API for use outside React components / in async handlers.
export function showAlert(a, b, c) {
    if (externalShow) return externalShow(a, b, c);
}
export function hideAlert() {
    if (externalHide) return externalHide();
}

const getStyles = (colors, isDark) =>
    StyleSheet.create({
        backdrop: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 28,
            backgroundColor: isDark ? "rgba(0,0,0,0.45)" : "rgba(15,23,42,0.28)",
        },
        card: {
            width: "100%",
            maxWidth: 340,
            borderRadius: 30,
            backgroundColor: colors.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
            paddingHorizontal: 24,
            paddingTop: 28,
            paddingBottom: 20,
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 24 },
            shadowOpacity: isDark ? 0.55 : 0.2,
            shadowRadius: 40,
            elevation: 24,
        },
        // Layered badge: soft tinted outer ring holding a solid colour disc.
        iconRing: {
            width: 72,
            height: 72,
            borderRadius: 36,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
        },
        iconInner: {
            width: 52,
            height: 52,
            borderRadius: 26,
            alignItems: "center",
            justifyContent: "center",
        },
        title: {
            fontSize: 19,
            fontWeight: "800",
            color: colors.text,
            textAlign: "center",
            letterSpacing: -0.3,
        },
        message: {
            fontSize: 14,
            lineHeight: 20,
            color: colors.textSecondary,
            textAlign: "center",
            marginTop: 8,
        },
        actions: { width: "100%", marginTop: 24 },
        actionsRow: { flexDirection: "row", gap: 10 },
        actionsStacked: { flexDirection: "column", gap: 10 },
        btn: {
            height: 52,
            borderRadius: 26,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 18,
        },
        btnSolid: {
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.28,
            shadowRadius: 12,
            elevation: 4,
        },
        btnFlex: { flex: 1 },
        btnFull: { width: "100%" },
        btnCancel: {
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F2F5",
        },
        btnText: { fontSize: 15.5, fontWeight: "700", color: colors.text },
    });
