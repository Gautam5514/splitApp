
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { ACCENT_PRESETS, PREMIUM_THEMES } from '../constants/appearance';
import { Colors } from '../constants/theme';

const ThemeContext = createContext();

const ACCENT_KEY = 'user-accent';
const PREMIUM_KEY = 'user-premium-theme';

// Overlay the chosen accent / premium palette on the stock light or dark
// palette. Premium palettes are dark designs: dark mode gets the full surface
// override, light mode only inherits the accent color.
const buildColors = (theme, accentId, premiumId) => {
    const base = Colors[theme];

    const premium = premiumId && PREMIUM_THEMES.find((t) => t.id === premiumId);
    if (premium) {
        const soft = premium.primary + (theme === 'dark' ? '26' : '1F');
        if (theme === 'dark') {
            return {
                ...base,
                background: premium.bg,
                card: premium.card,
                border: premium.border,
                inputBackground: premium.card,
                primary: premium.primary,
                primaryLight: soft,
                tint: premium.primary,
                tabIconSelected: premium.primary,
            };
        }
        return { ...base, primary: premium.primary, primaryLight: soft, tint: premium.primary, tabIconSelected: premium.primary };
    }

    const accent = accentId && ACCENT_PRESETS.find((a) => a.id === accentId);
    if (accent && accent.id !== 'default') {
        const primary = theme === 'dark' ? accent.primaryDark : accent.primary;
        return {
            ...base,
            primary,
            primaryLight: primary + (theme === 'dark' ? '33' : '1F'),
            tint: primary,
            tabIconSelected: primary,
        };
    }

    return base;
};

export const ThemeProvider = ({ children }) => {
    const systemScheme = useColorScheme(); // 'light' or 'dark'
    const [theme, setTheme] = useState(systemScheme || 'light');
    const [isSystemTheme, setIsSystemTheme] = useState(true); // Track if user is using system default
    const [accentId, setAccentId] = useState('default');
    const [premiumThemeId, setPremiumThemeId] = useState(null);

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const [savedTheme, savedAccent, savedPremium] = await Promise.all([
                AsyncStorage.getItem('user-theme'),
                AsyncStorage.getItem(ACCENT_KEY),
                AsyncStorage.getItem(PREMIUM_KEY),
            ]);
            if (savedTheme) {
                setTheme(savedTheme);
                setIsSystemTheme(false);
            }
            if (savedAccent) setAccentId(savedAccent);
            if (savedPremium) setPremiumThemeId(savedPremium);
        } catch (error) {
            console.log('Error loading theme:', error);
        }
    };

    // Keep following the device when the user has chosen "system".
    useEffect(() => {
        if (isSystemTheme && systemScheme) setTheme(systemScheme);
    }, [systemScheme, isSystemTheme]);

    const toggleTheme = async () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        setIsSystemTheme(false);
        try {
            await AsyncStorage.setItem('user-theme', newTheme);
        } catch (error) {
            console.log('Error saving theme:', error);
        }
    };

    // mode: 'light' | 'dark' | 'system'
    const setMode = async (mode) => {
        try {
            if (mode === 'system') {
                setIsSystemTheme(true);
                setTheme(systemScheme || 'light');
                await AsyncStorage.removeItem('user-theme');
            } else {
                setIsSystemTheme(false);
                setTheme(mode);
                await AsyncStorage.setItem('user-theme', mode);
            }
        } catch (error) {
            console.log('Error saving theme:', error);
        }
    };

    // Free accent color; picking one replaces any active premium theme.
    const setAccent = async (id) => {
        setAccentId(id || 'default');
        setPremiumThemeId(null);
        try {
            await AsyncStorage.setItem(ACCENT_KEY, id || 'default');
            await AsyncStorage.removeItem(PREMIUM_KEY);
        } catch (error) {
            console.log('Error saving accent:', error);
        }
    };

    // Purchased premium palette. Applying forces dark mode (they are dark
    // designs, matching the web behavior); pass null to remove it.
    const setPremiumTheme = async (id) => {
        setPremiumThemeId(id || null);
        try {
            if (id) {
                await AsyncStorage.setItem(PREMIUM_KEY, id);
                await setMode('dark');
            } else {
                await AsyncStorage.removeItem(PREMIUM_KEY);
            }
        } catch (error) {
            console.log('Error saving premium theme:', error);
        }
    };

    const resetAppearance = async () => {
        setAccentId('default');
        setPremiumThemeId(null);
        try {
            await AsyncStorage.multiRemove([ACCENT_KEY, PREMIUM_KEY]);
        } catch (error) {
            console.log('Error resetting appearance:', error);
        }
    };

    const mode = isSystemTheme ? 'system' : theme;
    const colors = buildColors(theme, accentId, premiumThemeId);

    return (
        <ThemeContext.Provider
            value={{
                theme,
                mode,
                isSystemTheme,
                toggleTheme,
                setMode,
                colors,
                accentId,
                premiumThemeId,
                setAccent,
                setPremiumTheme,
                resetAppearance,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
