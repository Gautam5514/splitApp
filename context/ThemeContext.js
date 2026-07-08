
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/theme';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const systemScheme = useColorScheme(); // 'light' or 'dark'
    const [theme, setTheme] = useState(systemScheme || 'light');
    const [isSystemTheme, setIsSystemTheme] = useState(true); // Track if user is using system default

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('user-theme');
            if (savedTheme) {
                setTheme(savedTheme);
                setIsSystemTheme(false);
            }
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

    const mode = isSystemTheme ? 'system' : theme;
    const colors = Colors[theme];

    return (
        <ThemeContext.Provider value={{ theme, mode, isSystemTheme, toggleTheme, setMode, colors }}>
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
