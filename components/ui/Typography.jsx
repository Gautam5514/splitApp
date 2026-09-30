import { fontFamilyFor, isManagedFamily } from "@/constants/typography";
import { forwardRef } from "react";
import { Animated, Text as RNText, TextInput as RNTextInput, StyleSheet } from "react-native";

/**
 * Drop-in replacements for React Native's Text / TextInput that apply the
 * app font everywhere. Same props, same refs. The weight in the style picks
 * the font file (and the synthetic fontWeight is cleared so iOS doesn't fake-
 * bold an already-bold file).
 */
// Flipped on by the root layout once the font files are loaded. If loading
// ever fails, text simply stays in the system font instead of erroring.
let appFontsReady = false;
export const setAppFontsReady = (ready) => {
    appFontsReady = !!ready;
};

const withAppFont = (style) => {
    if (!appFontsReady) return style;
    const flat = StyleSheet.flatten(style) || {};
    if (!isManagedFamily(flat.fontFamily)) return style; // explicit custom family wins
    return [style, { fontFamily: fontFamilyFor(flat.fontWeight, flat.fontStyle), fontWeight: "normal", fontStyle: "normal" }];
};

export const Text = forwardRef(function AppText({ style, ...rest }, ref) {
    return <RNText ref={ref} {...rest} style={withAppFont(style)} />;
});

export const TextInput = forwardRef(function AppTextInput({ style, ...rest }, ref) {
    return <RNTextInput ref={ref} {...rest} style={withAppFont(style)} />;
});

// Animated.Text with the app font (used by the Loader label).
export const AnimatedText = Animated.createAnimatedComponent(Text);
