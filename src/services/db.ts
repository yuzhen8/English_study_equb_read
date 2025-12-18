export const DB_NAME = 'LingaDB';
export const DB_VERSION = 5; // Version bump for categories
export const STORE_BOOKS = 'books';
export const STORE_BOOK_DATA = 'book_data';
export const STORE_WORDS = 'words';
export const STORE_GROUPS = 'groups';
export const STORE_CATEGORIES = 'categories';


let dbInstance: IDBDatabase | null = null;

export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (dbInstance) {
            resolve(dbInstance);
            return;
        }

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
        };


        request.onsuccess = () => {
            dbInstance = request.result;
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
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
