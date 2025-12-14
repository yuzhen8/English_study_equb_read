import { app } from 'electron';
import path from 'path';
import fs from 'fs';

interface AppConfig {
    translationProvider: 'google' | 'microsoft' | 'deepseek' | 'ollama';
    proxy: string; // e.g., 'socks5://127.0.0.1:1080'
    apiKeys: {
        google?: string;
        deepseek?: string;
    };
    ollamaUrl?: string; // e.g., 'http://localhost:11434'
    ollamaModel?: string; // e.g., 'llama2'
    ollamaEnabled?: boolean; // Whether to use Ollama
    ollamaContextEnabled?: boolean; // Whether to send context to Ollama
    ollamaThinkEnabled?: boolean; // Whether to show/process <think> tags
    ollamaPrompt?: string; // Custom template
}

const defaultConfig: AppConfig = {
    translationProvider: 'google',
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
{{context}}`
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
