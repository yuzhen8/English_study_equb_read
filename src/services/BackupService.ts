
import { dbOperations, STORE_WORDS, STORE_BOOKS, STORE_CATEGORIES, STORE_GROUPS, DB_VERSION } from './db';

export const BackupService = {
    /**
     * Backup all user data (words, book metadata, categories, groups) to a JSON file.
     * Does NOT include EPUB files.
     */
    backupData: async (): Promise<void> => {
        try {
            // Fetch all data in parallel
            const [words, books, categories, groups] = await Promise.all([
                dbOperations.getAll<any>(STORE_WORDS),
                dbOperations.getAll<any>(STORE_BOOKS),
                dbOperations.getAll<any>(STORE_CATEGORIES),
                dbOperations.getAll<any>(STORE_GROUPS)
            ]);

            const exportData = {
                meta: {
                    version: DB_VERSION,
                    timestamp: new Date().toISOString(),
                    appName: 'Linga Reader'
                },
                data: {
                    words,
                    books,
                    categories,
                    groups
                }
            };

            const jsonString = JSON.stringify(exportData, null, 2);
            const result = await window.electronAPI.saveBackupData(jsonString);

            if (!result.success) {
                throw new Error(result.error || 'Unknown error during save.');
            }
        } catch (error) {
            console.error('Backup data failed:', error);
            throw error;
        }
    },

    /**
     * Export all EPUB files to a user-selected directory.
     */
    backupBooks: async (): Promise<void> => {
        try {
            const result = await window.electronAPI.exportBooks();
            if (!result.success) {
                if (result.error === 'User canceled') return; // Ignore cancel
                throw new Error(result.error || 'Unknown error during export.');
            }
            // Optional: return count? The UI handles alert currently.
        } catch (error) {
            console.error('Backup books failed:', error);
            throw error;
        }
    },

    /**
     * Restore data from a JSON backup file.
     * Upserts data into IndexedDB.
     */
    restoreData: async (): Promise<{ words: number, books: number }> => {
        try {
            const result = await window.electronAPI.loadBackupData();
            if (!result.success) {
                if (result.error === 'User canceled') return { words: 0, books: 0 };
                throw new Error(result.error || 'Unknown error during load.');
            }

            if (!result.data) throw new Error('Backup file is empty.');

            const parsed = JSON.parse(result.data);
            if (!parsed.data) throw new Error('Invalid backup file format.');

            const { words = [], books = [], categories = [], groups = [] } = parsed.data;

            // Restore in parallel transactions
            const restorePromises = [];

            if (words.length > 0) {
                for (const w of words) restorePromises.push(dbOperations.put(STORE_WORDS, w));
            }
            if (books.length > 0) {
                for (const b of books) restorePromises.push(dbOperations.put(STORE_BOOKS, b));
            }
            if (categories.length > 0) {
                for (const c of categories) restorePromises.push(dbOperations.put(STORE_CATEGORIES, c));
            }
            if (groups.length > 0) {
                for (const g of groups) restorePromises.push(dbOperations.put(STORE_GROUPS, g));
            }

            await Promise.all(restorePromises);
            return { words: words.length, books: books.length };
        } catch (error) {
            console.error('Restore data failed:', error);
            throw error;
        }
    }
};
