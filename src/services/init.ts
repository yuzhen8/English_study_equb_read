import { translationService } from './TranslationService';
import { GoogleTranslationProvider } from './GoogleTranslationProvider';
import { DeepSeekTranslationProvider } from './DeepSeekTranslationProvider';
import { OllamaTranslationProvider } from './OllamaTranslationProvider';
import { MicrosoftTranslationProvider } from './MicrosoftTranslationProvider';

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

    // Load settings from config
    try {
        // @ts-ignore
        const settings = await window.electronAPI.getSettings();

        if (settings) {
            // Configure API keys
            if (settings.apiKeys?.google) googleProvider.setApiKey(settings.apiKeys.google);
            if (settings.apiKeys?.deepseek) deepSeekProvider.setApiKey(settings.apiKeys.deepseek);

            // Configure Ollama - only if enabled
            if (settings.ollamaEnabled) {
                if (settings.ollamaUrl) ollamaProvider.setBaseUrl(settings.ollamaUrl);
                if (settings.ollamaModel) ollamaProvider.setModel(settings.ollamaModel);
                if (settings.ollamaPrompt) ollamaProvider.setPromptTemplate(settings.ollamaPrompt);

                // New settings
                ollamaProvider.setContextEnabled(settings.ollamaContextEnabled ?? true);
                ollamaProvider.setThinkEnabled(settings.ollamaThinkEnabled ?? false);

                // If it was the saved provider, set it active
                if (settings.translationProvider === 'ollama') {
                    translationService.setActiveProvider('ollama');
                }
            } else {
                // If disabled but was selected, fallback to google
                if (settings.translationProvider === 'ollama') {
                    translationService.setActiveProvider('google');
                }
            }

            // Set active provider (for others)
            if (settings.translationProvider && settings.translationProvider !== 'ollama') {
                translationService.setActiveProvider(settings.translationProvider);
            }
        }
    } catch (error) {
        console.error('Failed to load settings during initialization', error);
    }

    console.log('Translation services initialized');
};
