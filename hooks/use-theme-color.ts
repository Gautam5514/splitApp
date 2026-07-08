/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const { theme } = useTheme();
  const currentTheme = theme as 'light' | 'dark';

  const colorFromProps = props[currentTheme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[currentTheme][colorName];
  }
}
