/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#6366F1'; // Matches the primary indigo used
const tintColorDark = '#818CF8';

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
    primary: '#6366F1',
    primaryLight: '#E0E7FF', // Light indigo for backgrounds

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
    // Basics
    text: '#ECEDEE', // Light gray/white
    textSecondary: '#9CA3AF',
    background: '#111827', // Dark gray/black

    // Components
    card: '#1F2937', // Slightly lighter dark for cards
    border: '#374151',

    // Brand
    tint: tintColorDark,
    primary: '#818CF8', // Lighter indigo for dark mode
    primaryLight: '#312E81', // Darker indigo for backgrounds

    // Feedback
    error: '#F87171',
    errorLight: '#450A0A',
    success: '#34D399',
    successLight: '#064E3B',
    warning: '#FBBF24',

    // Tab Bar (Existing)
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,

    // Specifics
    inputBackground: '#374151',
    placeholder: '#6B7280',
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
