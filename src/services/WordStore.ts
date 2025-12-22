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
    lemma?: string; // Base/dictionary form of the word (e.g., "look" for "looking")

    // SRS Fields
    lastReviewedAt?: number;
    reviewCount?: number; // Times reviewed
    easeFactor?: number; // Default 2.5
    interval?: number; // Days until next review

    // Sync Fields
    isDeleted?: boolean;
    updatedAt?: number;
}

export const WordStore = {
    getWords: async (includeDeleted = false): Promise<Word[]> => {
        try {
            const allWords = await dbOperations.getAll<Word>(STORE_WORDS);
            if (includeDeleted) return allWords;
            return allWords.filter(w => !w.isDeleted);
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

    // Subscription for real-time sync
    // source: 'local' (user action) or 'sync' (remote update)
    _listeners: [] as ((word: Word, source: 'local' | 'sync') => void)[],

    subscribe: (callback: (word: Word, source: 'local' | 'sync') => void) => {
        WordStore._listeners.push(callback);
        return () => {
            WordStore._listeners = WordStore._listeners.filter(cb => cb !== callback);
        };
    },

    notifyListeners: (word: Word, source: 'local' | 'sync' = 'local') => {
        WordStore._listeners.forEach(cb => cb(word, source));
    },

    addWord: async (text: string, translation: string, context?: string, sourceBookId?: string, lemma?: string): Promise<Word> => {
        // Fetch ALL words to check for deleted ones too (Resurrection)
        const words = await WordStore.getWords(true);

        // Check for existing (case-insensitive)
        const existing = words.find(w => w.text.toLowerCase() === text.toLowerCase());

        if (existing) {
            if (existing.isDeleted) {
                // RESURRECTION LOGIC
                console.log(`Resurrecting word: ${text}`);
                existing.isDeleted = false;
                existing.updatedAt = Date.now();
                existing.translation = translation; // Update with new info
                if (context) existing.context = context;
                if (sourceBookId) existing.sourceBookId = sourceBookId;
                if (lemma) existing.lemma = lemma;

                await dbOperations.put(STORE_WORDS, existing);
                WordStore.notifyListeners(existing);
                return existing;
            }

            // If exists and not deleted, just return it (maybe update context?)
            return existing;
        }

        const newWord: Word = {
            id: crypto.randomUUID(),
            text,
            translation,
            context,
            sourceBookId,
            lemma, // Base form of the word
            status: 'new',
            addedAt: Date.now(),
            updatedAt: Date.now(),
            isDeleted: false
        };

        await dbOperations.add(STORE_WORDS, newWord);
        WordStore.notifyListeners(newWord);
        return newWord;
    },

    deleteWord: async (id: string) => {
        const word = await WordStore.getWord(id);
        if (word) {
            // Soft Delete
            word.isDeleted = true;
            word.updatedAt = Date.now();
            await dbOperations.put(STORE_WORDS, word);
            WordStore.notifyListeners(word);
        }
        // await dbOperations.delete(STORE_WORDS, id); // OLD HARD DELETE
    },

    /**
     * 批量删除单词
     */
    deleteWords: async (ids: string[]) => {
        for (const id of ids) {
            await WordStore.deleteWord(id);
        }
    },

    /**
     * Clean up duplicate words (Fix for previous sync bug)
     */
    cleanupDuplicates: async () => {
        const words = await WordStore.getWords(true); // Check all including deleted
        const map = new Map<string, Word[]>();

        words.forEach(w => {
            const key = w.text.toLowerCase().trim();
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(w);
        });

        const toDelete: string[] = [];

        map.forEach((duplicates) => {
            if (duplicates.length > 1) {
                // Keep the one with most info or most recent
                // Sort by: has translation > has context > most recent addedAt
                duplicates.sort((a, b) => {
                    const hasTransA = !!a.translation;
                    const hasTransB = !!b.translation;
                    if (hasTransA !== hasTransB) return hasTransA ? -1 : 1;

                    const hasContextA = !!a.context;
                    const hasContextB = !!b.context;
                    if (hasContextA !== hasContextB) return hasContextA ? -1 : 1;

                    return b.addedAt - a.addedAt;
                });

                // Keep index 0, delete others (Hard delete duplicates to clean up DB, or soft delete?)
                // If we hard delete duplicates, we might lose sync history for them but it's okay for cleanup.
                // Let's use deleteWord (Soft Delete) to be safe with sync.
                for (let i = 1; i < duplicates.length; i++) {
                    toDelete.push(duplicates[i].id);
                }
            }
        });

        if (toDelete.length > 0) {
            console.log(`Cleaning up ${toDelete.length} duplicate words.`);
            // Actually for duplicates, we probably want to HARD delete the extras 
            // otherwise they will just sync back as "deleted" items and clutter.
            // But since we transitioned to Soft Delete, using deleteWord is safer for consistency.
            await WordStore.deleteWords(toDelete);
        }
    },

    /**
     * 导出单词数据
     */
    exportWords: async (ids: string[]): Promise<Word[]> => {
        const words = await WordStore.getWords();
        return words.filter(w => ids.includes(w.id));
    },

    /**
     * 导出为 CSV 格式
     */
    exportWordsAsCSV: (words: Word[]): string => {
        const headers = ['单词', '翻译', '状态', '添加时间', '上下文'];
        const rows = words.map(w => [
            w.text,
            w.translation,
            w.status,
            new Date(w.addedAt).toLocaleDateString(),
            w.context || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        return csvContent;
    },


    updateStatus: async (id: string, status: Word['status']) => {
        const words = await WordStore.getWords(true);
        const word = words.find(w => w.id === id);
        if (word) {
            word.status = status;
            word.updatedAt = Date.now(); // Explicit update time
            // If user updates status of a deleted word (unlikely), should we resurrect?
            // Usually UI won't show deleted words.
            if (word.isDeleted) word.isDeleted = false; // Just in case

            await dbOperations.put(STORE_WORDS, word);
            WordStore.notifyListeners(word);
        }
    },

    getStats: async (timeFilter: 'week' | 'month' | 'year' = 'week') => {
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

        // Group by day for chart (Based on timeFilter)
        const chartData = [];
        const weeklyData = []; // Specific for Exercise daily stats (Learned vs Reviewed)

        if (timeFilter === 'week' || timeFilter === 'month') {
            const daysToFetch = timeFilter === 'week' ? 7 : 30;
            const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

            for (let i = daysToFetch - 1; i >= 0; i--) {
                const date = new Date(now - i * oneDay);
                const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
                const endOfDay = startOfDay + oneDay;

                const count = words.filter(w => w.addedAt >= startOfDay && w.addedAt < endOfDay).length;

                let label = '';
                if (timeFilter === 'week') {
                    label = dayLabels[date.getDay()];

                    // Also gather Exercise specific data for the last 7 days
                    const learnedCount = words.filter(w => w.addedAt >= startOfDay && w.addedAt < endOfDay).length;
                    const reviewedCount = words.filter(w => w.lastReviewedAt && w.lastReviewedAt >= startOfDay && w.lastReviewedAt < endOfDay).length;
                    weeklyData.push({
                        name: label,
                        learned: learnedCount,
                        reviewed: reviewedCount
                    });
                } else {
                    // Month view: show "MM-DD"
                    label = `${date.getMonth() + 1}-${date.getDate()}`;
                }

                chartData.push({ name: label, words: count });
            }
        } else if (timeFilter === 'year') {
            // Year view: group by month (last 12 months)
            for (let i = 11; i >= 0; i--) {
                const date = new Date(now);
                date.setMonth(date.getMonth() - i);
                const year = date.getFullYear();
                const month = date.getMonth();

                const startOfMonth = new Date(year, month, 1).getTime();
                const endOfMonth = new Date(year, month + 1, 1).getTime();

                const count = words.filter(w => w.addedAt >= startOfMonth && w.addedAt < endOfMonth).length;
                const label = `${month + 1}月`;

                chartData.push({ name: label, words: count });
            }
        }

        // Forecast (Next 7 days - Due Words)
        const dayLabelsFull = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const futureReviews = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(now + i * oneDay);
            const date = new Date(d);
            const dayStr = dayLabelsFull[date.getDay()];
            const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
            const endOfDay = startOfDay + oneDay;

            const count = words.filter(w => w.nextReviewAt && w.nextReviewAt >= startOfDay && w.nextReviewAt < endOfDay).length;
            futureReviews.push({ name: dayStr, count });
        }

        return {
            total,
            statusCounts,
            newToday,
            dueCount,
            reviewedToday,
            chartData,
            weeklyData,
            futureReviews
        };
    },

    // SRS Methods
    getDueWords: async (): Promise<Word[]> => {
        const words = await WordStore.getWords();
        const now = Date.now();
        return words.filter(w => w.nextReviewAt && w.nextReviewAt <= now);
    },

    getDistractors: async (correctId: string, count: number): Promise<Word[]> => {
        const words = await WordStore.getWords();
        const otherWords = words.filter(w => w.id !== correctId && w.translation);

        // Shuffle and take first n
        const shuffled = otherWords.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    },

    submitReview: async (id: string, quality: number) => {
        // Quality: 0 (Again) - 5 (Excellent)
        // 0-2: Fail (Reset interval)
        // 3-5: Pass (Increase interval)

        const words = await WordStore.getWords();
        const word = words.find(w => w.id === id);

        if (!word) return;

        const now = Date.now();

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

        // 优化：采用自然日结算机制
        // 将 nextReviewAt 标准化为目标日期的凌晨 04:00
        // 这样只要跨过凌晨4点，所有当天的复习任务都会激活
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + nextInterval);
        targetDate.setHours(4, 0, 0, 0); // 设置为凌晨 04:00
        word.nextReviewAt = targetDate.getTime();

        word.lastReviewedAt = now;
        word.reviewCount++;
        word.updatedAt = now; // Explicit update time

        await dbOperations.put(STORE_WORDS, word);
        WordStore.notifyListeners(word);
    }
};
