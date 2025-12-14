import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HybridDictionaryService } from '../DictionaryService';
import { translationService } from '../TranslationService';

// Mock dependencies
const mockSearchLocal = vi.fn();
const mockGetAudio = vi.fn();

// Mock window.electronAPI
vi.stubGlobal('electronAPI', {
    searchLocal: mockSearchLocal,
    getAudio: mockGetAudio
});

// Mock fetch for Online API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock TranslationService
vi.mock('../TranslationService', () => ({
    translationService: {
        translate: vi.fn(),
    }
}));

describe('HybridDictionaryService', () => {
    let service: HybridDictionaryService;

    beforeEach(() => {
        service = new HybridDictionaryService();
        vi.clearAllMocks();
        mockGetAudio.mockResolvedValue({ success: true, path: '/mock/path.mp3' });
    });

    it('should return online result when local miss and online hit', async () => {
        // Setup Mocks
        mockSearchLocal.mockResolvedValue({ found: false });

        const mockOnlineResponse = [{
            word: 'test',
            phonetics: [{ text: '/test/', audio: 'http://audio.url' }],
            meanings: [{
                partOfSpeech: 'noun',
                definitions: [{ definition: 'A procedure intended to establish the quality.' }]
            }]
        }];

        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => mockOnlineResponse
        });

        // Test
        const result = await service.query('test');

        // Verify
        expect(result.word).toBe('test');
        expect(result.source.online).toBe(true);
        expect(result.source.local).toBe(false);
        expect(result.meanings[0].definitions[0].definition).toContain('A procedure');

        // Verify audio caching triggered
        // Note: cacheAudio is async and might complete after function return if not awaited.
        // In the service code, it's fire-and-forget. We might need wait or mock implementation logic.
        // For now check fetch called.
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('test'));
    });

    it('should fallback to AI if no definitions found', async () => {
        mockSearchLocal.mockResolvedValue({ found: false });
        mockFetch.mockResolvedValue({ ok: false }); // Online fail

        // Mock AI translation
        const aiMock = vi.mocked(translationService.translate);
        aiMock.mockResolvedValue({
            text: 'test',
            translation: '测试',
            source: 'google' // or whatever
        });

        const result = await service.query('test');

        expect(result.source.ai).toBe(true);
        expect(result.translations).toContain('测试');
        expect(aiMock).toHaveBeenCalledWith('test', 'zh-CN', expect.any(String));
    });
});
