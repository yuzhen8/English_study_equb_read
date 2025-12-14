// Placeholder for Local Dictionary Service
// This matches the interface expected by HybridDictionaryService conceptually

export const localDictionary = {
    search: async (word: string) => {
        // In the future this will query IPC -> SQLite
        // For now, let's assume it returns a simple structure or delegates to ElectronAPI
        try {
            return await window.electronAPI.searchLocal(word);
        } catch (e) {
            console.error(e);
            return { success: false, found: false };
        }
    }
};
