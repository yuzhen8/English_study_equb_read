import { TranslationProvider, TranslationResult } from './TranslationService';

export class OllamaTranslationProvider implements TranslationProvider {
    name = 'Ollama (Local)';
    private baseUrl: string = 'http://localhost:11434';
    private model: string = 'llama2';

    setBaseUrl(url: string) {
        this.baseUrl = url;
    }

    setModel(model: string) {
        this.model = model;
    }

    async translate(text: string, targetLang: string = 'zh-CN'): Promise<TranslationResult> {
        const prompt = targetLang === 'zh-CN'
            ? `请将以下英文翻译成中文，只返回翻译结果，不要有其他说明：\n\n${text}`
            : `Please translate the following text to ${targetLang}, only return the translation:\n\n${text}`;

        try {
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    prompt: prompt,
                    stream: false,
                }),
            });

            const data = await response.json();
            const translation = data.response.trim();

            return {
                text,
                translation,
                source: 'ollama',
            };
        } catch (error) {
            console.error('Ollama translation error:', error);
            throw error;
        }
    }
}
