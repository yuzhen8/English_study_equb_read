import { dbOperations, STORE_WORDS } from './db';

export interface Word {
    id: string;
    text: string;
    translation: string;
    context?: string; // Example sentence or source context
    sourceBookId?: string; // ID of the book where it was added
    status: 'new' | 'learning' | 'reviewed' | 'mastered';
    addedAt: number;
    nextReviewAt?: number;
}

export const WordStore = {
    getWords: async (): Promise<Word[]> => {
        try {
            return await dbOperations.getAll<Word>(STORE_WORDS);
        } catch (e) {
            console.error("Failed to load words", e);
            return [];
        }
    },

    // Existing methods ...
    // Add a method to get a single word by id
    getWord: async (id: string): Promise<Word | undefined> => {
        try {
            const words = await dbOperations.getAll<Word>(STORE_WORDS);
            return words.find(w => w.id === id);
        } catch (e) {
            console.error('Failed to get word', e);
            return undefined;
        }
    },

    addWord: async (text: string, translation: string, context?: string, sourceBookId?: string): Promise<Word> => {
        const words = await WordStore.getWords();
        // Simple duplicate check (case-insensitive)
        const existing = words.find(w => w.text.toLowerCase() === text.toLowerCase());
        if (existing) {
            // Update context if new one provided? Or just return existing.
            // Let's just return existing for now to avoid overwriting progress
            return existing;
        }

        const newWord: Word = {
            id: crypto.randomUUID(),
            text,
            translation,
            context,
            sourceBookId,
            status: 'new',
            addedAt: Date.now()
        };

        await dbOperations.add(STORE_WORDS, newWord);
        return newWord;
    },

    deleteWord: async (id: string) => {
        await dbOperations.delete(STORE_WORDS, id);
    },

    updateStatus: async (id: string, status: Word['status']) => {
        const words = await WordStore.getWords();
        const word = words.find(w => w.id === id);
        if (word) {
            word.status = status;
            await dbOperations.put(STORE_WORDS, word);
        }
    },

    getStats: async () => {
        const words = await WordStore.getWords();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        // Count statuses
        const statusCounts = {
            new: 0,
            learning: 0,
            reviewed: 0,
            mastered: 0
        };

        // New words today (approx)
        let newToday = 0;

        words.forEach(w => {
            if (statusCounts[w.status] !== undefined) {
                statusCounts[w.status]++;
            }
            if (now - w.addedAt < oneDay) {
                newToday++;
            }
        });

        const total = words.length;

        // Group by day for chart (Last 7 days)
        const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const chartData = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date(now - i * oneDay);
            const dayStr = dayLabels[date.getDay()];

            // Count words added on this day (simple approximation by checking 24h chunks backwards)
            // Ideally we check calendar day
            const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
            const endOfDay = startOfDay + oneDay;

            const count = words.filter(w => w.addedAt >= startOfDay && w.addedAt < endOfDay).length;

            chartData.push({ name: dayStr, words: count });
        }

        return {
            total,
            statusCounts,
            newToday,
            chartData
        };
    }
};
