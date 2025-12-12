import { TranslationProvider, TranslationResult } from './TranslationService';

export class GoogleTranslationProvider implements TranslationProvider {
    name = 'Google Translate';
    private apiKey: string = '';

    setApiKey(key: string) {
        this.apiKey = key;
    }

    async translate(text: string, targetLang: string = 'zh-CN'): Promise<TranslationResult> {
        if (!this.apiKey) {
            // Fallback to free endpoint (note: may have limitations)
            return this.translateFree(text, targetLang);
        }

        try {
            const url = `https://translation.googleapis.com/language/translate/v2?key=${this.apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    q: text,
                    target: targetLang,
                    format: 'text',
                }),
            });

            const data = await response.json();
            return {
                text,
                translation: data.data.translations[0].translatedText,
                source: 'google',
            };
        } catch (error) {
            console.error('Google translation error:', error);
            throw error;
        }
    }

    private async translateFree(text: string, targetLang: string): Promise<TranslationResult> {
        // Use Electron IPC if available
        if (window.electronAPI) {
            try {
                const result = await window.electronAPI.translate(text, targetLang);
                if (result.success && result.translation) {
                    return {
                        text,
                        translation: result.translation,
                        source: 'google',
                        // Map extra data if available (from IPC update)
                        definitions: result.definitions,
                        // definitions property is now supported by IPC return
                    };
                } else {
                    throw new Error(result.error || 'Unknown IPC error');
                }
            } catch (error) {
                console.error('Electron IPC translation error:', error);
                // fall through to fetch fallback if needed, or rethrow
                throw error;
            }
        }

        // Fallback for browser-only dev (will likely fail with CORS)
        try {
            const response = await fetch(
                `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
            );
            const data = await response.json();
            const translation = data[0].map((item: any) => item[0]).join('');

            return {
                text,
                translation,
                source: 'google',
            };
        } catch (error) {
            console.error('Free Google translation error:', error);
            throw error;
        }
    }
}
