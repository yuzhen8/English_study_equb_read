
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
        local: string | null;
        online: string | null;
        ai: string | null;
    };
    translations?: string[]; // Basic translations (from local/AI)
    lemma?: string; // Word prototype/base form (from ECDICT exchange field)
}

const FREE_DICT_API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

export class HybridDictionaryService {
    async query(word: string): Promise<DictionaryResult> {
        // Legacy wrapper: waits for both (or we can deprecate this and use progressive in UI)
        // For backward compatibility, we can keep the parallel approach but optimized
        const [localRes, onlineRes] = await Promise.allSettled([
            this.queryLocal(word),
            this.queryOnline(word)
        ]);

        // Merge results
        let result: DictionaryResult = {
            word,
            phonetics: [],
            meanings: [],
            source: { local: null, online: null, ai: null },
            translations: []
        };

        if (localRes.status === 'fulfilled' && localRes.value) {
            result = this.mergeResults(result, localRes.value);
        }

        if (onlineRes.status === 'fulfilled' && onlineRes.value) {
            result = this.mergeResults(result, onlineRes.value);
        }

        // Audio caching logic is now inside queryOnline or handled separately? 
        // Let's keep a simple query() for now, but UI will use specific methods.

        // Fallback to AI if no meanings found
        if (result.meanings.length === 0 && (!result.translations || result.translations.length === 0)) {
            const aiRes = await this.queryAI(word);
            if (aiRes) {
                result = this.mergeResults(result, aiRes);
            }
        }

        return result;
    }

    async queryLocal(word: string): Promise<DictionaryResult | null> {
        try {
            const localRes = await window.electronAPI.searchLocal(word);
            if (localRes.found && localRes.data) {
                const localData = localRes.data;
                const result: DictionaryResult = {
                    word: localData.word || word,
                    phonetics: [],
                    meanings: [],
                    source: { local: 'ECDICT', online: null, ai: null },
                    translations: []
                };

                // 1. Phonetic
                if (localData.phonetic) {
                    result.phonetics.push({ text: localData.phonetic });
                }

                // 2. Translation
                if (localData.translation) {
                    result.translations = localData.translation.split('\n').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
                }

                // 3. Definitions
                if (localData.definition) {
                    result.meanings.push({
                        partOfSpeech: localData.pos || 'unknown',
                        definitions: [{ definition: localData.definition }]
                    });
                }

                // 4. Extract lemma from exchange field (format: 0:lemma/p:past/...)
                if (localData.exchange) {
                    const parts = localData.exchange.split('/');
                    for (const part of parts) {
                        if (part.startsWith('0:')) {
                            result.lemma = part.substring(2); // Extract lemma after '0:'
                            break;
                        }
                    }
                }

                return result;
            }
        } catch (e) {
            console.error('Local query error:', e);
        }
        return null;
    }

    async queryOnline(word: string): Promise<DictionaryResult | null> {
        const partial = await this.fetchOnline(word);
        if (!partial) return null;

        const result: DictionaryResult = {
            word: partial.word || word,
            phonetics: partial.phonetics || [],
            meanings: partial.meanings || [],
            source: { local: null, online: 'Free Dictionary', ai: null },
            translations: []
        };

        // Cache audio
        if (result.phonetics.length > 0) {
            const audioPhonetic = result.phonetics.find(p => p.audio && p.audio.length > 0);
            if (audioPhonetic && audioPhonetic.audio) {
                this.cacheAudio(audioPhonetic.audio, word).catch(console.warn);
            }
        }

        return result;
    }

    // Helper to merge results
    mergeResults(base: DictionaryResult, newResult: DictionaryResult): DictionaryResult {
        // Strategy: 
        // 1. Word: Prefer newResult (Online) as it usually has standard casing, unless base has it and new doesn't.
        // 2. Phonetics: Merge and dedupe.
        // 3. Meanings: If Online has meanings, use them (they are more detailed/standard). Fallback to Local only if Online has none.
        // 4. Translations: Merge (Local usually provides Chinese).

        return {
            ...base,
            ...newResult,
            word: newResult.word || base.word,
            phonetics: [...base.phonetics, ...newResult.phonetics].filter((p, i, self) =>
                i === self.findIndex(t => t.text === p.text && t.audio === p.audio) // Dedup
            ),
            // Fix duplicate meanings: Use Online meanings if available, otherwise keep Local
            meanings: newResult.meanings.length > 0 ? newResult.meanings : base.meanings,
            translations: [...(base.translations || []), ...(newResult.translations || [])].filter((t, i, self) => self.indexOf(t) === i), // Dedup translations
            source: {
                local: base.source.local || newResult.source.local,
                online: base.source.online || newResult.source.online,
                ai: base.source.ai || newResult.source.ai
            }
        };
    }

    async queryAI(word: string): Promise<DictionaryResult | null> {
        try {
            const aiData = await translationService.translate(word, 'zh-CN', `Explain the word "${word}"`);
            if (!aiData) return null;

            const result: DictionaryResult = {
                word: aiData.text || word,
                phonetics: aiData.pronunciation ? [{ text: aiData.pronunciation }] : [],
                meanings: [], // AI usually returns flat translation, structure if needed
                source: { local: null, online: null, ai: 'AI' }, // Or use aiData.source
                translations: aiData.translation ? [aiData.translation] : []
            };

            // If definitions are returned
            if (aiData.definitions && aiData.definitions.length > 0) {
                result.meanings.push({
                    partOfSpeech: 'unknown',
                    definitions: aiData.definitions.map((d: string) => ({ definition: d }))
                });
            }

            return result;
        } catch (e) {
            console.error('AI query error', e);
            return null;
        }
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
