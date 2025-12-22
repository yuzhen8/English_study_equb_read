export const DB_NAME = 'ESReaderDB';
export const DB_VERSION = 6; // Version bump for reading stats
export const STORE_BOOKS = 'books';
export const STORE_BOOK_DATA = 'book_data';
export const STORE_WORDS = 'words';
export const STORE_GROUPS = 'groups';
export const STORE_CATEGORIES = 'categories';
export const STORE_READING_SESSIONS = 'reading_sessions';


let dbInstance: IDBDatabase | null = null;
let initPromise: Promise<IDBDatabase> | null = null;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const initDB = (retries = 3, delay = 100): Promise<IDBDatabase> => {
    if (dbInstance) return Promise.resolve(dbInstance);

    if (initPromise) return initPromise;

    initPromise = new Promise((resolve, reject) => {
        const attemptOpen = (remainingRetries: number) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_BOOKS)) {
                    db.createObjectStore(STORE_BOOKS, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORE_BOOK_DATA)) {
                    db.createObjectStore(STORE_BOOK_DATA); // Key will be bookId, value is ArrayBuffer
                }
                if (!db.objectStoreNames.contains(STORE_WORDS)) {
                    const wordStore = db.createObjectStore(STORE_WORDS, { keyPath: 'id' });
                    wordStore.createIndex('text', 'text', { unique: false });
                    wordStore.createIndex('addedAt', 'addedAt', { unique: false });
                }
                if (!db.objectStoreNames.contains(STORE_GROUPS)) {
                    const groupStore = db.createObjectStore(STORE_GROUPS, { keyPath: 'id' });
                    groupStore.createIndex('name', 'name', { unique: false });
                    groupStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
                if (!db.objectStoreNames.contains(STORE_CATEGORIES)) {
                    const categoryStore = db.createObjectStore(STORE_CATEGORIES, { keyPath: 'id' });
                    categoryStore.createIndex('name', 'name', { unique: false });
                    categoryStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
                if (db.objectStoreNames.contains('reading_sessions') === false) {
                    const sessionStore = db.createObjectStore('reading_sessions', { keyPath: 'id' });
                    sessionStore.createIndex('bookId', 'bookId', { unique: false });
                    sessionStore.createIndex('date', 'date', { unique: false });
                    sessionStore.createIndex('userId', 'userId', { unique: false });
                }
            };

            request.onsuccess = () => {
                dbInstance = request.result;
                initPromise = null; // Clear promise so we don't hold it forever, but dbInstance is set.

                // Handle connection closing
                dbInstance.onversionchange = () => {
                    dbInstance?.close();
                    dbInstance = null;
                    console.log('Database connection closed due to version change.');
                };

                dbInstance.onclose = () => {
                    dbInstance = null;
                };

                resolve(dbInstance);
            };

            request.onerror = () => {
                console.error("IndexedDB Open Error:", request.error);
                if (remainingRetries > 0) {
                    console.warn(`Retrying DB open in ${delay}ms... (${remainingRetries} attempts left)`);
                    wait(delay).then(() => attemptOpen(remainingRetries - 1));
                } else {
                    initPromise = null;
                    reject(request.error || new Error('Unknown IndexedDB Error'));
                }
            };
        };

        attemptOpen(retries);
    });

    return initPromise;
};

export const dbOperations = {
    getAll: async <T>(storeName: string): Promise<T[]> => {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    get: async <T>(storeName: string, key: string): Promise<T | undefined> => {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    add: async <T>(storeName: string, item: T, key?: string): Promise<void> => {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            // Check if transaction modes need valid string literal
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = key ? store.add(item, key) : store.add(item);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    put: async <T>(storeName: string, item: T, key?: string): Promise<void> => {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = key ? store.put(item, key) : store.put(item);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    delete: async (storeName: string, id: string): Promise<void> => {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};

/**
 * 紧急重置数据库
 * 用途：当发生 Internal Error 且无法自行恢复时，强制删除数据库
 */
export const resetDatabase = async (): Promise<void> => {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }
    initPromise = null;

    return new Promise((resolve, reject) => {
        console.warn('Attempting to delete database:', DB_NAME);
        const request = indexedDB.deleteDatabase(DB_NAME);

        request.onsuccess = () => {
            console.log('Database deleted successfully');
            resolve();
        };

        request.onerror = () => {
            console.error('Failed to delete database:', request.error);
            reject(request.error);
        };

        request.onblocked = () => {
            console.warn('Database delete blocked. Please close other tabs/windows.');
        };
    });
};

// Expose to window for debugging
if (typeof window !== 'undefined') {
    (window as any).resetAppDB = resetDatabase;
}
