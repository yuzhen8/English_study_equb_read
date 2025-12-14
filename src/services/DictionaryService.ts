import { translationService } from './TranslationService';

export interface DictionaryResult {
    word: string;
    phonetics: {
        text: string;
        audio?: string; // Local path (file://...) or URL
    }[];
    meanings: {
        partOfSpeech: string;
        definitions: {
            definition: string;
            example?: string;
        }[];
    }[];
    source: {
        local: boolean;
        online: boolean;
        ai: boolean;
    };
    translations?: string[]; // Basic translations (from local/AI)
}

const FREE_DICT_API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

export class HybridDictionaryService {
    async query(word: string): Promise<DictionaryResult> {
        console.log(`[HybridDict] Querying for: ${word}`);

        // 1. Parallel: Local Search & Online Search
        // Since local is just a placeholder for now, we rely mainly on Online
        const [localRes, onlineRes] = await Promise.allSettled([
            window.electronAPI.searchLocal(word),
            this.fetchOnline(word)
        ]);

        let result: DictionaryResult = {
            word,
            phonetics: [],
            meanings: [],
            source: { local: false, online: false, ai: false },
            translations: []
        };

        // Process Online Result
        if (onlineRes.status === 'fulfilled' && onlineRes.value) {
            result = { ...result, ...onlineRes.value, source: { ...result.source, online: true } };
            // Process audio for caching
            if (result.phonetics.length > 0) {
                // Try to cache the first valid audio
                const audioPhonetic = result.phonetics.find(p => p.audio && p.audio.length > 0);
                if (audioPhonetic && audioPhonetic.audio) {
                    this.cacheAudio(audioPhonetic.audio, word).then(path => {
                        if (path) {
                            console.log('Audio cached at:', path);
                            // Update the result in a real app state if needed, 
                            // but since this is async, the UI might check cache itself or we return path here
                            // For now we just trigger cache
                        }
                    });
                }
            }
        }

        // Process Local Result
        if (localRes.status === 'fulfilled' && localRes.value && localRes.value.found && localRes.value.data) {
            const localData = localRes.value.data;
            result.source.local = true;

            // 1. Phonetic
            if (localData.phonetic && result.phonetics.every(p => p.text !== localData.phonetic)) {
                // Prepend local phonetic if not present (or if we prefer local)
                result.phonetics.unshift({ text: localData.phonetic });
            }

            // 2. Translation (Chinese)
            if (localData.translation) {
                // ECDICT translation field usually contains multi-line text.
                // We split by newline to get clean lines
                const transLines = localData.translation.split('\\n').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
                result.translations = transLines;
            }

            // 3. Definitions (English from ECDICT if available and needed)
            // Sometimes ECDICT has english definitions in 'definition' field
            if (localData.definition) {
                // Parse definition if structural? Usually it's just text.
                // We can add it as a generic meaning if online failed
                if (result.meanings.length === 0) {
                    result.meanings.push({
                        partOfSpeech: localData.pos || 'unknown',
                        definitions: [{
                            definition: localData.definition
                        }]
                    });
                }
            }
        }

        // Fallback or Augment with AI
        // If we have no meanings, OR if we want Chinese translation specifically
        // Currently existing translationService provides Chinese translation.
        try {
            const aiRes = await translationService.translate(word, 'zh-CN', 'Dictionary Lookup');
            if (aiRes && aiRes.translation) {
                result.translations = [aiRes.translation];
                // If totally empty meanings, try to parse AI defs?
                // For now, just attach translation.
                result.source.ai = true;
            }
        } catch (e) {
            console.warn('AI Augmentation failed', e);
        }

        return result;
    }

    private async fetchOnline(word: string): Promise<Partial<DictionaryResult> | null> {
        try {
            const response = await fetch(`${FREE_DICT_API_BASE}${word}`);
            if (!response.ok) return null;
            const data = await response.json();
            if (!Array.isArray(data) || data.length === 0) return null;

            const entry = data[0];
            return {
                word: entry.word,
                phonetics: entry.phonetics.map((p: any) => ({
                    text: p.text,
                    audio: p.audio
                })),
                meanings: entry.meanings.map((m: any) => ({
                    partOfSpeech: m.partOfSpeech,
                    definitions: m.definitions.map((d: any) => ({
                        definition: d.definition,
                        example: d.example
                    }))
                }))
            };
        } catch (e) {
            console.error('Online dict fetch error', e);
            return null;
        }
    }

    async getAudioUrl(word: string, url: string): Promise<string> {
        // Check local cache via IPC
        const res = await window.electronAPI.getAudio(url, word);
        if (res.success && res.path) {
            // Convert file path to local URL
            // Windows paths need file:/// (three slashes), Unix paths need file:// (two slashes)
            const normalizedPath = res.path.replace(/\\/g, '/');
            // If it's a Windows absolute path (starts with C:/, D:/, etc.), use file:///
            // Otherwise use file://
            if (/^[A-Za-z]:\//.test(normalizedPath)) {
                return `file:///${normalizedPath}`;
            }
            return `file://${normalizedPath}`;
        }
        return url; // Fallback to online URL
    }

    private async cacheAudio(url: string, word: string) {
        // Trigger download in background
        const res = await window.electronAPI.getAudio(url, word);
        return res.success ? res.path : null;
    }
}

export const hybridDictionary = new HybridDictionaryService();
