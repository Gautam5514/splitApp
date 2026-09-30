import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/theme';

const ThemeContext = createContext();

// Just two themes: White ('light') and Black ('dark'). The same palette is
// used on the web app after login (frontend/app/globals.css .app-mono).
const LEGACY_KEYS = ['user-accent', 'user-premium-theme'];

export const ThemeProvider = ({ children }) => {
    const systemScheme = useColorScheme(); // 'light' or 'dark'
    const [theme, setTheme] = useState(systemScheme === 'dark' ? 'dark' : 'light');
    const [isSystemTheme, setIsSystemTheme] = useState(true); // until the user picks one

    useEffect(() => {
        (async () => {
            try {
                const saved = await AsyncStorage.getItem('user-theme');
                if (saved === 'light' || saved === 'dark') {
                    setTheme(saved);
                    setIsSystemTheme(false);
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

    return (
        <ThemeContext.Provider
            value={{
                theme,
                mode: theme,
                isSystemTheme,
                toggleTheme,
                setMode,
                colors: Colors[theme],
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
