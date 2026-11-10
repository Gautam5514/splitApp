import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/theme';
import { applyAccent, normalizeAccent } from '../lib/accent';

const ThemeContext = createContext();

// Two modes: White ('light') and Black ('dark'). On top of that, an optional
// accent theme (earned with referral coins / Elite tier) recolours the ink.
// The same palette is used on the web app after login.
const LEGACY_KEYS = ['user-accent', 'user-premium-theme'];
const ACCENT_KEY = 'user-accent-theme'; // JSON { key, name, light, dark }

export const ThemeProvider = ({ children }) => {
    const systemScheme = useColorScheme(); // 'light' or 'dark'
    const [theme, setTheme] = useState(systemScheme === 'dark' ? 'dark' : 'light');
    const [isSystemTheme, setIsSystemTheme] = useState(true); // until the user picks one
    const [accent, setAccentState] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const saved = await AsyncStorage.getItem('user-theme');
                if (saved === 'light' || saved === 'dark') {
                    setTheme(saved);
                    setIsSystemTheme(false);
                }
                const savedAccent = await AsyncStorage.getItem(ACCENT_KEY);
                if (savedAccent) {
                    let parsed = null;
                    try { parsed = JSON.parse(savedAccent); } catch { parsed = null; }
                    setAccentState(normalizeAccent(parsed));
                }
                // Old accent / premium palettes no longer exist.
                await AsyncStorage.multiRemove(LEGACY_KEYS);
            } catch (error) {
                console.log('Error loading theme:', error);
            }
        })();
    }, []);

    // Follow the device until the user explicitly picks White or Black.
    useEffect(() => {
        if (isSystemTheme && systemScheme) setTheme(systemScheme === 'dark' ? 'dark' : 'light');
    }, [systemScheme, isSystemTheme]);

    const setMode = async (mode) => {
        const next = mode === 'dark' ? 'dark' : 'light';
        setTheme(next);
        setIsSystemTheme(false);
        try {
            await AsyncStorage.setItem('user-theme', next);
        } catch (error) {
            console.log('Error saving theme:', error);
        }
    };

    const toggleTheme = () => setMode(theme === 'dark' ? 'light' : 'dark');

    // Pass a theme ({ key, name, colors } or { key, name, light, dark }) to
    // apply it, or null to go back to the default ink.
    const setAccent = useCallback(async (value) => {
        const next = normalizeAccent(value);
        setAccentState(next);
        try {
            if (next) await AsyncStorage.setItem(ACCENT_KEY, JSON.stringify(next));
            else await AsyncStorage.removeItem(ACCENT_KEY);
        } catch (error) {
            console.log('Error saving accent:', error);
        }
    }, []);

    const colors = useMemo(() => applyAccent(Colors[theme], accent, theme), [theme, accent]);

    return (
        <ThemeContext.Provider
            value={{
                theme,
                mode: theme,
                isSystemTheme,
                toggleTheme,
                setMode,
                accent,
                setAccent,
                colors,
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
