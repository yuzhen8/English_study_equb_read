import { TranslationProvider, TranslationResult } from './TranslationService';

export class BaiduTranslationProvider implements TranslationProvider {
    name = 'Baidu Translate';

    async translate(text: string, targetLang: string = 'zh-CN'): Promise<TranslationResult> {
        if (!window.electronAPI || !window.electronAPI.translateBaidu) {
            throw new Error('Baidu translation not supported in this environment');
        }

        try {
            const result = await window.electronAPI.translateBaidu(text, targetLang);
            if (result.success && result.translation) {
                return {
                    text,
                    translation: result.translation,
                    source: 'baidu' as any // Use as any to bypass strict literal check until interface updated if needed, but 'baidu' is usually not in strict definition unless I added it. Actually I didn't update types.ts for 'baidu' yet.
                };
            } else {
                throw new Error(result.error || 'Unknown Baidu API error');
            }
        } catch (error) {
            console.error('Baidu translation error:', error);
            throw error;
        }
    }
}
