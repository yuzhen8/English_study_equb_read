import { TranslationProvider, TranslationResult } from './TranslationService';

export class DeepSeekTranslationProvider implements TranslationProvider {
    name = 'DeepSeek AI';
    private apiKey: string = '';
    private apiUrl: string = 'https://api.deepseek.com/v1/chat/completions';

    setApiKey(key: string) {
        this.apiKey = key;
    }

    async translate(text: string, targetLang: string = 'zh-CN'): Promise<TranslationResult> {
        if (!this.apiKey) {
            throw new Error('DeepSeek API key not configured');
        }

        const prompt = targetLang === 'zh-CN'
            ? `请将以下英文翻译成中文，只返回翻译结果，不要有其他说明：\n\n${text}`
            : `Please translate the following text to ${targetLang}:\n\n${text}`;

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        {
                            role: 'user',
                            content: prompt,
                        },
                    ],
                    temperature: 0.3,
                }),
            });

            const data = await response.json();
            const translation = data.choices[0].message.content.trim();

            return {
                text,
                translation,
                source: 'deepseek',
            };
        } catch (error) {
            console.error('DeepSeek translation error:', error);
            throw error;
        }
    }
}
