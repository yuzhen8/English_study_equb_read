import { translationService } from './TranslationService';
import { GoogleTranslationProvider } from './GoogleTranslationProvider';
import { DeepSeekTranslationProvider } from './DeepSeekTranslationProvider';
import { OllamaTranslationProvider } from './OllamaTranslationProvider';
import { MicrosoftTranslationProvider } from './MicrosoftTranslationProvider';

export const initTranslationServices = () => {
    // Register providers
    const googleProvider = new GoogleTranslationProvider();
    // TODO: Load API keys from settings
    // googleProvider.setApiKey('YOUR_KEY');
    translationService.registerProvider('google', googleProvider);

    const deepSeekProvider = new DeepSeekTranslationProvider();
    // deepSeekProvider.setApiKey('YOUR_KEY');
    translationService.registerProvider('deepseek', deepSeekProvider);

    const ollamaProvider = new OllamaTranslationProvider();
    translationService.registerProvider('ollama', ollamaProvider);

    const microsoftProvider = new MicrosoftTranslationProvider();
    translationService.registerProvider('microsoft', microsoftProvider);

    // Set default provider (can be changed via settings later)
    translationService.setActiveProvider('google');

    console.log('Translation services initialized');
};
