/// <reference types="vite/client" />

interface Window {
    electronAPI: {
        translate: (text: string, targetLang: string) => Promise<{ success: boolean; translation?: string; error?: string; definitions?: string[]; data?: any; }>;
        translateMicrosoft: (text: string, targetLang: string) => Promise<{ success: boolean; translation?: string; error?: string; definitions?: string[]; }>;
        setProxy: (proxyRules: string) => Promise<{ success: boolean; error?: string }>;
        getSettings: () => Promise<any>;
        saveSettings: (settings: any) => Promise<{ success: boolean; error?: string }>;
    };
}
