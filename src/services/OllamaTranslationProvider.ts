import { TranslationProvider, TranslationResult } from './TranslationService';

export class OllamaTranslationProvider implements TranslationProvider {
    name = 'Ollama (Local)';
    private baseUrl: string = 'http://localhost:11434';
    private model: string = 'llama2';
    private promptTemplate: string = '';
    private contextEnabled: boolean = true;
    private thinkEnabled: boolean = false;

    setBaseUrl(url: string) {
        this.baseUrl = url;
    }

    setModel(model: string) {
        this.model = model;
    }

    setPromptTemplate(template: string) {
        this.promptTemplate = template;
    }

    setContextEnabled(enabled: boolean) {
        this.contextEnabled = enabled;
    }

    setThinkEnabled(enabled: boolean) {
        this.thinkEnabled = enabled;
    }

    async translate(text: string, targetLang: string = 'zh-CN', context?: string): Promise<TranslationResult> {
        let prompt = '';
        const contextText = (this.contextEnabled && context) ? context : '';

        if (this.promptTemplate) {
            prompt = this.promptTemplate.replace(/\{\{text\}\}/g, text);

            if (prompt.includes('{{context}}')) {
                prompt = prompt.replace(/\{\{context\}\}/g, contextText);
            } else if (this.contextEnabled && contextText) {
                // If context is enabled but no placeholder, append it intelligently
                prompt += `\n\nContext:\n${contextText}`;
            }
        } else {
            const contextInstruction = contextText ? `\nContext: ${contextText}` : '';
            prompt = targetLang === 'zh-CN'
                ? `请将以下英文翻译成中文，只返回翻译结果，不要有其他说明${contextInstruction}：\n\n${text}`
                : `Please translate the following text to ${targetLang}, only return the translation${contextInstruction}:\n\n${text}`;
        }

        console.log('[Ollama Provider] Generated Prompt:', prompt);

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
            let translation = data.response.trim();

            // Handle <think> tags based on settings
            // If thinkEnabled is false, remove <think>...</think> blocks
            // If true, keep them (maybe UI handles rendering, or we return raw)
            // Assuming UI might not parse tags yet, let's keep it simple: 
            // If thinkEnabled is FALSE, we STRIP them. If TRUE, we KEEP them.
            if (!this.thinkEnabled) {
                translation = translation.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
            }

            // Cleanup Markdown code blocks if present (e.g. ```json ... ```)
            // This is important because even if we ask for raw JSON, LLMs often wrap it.
            const jsonBlockChanged = translation.match(/```json\s*(\{[\s\S]*\})\s*```/i);
            const anyCodeBlock = translation.match(/```\s*(\{[\s\S]*\})\s*```/i);

            if (jsonBlockChanged) {
                translation = jsonBlockChanged[1];
            } else if (anyCodeBlock) {
                translation = anyCodeBlock[1];
            }

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
