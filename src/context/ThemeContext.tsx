import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeId = 'default' | 'ocean' | 'forest' | 'sunset' | 'nebula' | 'midnight' | 'grey' | 'pink';

export interface Theme {
    id: ThemeId;
    name: string;
    colors: {
        background: string; // CSS class for gradient background
        glowPrimary: string; // Tailwind color class for primary blob (e.g., 'bg-indigo-500/20')
        glowSecondary: string; // Tailwind color class for secondary blob
        accent: string; // Hex or tailwind class for semantic accents
    };
}

const themes: Record<ThemeId, Theme> = {
    default: {
        id: 'default',
        name: 'Slate (Default)',
        colors: {
            background: 'bg-gradient-to-br from-slate-900 via-slate-800 to-black',
            glowPrimary: 'bg-indigo-500/20',
            glowSecondary: 'bg-purple-500/20',
            accent: 'indigo'
        }
    },
    ocean: {
        id: 'ocean',
        name: 'Ocean Depth',
        colors: {
            background: 'bg-gradient-to-br from-blue-950 via-cyan-900 to-slate-950',
            glowPrimary: 'bg-cyan-500/20',
            glowSecondary: 'bg-blue-600/20',
            accent: 'cyan'
        }
    },
    forest: {
        id: 'forest',
        name: 'Mystic Forest',
        colors: {
            background: 'bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-950',
            glowPrimary: 'bg-emerald-500/20',
            glowSecondary: 'bg-teal-500/20',
            accent: 'emerald'
        }
    },
    sunset: {
        id: 'sunset',
        name: 'Dusk Horizon',
        colors: {
            background: 'bg-gradient-to-br from-indigo-950 via-purple-900 to-orange-950',
            glowPrimary: 'bg-orange-500/20',
            glowSecondary: 'bg-indigo-500/20',
            accent: 'orange'
        }
    },
    nebula: {
        id: 'nebula',
        name: 'Cosmic Nebula',
        colors: {
            background: 'bg-gradient-to-br from-fuchsia-950 via-purple-900 to-slate-950',
            glowPrimary: 'bg-fuchsia-500/20',
            glowSecondary: 'bg-violet-600/20',
            accent: 'fuchsia'
        }
    },
    midnight: {
        id: 'midnight',
        name: 'Pure Midnight',
        colors: {
            background: 'bg-black',
            glowPrimary: 'bg-white/5',
            glowSecondary: 'bg-white/5',
            accent: 'slate'
        }
    },
    grey: {
        id: 'grey',
        name: 'Industrial Grey',
        colors: {
            background: 'bg-gradient-to-br from-gray-900 via-zinc-900 to-black',
            glowPrimary: 'bg-gray-500/20',
            glowSecondary: 'bg-zinc-600/20',
            accent: 'zinc'
        }
    },
    pink: {
        id: 'pink',
        name: 'Sakura Soft',
        colors: {
            background: 'bg-gradient-to-br from-rose-950 via-pink-900 to-slate-950',
            glowPrimary: 'bg-rose-500/20',
            glowSecondary: 'bg-pink-500/20',
            accent: 'rose'
        }
    }
};

interface ThemeContextType {
    currentTheme: Theme;
    setTheme: (id: ThemeId) => void;
    availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [themeId, setThemeId] = useState<ThemeId>('default');

    useEffect(() => {
        const savedTheme = localStorage.getItem('app_theme') as ThemeId;
        if (savedTheme && themes[savedTheme]) {
            setThemeId(savedTheme);
        }
    }, []);

    const handleSetTheme = (id: ThemeId) => {
        if (themes[id]) {
            setThemeId(id);
            localStorage.setItem('app_theme', id);
        }
    };

    return (
        <ThemeContext.Provider value={{
            currentTheme: themes[themeId],
            setTheme: handleSetTheme,
            availableThemes: Object.values(themes)
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
