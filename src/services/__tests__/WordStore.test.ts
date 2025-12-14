import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WordStore, Word } from '../WordStore';
import { dbOperations, STORE_WORDS } from '../db';

// Mock dbOperations
vi.mock('../db', () => ({
    STORE_WORDS: 'words',
    dbOperations: {
        getAll: vi.fn(),
        add: vi.fn(),
        delete: vi.fn(),
        put: vi.fn(),
        get: vi.fn(),
    },
}));

describe('WordStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should add a new word', async () => {
        // Mock getWords to return empty
        vi.mocked(dbOperations.getAll).mockResolvedValueOnce([]);

        const newWord = await WordStore.addWord('test', '测试');

        expect(newWord).toBeDefined();
        expect(newWord.text).toBe('test');
        expect(newWord.translation).toBe('测试');
        expect(dbOperations.add).toHaveBeenCalledWith(STORE_WORDS, newWord);
    });

    it('should not add duplicate word but return existing one', async () => {
        const existingWord: Word = {
            id: '123',
            text: 'test',
            translation: '旧测试',
            status: 'new',
            addedAt: Date.now()
        };

        // Return existing word
        vi.mocked(dbOperations.getAll).mockResolvedValueOnce([existingWord]);

        const result = await WordStore.addWord('test', '新测试');

        expect(result.id).toBe(existingWord.id);
        expect(result.translation).toBe('旧测试'); // Should return existing
        expect(dbOperations.add).not.toHaveBeenCalled();
    });

    it('should calculate stats correctly', async () => {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        const words: Word[] = [
            { id: '1', text: 'a', translation: 'a', status: 'new', addedAt: now }, // Today
            { id: '2', text: 'b', translation: 'b', status: 'learning', addedAt: now - oneDay * 2 }, // 2 days ago
            { id: '3', text: 'c', translation: 'c', status: 'mastered', addedAt: now - oneDay * 0.5 } // Today
        ];

        vi.mocked(dbOperations.getAll).mockResolvedValue(words);

        const stats = await WordStore.getStats();

        expect(stats.total).toBe(3);
        expect(stats.statusCounts.new).toBe(1);
        expect(stats.statusCounts.learning).toBe(1);
        expect(stats.statusCounts.mastered).toBe(1);
        expect(stats.newToday).toBe(2); // word 1 and 3 are within 24h
    });
});
