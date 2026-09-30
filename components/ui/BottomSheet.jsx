import useKeyboard from "@/hooks/useKeyboard";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Easing,
    Keyboard,
    Modal,
    PanResponder,
    Pressable,
    StyleSheet,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SCREEN_H = Dimensions.get("window").height;
const CLOSE_DISTANCE = 110; // drag down this far (or flick) to dismiss
const CLOSE_VELOCITY = 1.1;

/**
 * Reusable bottom sheet with the behaviour users expect:
 *  • slides up (spring) over a fading backdrop; slides down to close
 *  • always sits ABOVE the keyboard, on iOS and Android (edge-to-edge)
 *  • never taller than the space left between the notch and the keyboard
 *  • close by: tapping outside, swiping the handle/header down, Android back
 *  • `onOpened` fires after the open animation (focus inputs there, so the
 *    keyboard doesn't fight the slide-in)
 *
 * Controlled: parent owns `visible` and sets it false in `onClose`.
 */
export default function BottomSheet({ visible, onClose, onOpened, header, children, backgroundColor, handleColor }) {
    const insets = useSafeAreaInsets();
    const keyboard = useKeyboard();
    const [mounted, setMounted] = useState(visible);
    const slide = useRef(new Animated.Value(SCREEN_H)).current; // 0 = fully open
    const fade = useRef(new Animated.Value(0)).current;
    const drag = useRef(new Animated.Value(0)).current;

    const animateIn = useCallback(() => {
        slide.setValue(SCREEN_H);
        drag.setValue(0);
        Animated.parallel([
            Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
            Animated.spring(slide, { toValue: 0, damping: 22, stiffness: 220, mass: 0.9, useNativeDriver: true }),
        ]).start(({ finished }) => finished && onOpened?.());
    }, [drag, fade, slide, onOpened]);

    const animateOut = useCallback(
        (after) => {
            Keyboard.dismiss();
            Animated.parallel([
                Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
                Animated.timing(slide, { toValue: SCREEN_H, duration: 230, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
            ]).start(() => after?.());
        },
        [fade, slide]
    );

    // Parent toggles `visible`; we keep the Modal mounted until the close animation ends.
    useEffect(() => {
        if (visible) {
            setMounted(true);
        } else if (mounted) {
            animateOut(() => setMounted(false));
        }
    }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

    const requestClose = useCallback(() => {
        Keyboard.dismiss();
        onClose?.();
    }, [onClose]);

    // Swipe down on the handle / header to dismiss.
    const pan = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_e, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
            onPanResponderMove: (_e, g) => drag.setValue(Math.max(0, g.dy)),
            onPanResponderRelease: (_e, g) => {
                if (g.dy > CLOSE_DISTANCE || g.vy > CLOSE_VELOCITY) {
                    requestCloseRef.current?.();
                } else {
                    Animated.spring(drag, { toValue: 0, damping: 18, stiffness: 240, useNativeDriver: true }).start();
                }
            },
            onPanResponderTerminate: () =>
                Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start(),
        })
    ).current;
    const requestCloseRef = useRef(requestClose);
    requestCloseRef.current = requestClose;

    // Space available for the sheet: below the notch, above the keyboard.
    const maxHeight = SCREEN_H - insets.top - 12 - keyboard.height;
    const bottomPad = keyboard.visible ? 12 : insets.bottom + 16;

    if (!mounted) return null;

    return (
        <Modal
            visible
            transparent
            animationType="none"
            statusBarTranslucent
            navigationBarTranslucent
            onShow={animateIn}
            onRequestClose={requestClose} // Android back button
        >
            <View style={styles.root}>
                <Animated.View style={[styles.backdrop, { opacity: fade }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} accessibilityLabel="Close" accessibilityRole="button" />
                </Animated.View>

                {/* Keyboard offset (layout) wraps the slide/drag (native transform) */}
                <Animated.View style={[styles.anchor, { paddingBottom: keyboard.anim }]} pointerEvents="box-none">
                    <Animated.View
                        style={[
                            styles.sheet,
                            { backgroundColor, maxHeight, paddingBottom: bottomPad },
                            { transform: [{ translateY: Animated.add(slide, drag) }] },
                        ]}
                    >
                        <View {...pan.panHandlers} style={styles.grabArea}>
                            <View style={[styles.handle, handleColor && { backgroundColor: handleColor }]} />
                            {header}
                        </View>
                        {children}
                    </Animated.View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
    anchor: { flex: 1, justifyContent: "flex-end" },
    sheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 16,
    },
    grabArea: { paddingBottom: 2 },
    handle: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: "rgba(128,128,128,0.35)", marginBottom: 14 },
});
