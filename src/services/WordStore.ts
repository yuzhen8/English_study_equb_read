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

    // SRS Fields
    lastReviewedAt?: number;
    reviewCount?: number; // Times reviewed
    easeFactor?: number; // Default 2.5
    interval?: number; // Days until next review
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
        let dueCount = 0;
        let reviewedToday = 0;

        words.forEach(w => {
            if (statusCounts[w.status] !== undefined) {
                statusCounts[w.status]++;
            }
            if (now - w.addedAt < oneDay) {
                newToday++;
            }
            if (w.nextReviewAt && w.nextReviewAt <= now) {
                dueCount++;
            }
            if (w.lastReviewedAt && (now - w.lastReviewedAt < oneDay)) {
                reviewedToday++;
            }
        });

        const total = words.length;

        // Group by day for chart (Last 7 days)
        const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const chartData = [];

        for (let i = 6; i >= 0; i--) {
            const d = new Date(now - i * oneDay); // approximate days
            const date = new Date(d);
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
            dueCount,
            reviewedToday,
            chartData
        };
    },

    // SRS Methods
    getDueWords: async (): Promise<Word[]> => {
        const words = await WordStore.getWords();
        const now = Date.now();
        return words.filter(w => w.nextReviewAt && w.nextReviewAt <= now);
    },

    submitReview: async (id: string, quality: number) => {
        // Quality: 0 (Again) - 5 (Excellent)
        // 0-2: Fail (Reset interval)
        // 3-5: Pass (Increase interval)

        const words = await WordStore.getWords();
        const word = words.find(w => w.id === id);

        if (!word) return;

        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        // Defaults
        if (!word.easeFactor) word.easeFactor = 2.5;
        if (!word.interval) word.interval = 0;
        if (!word.reviewCount) word.reviewCount = 0;

        // SM-2 Algorithm Simplified
        // New Interval:
        // I(1) = 1
        // I(2) = 6
        // I(n) = I(n-1) * EF

        let nextInterval = 0;

        if (quality < 3) {
            // Failed
            nextInterval = 1;
            word.status = 'learning';
            // Ease Factor unchanged or slightly penalty? Standard SM-2 doesn't penalize EF on fail immediately if not 0?
            // Let's keep EF same but reset interval
        } else {
            // Passed
            if (word.interval === 0) {
                nextInterval = 1;
            } else if (word.interval === 1) {
                nextInterval = 6;
            } else {
                nextInterval = Math.round(word.interval * word.easeFactor);
            }

            // Update Ease Factor
            // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
            word.easeFactor = word.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
            if (word.easeFactor < 1.3) word.easeFactor = 1.3;

            word.status = 'reviewed';
            if (word.interval > 21) word.status = 'mastered'; // Arbitrary threshold for "Mastered"
        }

        word.interval = nextInterval;
        word.nextReviewAt = now + (nextInterval * oneDay);
        word.lastReviewedAt = now;
        word.reviewCount++;

        await dbOperations.put(STORE_WORDS, word);
    }
};
