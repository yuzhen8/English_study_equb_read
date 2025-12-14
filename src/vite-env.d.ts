/// <reference types="vite/client" />

interface ElectronAPI {
    translate: (text: string, targetLang: string) => Promise<{ success: boolean; translation?: string; error?: string; definitions?: string[] }>;
    translateMicrosoft: (text: string, targetLang: string) => Promise<{ success: boolean; translation?: string; error?: string }>;
    setProxy: (proxyRules: string) => Promise<{ success: boolean; error?: string }>;
    getSettings: () => Promise<any>;
    saveSettings: (settings: any) => Promise<{ success: boolean; error?: string }>;
    readFile: (path: string) => Promise<{ success: boolean; data?: ArrayBuffer; error?: string }>;
    selectFile: () => Promise<string | null>;
    getAudio: (url: string, word: string) => Promise<{ success: boolean; path?: string; error?: string }>;
    searchLocal: (word: string) => Promise<{ success: boolean; found: boolean; message?: string; data?: any }>;
}

interface Window {
    electronAPI: ElectronAPI;
}
