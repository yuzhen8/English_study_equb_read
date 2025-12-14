// Translation Service Interface
export interface TranslationResult {
    text: string;
    translation: string;
    pronunciation?: string;
    definitions?: string[];
    examples?: string[];
    source: 'google' | 'deepseek' | 'ollama' | 'microsoft';
}

export interface TranslationProvider {
    name: string;
    translate(text: string, targetLang?: string, context?: string): Promise<TranslationResult>;
}

export class TranslationService {
    private providers: Map<string, TranslationProvider> = new Map();
    private activeProvider: string = 'google';

    registerProvider(name: string, provider: TranslationProvider) {
        this.providers.set(name, provider);
    }

    setActiveProvider(name: string) {
        if (this.providers.has(name)) {
            this.activeProvider = name;
        }
    }

    async translate(text: string, targetLang: string = 'zh-CN', context?: string): Promise<TranslationResult> {
        const provider = this.providers.get(this.activeProvider);
        if (!provider) {
            throw new Error(`Provider ${this.activeProvider} not found`);
        }
        return provider.translate(text, targetLang, context);
    }

    getAvailableProviders(): string[] {
        return Array.from(this.providers.keys());
    }

    getProvider(name: string): TranslationProvider | undefined {
        return this.providers.get(name);
    }
}

// Singleton instance
export const translationService = new TranslationService();
