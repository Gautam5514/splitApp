/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// Default theme = the Messages screen look: monochrome "ink" accents.
// Light: black accent, white text on it. Dark: white accent, black text on it.
const tintColorLight = '#141414';
const tintColorDark = '#FFFFFF';

export const Colors = {
  light: {
    // Basics
    text: '#11181C',
    textSecondary: '#6B7280',
    background: '#F9FAFB', // Light gray background

    // Components
    card: '#FFFFFF',
    border: '#E5E7EB',

    // Brand
    tint: tintColorLight,
    primary: '#141414',
    onPrimary: '#FFFFFF', // text / icons placed ON a primary-coloured fill
    primaryLight: 'rgba(20,20,20,0.06)', // soft tint for chips, icon boxes, selected rows

    // Feedback
    error: '#EF4444',
    errorLight: '#FEF2F2',
    success: '#10B981',
    successLight: '#D1FAE5',
    warning: '#F59E0B',

    // Tab Bar (Existing)
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,

    // Specifics
    inputBackground: '#FFFFFF',
    placeholder: '#9CA3AF',
  },
  dark: {
    // Basics — a true black theme so it looks bold and applies cleanly everywhere.
    text: '#FFFFFF',
    textSecondary: '#A1A1AA',
    background: '#000000',

    // Components
    card: '#121214',
    border: 'rgba(255,255,255,0.08)',

    // Brand
    tint: tintColorDark,
    primary: '#FFFFFF',
    onPrimary: '#141414',
    primaryLight: 'rgba(255,255,255,0.10)',

    // Feedback
    error: '#F87171',
    errorLight: '#450A0A',
    success: '#34D399',
    successLight: '#064E3B',
    warning: '#FBBF24',

    // Tab Bar (Existing)
    icon: '#9EAEC5',
    tabIconDefault: '#9EAEC5',
    tabIconSelected: tintColorDark,

    // Specifics
    inputBackground: '#121214',
    placeholder: '#71717A',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
