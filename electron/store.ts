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
    ollamaUrl?: string;
}

const defaultConfig: AppConfig = {
    translationProvider: 'google',
    proxy: 'socks5://192.168.50.3:20170', // Default from user requirement
    apiKeys: {},
    ollamaUrl: 'http://localhost:11434'
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
