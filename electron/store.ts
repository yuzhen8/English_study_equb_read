import { app } from 'electron';
import path from 'path';
import fs from 'fs';

interface AppConfig {
    translationProvider: 'google' | 'microsoft' | 'deepseek' | 'ollama';
    fastTranslationProvider: 'google' | 'bing' | 'baidu'; // Default 'google'
    proxy: string; // e.g., 'socks5://127.0.0.1:1080'
    apiKeys: {
        google?: string;
        deepseek?: string;
        baiduAppId?: string;
        baiduSecret?: string;
    };
    ollamaUrl?: string; // e.g., 'http://localhost:11434'
    ollamaModel?: string; // e.g., 'llama2'
    ollamaEnabled?: boolean; // Whether to use Ollama
    ollamaContextEnabled?: boolean; // Whether to send context to Ollama
    ollamaThinkEnabled?: boolean; // Whether to show/process <think> tags
    ollamaPrompt?: string; // Custom template
    promptTemplates?: Array<{ id: string; name: string; content: string }>;
    activePromptId?: string;
    activePromptContent?: string;
}

const defaultTemplates = [
    {
        id: 'standard-analysis',
        name: '标准语法分析 (中文)',
        content: `Analyze the following English sentence and provide the analysis in CHINESE (中文):
1. translation: 给出地道的中文翻译。
2. grammarAnalysis: 一个结构化的语法分析对象，包含：
   - sentenceType: 句法类型（如：简单句、并列句、复合句）
   - mainTense: 主要时态（如：一般过去时、现在进行时）
   - structure: 高层结构描述（如：主语 + 谓语 + 宾语）
   - components: 一个包含核心词汇/短语解析的数组，每个元素包含 segment (片段), role (语法角色), explanation (中文详细解释)。

请严格按照以下 JSON 格式返回结果（所有分析描述请使用中文）：
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

待分析文本: {{text}}`
    },
    {
        id: 'minimalist',
        name: '极简翻译',
        content: `Translate the following English text to natural Chinese:
{
  "translation": "中文翻译",
  "grammarAnalysis": "暂无详情"
}
Text: {{text}}`
    }
];

const defaultConfig: AppConfig = {
    translationProvider: 'google',
    fastTranslationProvider: 'google',
    proxy: 'socks5://192.168.50.3:20170',
    apiKeys: {},
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama2',
    ollamaEnabled: false,
    ollamaContextEnabled: true,
    ollamaThinkEnabled: false,
    ollamaPrompt: `You are a helpful English learning assistant.
Analyze the following text (word or phrase) and provide a structured response in JSON format.
DO NOT output any markdown code blocks, just the raw JSON object.
Use "zh-CN" for translations.

JSON Structure:
{
  "word": "original word",
  "phonetic": "IPA phonetic symbol",
  "pos": "part of speech (e.g. n. v. adj.)",
  "translation": "Concise Chinese translation",
  "definition": "English definition",
  "examples": ["Example sentence 1", "Example sentence 2"],
  "roots": "Etymology or root word explanation",
  "frequency": "Frequency tag (e.g. Top 1000, Common, Rare)"
}

Text to analyze: {{text}}
{{context}}`,
    promptTemplates: defaultTemplates,
    activePromptId: 'standard-analysis'
};

export class ConfigManager {
    private configPath: string;
    private config: AppConfig;

    constructor() {
        this.configPath = path.join(app.getPath('userData'), 'config.json');
        this.config = this.load();
    }

    private load(): AppConfig {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf-8');
                return { ...defaultConfig, ...JSON.parse(data) };
            }
        } catch (error) {
            console.error('Failed to load config:', error);
        }
        return defaultConfig;
    }

    public get<K extends keyof AppConfig>(key: K): AppConfig[K] {
        return this.config[key];
    }

    public getAll(): AppConfig {
        return { ...this.config };
    }

    public set(newConfig: Partial<AppConfig>) {
        this.config = { ...this.config, ...newConfig };
        this.save();
    }

    private save() {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
        } catch (error) {
            console.error('Failed to save config:', error);
        }
    }
}
