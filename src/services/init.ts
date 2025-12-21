import { translationService } from './TranslationService';
import { GoogleTranslationProvider } from './GoogleTranslationProvider';
import { DeepSeekTranslationProvider } from './DeepSeekTranslationProvider';
import { OllamaTranslationProvider } from './OllamaTranslationProvider';
import { MicrosoftTranslationProvider } from './MicrosoftTranslationProvider';
import { BaiduTranslationProvider } from './BaiduTranslationProvider';

export const initTranslationServices = async () => {
    // Register providers
    const googleProvider = new GoogleTranslationProvider();
    translationService.registerProvider('google', googleProvider);

    const deepSeekProvider = new DeepSeekTranslationProvider();
    translationService.registerProvider('deepseek', deepSeekProvider);

    const ollamaProvider = new OllamaTranslationProvider();
    translationService.registerProvider('ollama', ollamaProvider);

    const microsoftProvider = new MicrosoftTranslationProvider();
    translationService.registerProvider('microsoft', microsoftProvider);
    // User refers to this as Bing
    translationService.registerProvider('bing', microsoftProvider);

    const baiduProvider = new BaiduTranslationProvider();
    translationService.registerProvider('baidu', baiduProvider);

    // Load settings from config
    try {
        // @ts-ignore
        const settings = await window.electronAPI.getSettings();

        if (settings) {
            // Configure API keys
            if (settings.apiKeys?.google) googleProvider.setApiKey(settings.apiKeys.google);
            // Configure DeepSeek
            if (settings.apiKeys?.deepseek) deepSeekProvider.setApiKey(settings.apiKeys.deepseek);
            if (settings.deepseekModel) deepSeekProvider.setModel(settings.deepseekModel);

            // Configure Ollama
            if (settings.ollamaUrl) ollamaProvider.setBaseUrl(settings.ollamaUrl);
            if (settings.ollamaModel) ollamaProvider.setModel(settings.ollamaModel);
            ollamaProvider.setContextEnabled(settings.ollamaContextEnabled ?? true);
            ollamaProvider.setThinkEnabled(settings.ollamaThinkEnabled ?? false);

            // Apply Global Prompt if available
            const globalPrompt = settings.activePromptContent || settings.ollamaPrompt;
            if (globalPrompt) {
                ollamaProvider.setPromptTemplate(globalPrompt);
                deepSeekProvider.setPromptTemplate(globalPrompt);
            }

            // Set active provider
            if (settings.translationProvider) {
                translationService.setActiveProvider(settings.translationProvider);
            }
        }
    } catch (error) {
        console.error('Failed to load settings during initialization', error);
    }

    console.log('Translation services initialized');
};
