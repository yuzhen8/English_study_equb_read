import { TranslationProvider, TranslationResult } from './TranslationService';

export class DeepSeekTranslationProvider implements TranslationProvider {
    name = 'DeepSeek AI';
    private apiKey: string = '';
    private model: string = 'deepseek-chat';
    private apiUrl: string = 'https://api.deepseek.com/v1/chat/completions';
    private promptTemplate: string = '';

    setApiKey(key: string) {
        this.apiKey = key;
    }

    setModel(model: string) {
        this.model = model;
    }

    setPromptTemplate(template: string) {
        this.promptTemplate = template;
    }

    setApiUrl(url: string) {
        this.apiUrl = url;
    }

    async translate(text: string, targetLang: string = 'zh-CN', context?: string): Promise<TranslationResult> {
        if (!this.apiKey) {
            throw new Error('DeepSeek API key not configured');
        }

        const isSentence = text.trim().split(/\s+/).length > 2;
        const contextInstruction = (context) ? `\nContext: ${context}` : '';

        let prompt = '';
        if (this.promptTemplate) {
            prompt = this.promptTemplate.replace(/\{\{text\}\}/g, text);
            if (prompt.includes('{{context}}')) {
                prompt = prompt.replace(/\{\{context\}\}/g, context || '');
            }
        } else if (isSentence && targetLang === 'zh-CN') {
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

        try {
            const isReasoner = this.model.includes('reasoner');
            // @ts-ignore
            const response = await window.electronAPI.aiFetch({
                url: this.apiUrl,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: 'user',
                            content: prompt,
                        },
                    ],
                    // Reasoner model does not support response_format: json_object
                    response_format: (isSentence && !isReasoner) ? { type: 'json_object' } : undefined,
                    temperature: isReasoner ? 1.0 : 0.3, // Reasoner recommends higher temperature
                }),
            });

            if (!response.ok) {
                let errorData = {};
                try {
                    errorData = JSON.parse(response.data);
                } catch (e) { }
                console.error('DeepSeek API Error Details:', errorData);
                // @ts-ignore
                throw new Error(errorData.error?.message || `API Request failed with status ${response.status}`);
            }

            const rawResponseData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
            const rawResponse = rawResponseData.choices[0].message.content.trim();

            if (isSentence) {
                try {
                    // Try to find JSON block if it's not a direct JSON response
                    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
                    const jsonToParse = jsonMatch ? jsonMatch[0] : rawResponse;
                    const parsed = JSON.parse(jsonToParse);

                    // Normalize field names
                    const translation = parsed.translation || parsed.chinese_translation || parsed.chineseTranslation || rawResponse;
                    const grammarAnalysis = parsed.grammarAnalysis || parsed.grammar_analysis || parsed.analysis;

                    return {
                        text,
                        translation: typeof translation === 'string' ? translation : JSON.stringify(translation),
                        grammarAnalysis: grammarAnalysis,
                        source: 'deepseek',
                    };
                } catch (e) {
                    console.warn('Failed to parse DeepSeek JSON response, falling back to raw text', e);
                    return {
                        text,
                        translation: rawResponse,
                        source: 'deepseek',
                    };
                }
            }

            return {
                text,
                translation: rawResponse,
                source: 'deepseek',
            };
        } catch (error) {
            console.error('DeepSeek translation error:', error);
            throw error;
        }
    }
}
