import { dbOperations, STORE_READING_SESSIONS } from './db';

export interface ReadingSession {
    id: string;
    userId: string;
    bookId: string;
    startTime: number;
    endTime: number;
    duration: number; // in seconds
    date: string; // YYYY-MM-DD
}

export const ReadingTimeStore = {
    addSession: async (session: ReadingSession) => {
        await dbOperations.add(STORE_READING_SESSIONS, session);
    },

    getSessionsByBook: async (bookId: string): Promise<ReadingSession[]> => {
        const db = await import('./db').then(m => m.initDB());
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_READING_SESSIONS, 'readonly');
            const store = transaction.objectStore(STORE_READING_SESSIONS);
            const index = store.index('bookId');
            const request = index.getAll(IDBKeyRange.only(bookId));

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    getDailyStats: async (userId: string): Promise<Record<string, number>> => {
        // Returns { "2023-10-27": 3600, ... } (seconds per day)
        // Since IDB doesn't support complex aggregation easily, we fetch user sessions and aggregate in memory.
        // Optimization: In a real app we might want to range query by date, but for now filtering all sessions for user is acceptable 
        // if dataset isn't huge.
        const db = await import('./db').then(m => m.initDB());
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_READING_SESSIONS, 'readonly');
            const store = transaction.objectStore(STORE_READING_SESSIONS);
            const index = store.index('userId');
            const request = index.getAll(IDBKeyRange.only(userId));

            request.onsuccess = () => {
                const sessions = request.result as ReadingSession[];
                const stats: Record<string, number> = {};
                sessions.forEach(s => {
                    const day = s.date;
                    stats[day] = (stats[day] || 0) + s.duration;
                });
                resolve(stats);
            };
            request.onerror = () => reject(request.error);
        });
    },

    getBookTotalDuration: async (bookId: string): Promise<number> => {
        const sessions = await ReadingTimeStore.getSessionsByBook(bookId);
        return sessions.reduce((acc, s) => acc + s.duration, 0);
    }
};
