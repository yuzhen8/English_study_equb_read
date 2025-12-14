import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TranslationService, TranslationProvider } from '../TranslationService';

describe('TranslationService', () => {
    let service: TranslationService;

    // Mock Providers
    const mockGoogleProvider: TranslationProvider = {
        name: 'google',
        translate: vi.fn(),
    };

    const mockDeepSeekProvider: TranslationProvider = {
        name: 'deepseek',
        translate: vi.fn(),
    };

    beforeEach(() => {
        service = new TranslationService();
        vi.clearAllMocks();
    });

    it('should register and switch providers', () => {
        service.registerProvider('google', mockGoogleProvider);
        service.registerProvider('deepseek', mockDeepSeekProvider);

        expect(service.getAvailableProviders()).toEqual(['google', 'deepseek']);

        service.setActiveProvider('deepseek');
        // No direct public getter for activeProvider, verify via behavior
    });

    it('should use the active provider for translation', async () => {
        service.registerProvider('google', mockGoogleProvider);
        service.registerProvider('deepseek', mockDeepSeekProvider);

        // Default is google (defined in class field)
        // But we re-instantiated, so let's set explicitly or rely on implementation
        // Implementation: private activeProvider: string = 'google';
        // We need to ensure 'google' is registered for default to work, 
        // OR we set active provider to one we registered.

        service.setActiveProvider('deepseek');

        const mockResult = {
            text: 'test',
            translation: '测试',
            source: 'deepseek' as const
        };
        vi.mocked(mockDeepSeekProvider.translate).mockResolvedValue(mockResult);

        const result = await service.translate('test');

        expect(mockDeepSeekProvider.translate).toHaveBeenCalledWith('test', 'zh-CN', undefined);
        expect(mockGoogleProvider.translate).not.toHaveBeenCalled();
        expect(result).toEqual(mockResult);
    });

    it('should throw error if provider not found', async () => {
        // activeProvider defaults to 'google', and we haven't registered it.
        // setActiveProvider('non-existent') is ignored because check fails.
        service.setActiveProvider('non-existent');
        await expect(service.translate('test')).rejects.toThrow('Provider google not found');
    });
});
