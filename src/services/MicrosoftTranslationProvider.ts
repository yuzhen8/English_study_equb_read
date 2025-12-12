import { TranslationProvider, TranslationResult } from './TranslationService';

export class MicrosoftTranslationProvider implements TranslationProvider {
    name = 'Microsoft Edge (Free)';

    // Using the public API endpoint used by Microsoft Edge
    // Note: This might change or require an auth token in the future.
    // Ideally we should proxy this through Electron main process as well to avoid CORS
    // but the main process needs to support it. 
    // For now, let's assume we can add a handler in main.ts or implementation similar to Google.

    // However, since we haven't added a 'translate-microsoft' handler in main.ts yet,
    // and we want to keep it simple, we can try to reuse the 'translate-text' if we make it generic,
    // OR just use client-side fetch if CORS allows (it usually doesn't).

    // Given the task is to add it as fallback, let's implement the CLIENT side structure first,
    // and rely on a new main process handler.

    async translate(text: string, targetLang: string = 'zh-CN'): Promise<TranslationResult> {
        // We will need to implement a 'translate-microsoft' in main.ts or make 'translate-text' support a 'service' parameter.
        // For this step, let's assume we update the main process to support it, 
        // or we can use the existing 'translate-text' just for Google and create a new one.

        // Let's rely on a TODO in main.ts or reuse the pattern.
        // Actually, the implementation plan said: "Add translate-microsoft handler".

        if (window.electronAPI && (window.electronAPI as any).translateMicrosoft) {
            const result = await (window.electronAPI as any).translateMicrosoft(text, targetLang);
            if (result.success) {
                return {
                    text,
                    translation: result.translation,
                    source: 'microsoft',
                    definitions: result.definitions
                };
            }
            throw new Error(result.error);
        }

        throw new Error("Microsoft translation not supported in current environment");
    }
}
