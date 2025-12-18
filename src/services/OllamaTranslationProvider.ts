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
        const isSentence = text.trim().split(/\s+/).length > 2;
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
            if (isSentence && targetLang === 'zh-CN') {
                prompt = `请分析以下英文句子并使用中文提供分析结果：
1. translation: 地道的中文翻译。
2. grammarAnalysis: 一个结构化的分析对象，包含：
   - sentenceType: 句型类型 (如：简单句、复合句等)
   - mainTense: 主要时态 (如：一般过去时等)
   - structure: 句子的骨架结构描述 (如：主+谓+宾)
   - components: 一个数组，包含句子中重要片段的语法角色和中文详细解释。

请严格按照以下 JSON 格式返回结果（所有分析内容必须使用中文）：
{
  "translation": "...",
  "grammarAnalysis": {
    "sentenceType": "...",
    "mainTense": "...",
    "structure": "...",
    "components": [
      {"segment": "...", "role": "...", "explanation": "..."}
    ]
  }
}

待分析文本:${contextInstruction}
\n${text}`;
            } else {
                prompt = targetLang === 'zh-CN'
                    ? `请将以下英文翻译成中文，只返回翻译结果，不要有其他说明${contextInstruction}：\n\n${text}`
                    : `Please translate the following text to ${targetLang}, only return the translation${contextInstruction}:\n\n${text}`;
            }
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
                    format: isSentence ? 'json' : undefined,
                }),
            });

            const data = await response.json();
            let rawResponse = data.response.trim();

            // Handle <think> tags based on settings
            if (!this.thinkEnabled) {
                rawResponse = rawResponse.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
            }

            // Cleanup Markdown code blocks
            const jsonBlock = rawResponse.match(/```json\s*(\{[\s\S]*\})\s*```/i) || rawResponse.match(/```\s*(\{[\s\S]*\})\s*```/i);
            const content = jsonBlock ? jsonBlock[1] : rawResponse;

            if (isSentence) {
                try {
                    const jsonMatch = content.match(/\{[\s\S]*\}/);
                    const jsonToParse = jsonMatch ? jsonMatch[0] : content;
                    const parsed = JSON.parse(jsonToParse);

                    // Normalize field names (support both camelCase and snake_case)
                    const translation = parsed.translation || parsed.chinese_translation || parsed.chineseTranslation || content;
                    const grammarAnalysis = parsed.grammarAnalysis || parsed.grammar_analysis || parsed.analysis;

                    return {
                        text,
                        translation: typeof translation === 'string' ? translation : JSON.stringify(translation),
                        grammarAnalysis: grammarAnalysis,
                        source: 'ollama',
                    };
                } catch (e) {
                    console.warn('[Ollama Provider] JSON parse failed, returning raw response');
                    return {
                        text,
                        translation: content,
                        source: 'ollama',
                    };
                }
            }

            return {
                text,
                translation: content,
                source: 'ollama',
            };
        } catch (error) {
            console.error('Ollama translation error:', error);
            throw error;
        }
    }
}
