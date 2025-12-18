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
    // SRS 调试日志
    logSRS: (data: any) => Promise<{ success: boolean; path?: string; error?: string }>;
    // CEFR 分析
    analyzeCEFR: (text: string) => Promise<{ success: boolean; data?: CefrAnalysisResult; error?: string }>;
    checkCEFR: () => Promise<{ success: boolean; cefrDictPath?: string; cefrDictSize?: number; error?: string }>;
    // New Book File Management
    saveBookFile: (id: string, arrayBuffer: ArrayBuffer) => Promise<{ success: boolean; path?: string; error?: string }>;
    deleteBookFile: (id: string) => Promise<{ success: boolean; error?: string }>;
    saveBackupData: (data: string) => Promise<{ success: boolean; path?: string; error?: string }>;
    loadBackupData: () => Promise<{ success: boolean; data?: string; error?: string }>;
    exportBooks: () => Promise<{ success: boolean; count?: number; error?: string }>;
}

// CEFR 分析结果接口
interface CefrAnalysisResult {
    totalWords: number;
    uniqueWords: number;
    knownWordsCount: number;
    unknownWordsCount: number;
    unknownWordsRatio: number;
    distribution: {
        [key: string]: {
            count: number;
            percentage: number;
            uniqueWords: number;
        };
    };
    difficultyScore: number;
    primaryLevel: string;
    sampleUnknownWords: string[];
    cefrDictionarySize: number;
}

interface Window {
    electronAPI: ElectronAPI;
}
