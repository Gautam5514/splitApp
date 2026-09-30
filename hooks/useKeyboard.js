import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Keyboard, Platform } from "react-native";

/**
 * Keyboard height as a number + a smoothly animated value.
 *
 * Why not KeyboardAvoidingView? Inside a React Native <Modal> (a separate
 * window) and with Android edge-to-edge, the window no longer resizes when
 * the keyboard opens, and KeyboardAvoidingView is unreliable there. Keyboard
 * events always report the real height on both platforms, so we move the UI
 * ourselves.
 *
 * iOS fires keyboardWill* (animate in sync with the keyboard);
 * Android only fires keyboardDid*.
 */
export default function useKeyboard() {
    const [height, setHeight] = useState(0);
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
        const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

        const animateTo = (value, duration) =>
            Animated.timing(anim, {
                toValue: value,
                duration: duration || 220,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false, // drives layout (padding / bottom), not just transforms
            }).start();

        const onShow = (e) => {
            const h = e?.endCoordinates?.height || 0;
            setHeight(h);
            animateTo(h, e?.duration);
        };
        const onHide = (e) => {
            setHeight(0);
            animateTo(0, e?.duration);
        };

        const s = Keyboard.addListener(showEvt, onShow);
        const h = Keyboard.addListener(hideEvt, onHide);
        return () => {
            s.remove();
            h.remove();
        };
    }, [anim]);

    return { height, anim, visible: height > 0 };
}
