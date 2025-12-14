import ePub from 'epubjs';
import { dbOperations, STORE_BOOKS, STORE_BOOK_DATA } from './db';

export interface Book {
    id: string;
    title: string;
    author: string;
    cover?: string; // Base64
    path?: string; // File path for Electron
    addedAt: number;
    progress?: number; // 0-100 or cfi
}

export const LibraryStore = {
    getBooks: async (): Promise<Book[]> => {
        try {
            return await dbOperations.getAll<Book>(STORE_BOOKS);
        } catch (e) {
            console.error("Failed to load books", e);
            return [];
        }
    },

    getBookData: async (id: string): Promise<ArrayBuffer | undefined> => {
        try {
            return await dbOperations.get<ArrayBuffer>(STORE_BOOK_DATA, id);
        } catch (e) {
            console.error("Failed to load book data", e);
            return undefined;
        }
    },

    addBook: async (filePath: string, arrayBuffer: ArrayBuffer): Promise<Book> => {
        // @ts-ignore
        const book: any = new ePub(arrayBuffer);

        // Wait for metadata
        await book.ready;
        const metadata = await book.loaded.metadata;

        // Get cover
        let coverBase64: string | undefined;
        try {
            const coverUrl = await book.coverUrl();
            if (coverUrl) {
                const response = await fetch(coverUrl);
                const blob = await response.blob();
                coverBase64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
            }
        } catch (e) {
            console.warn("Failed to extract cover", e);
        }

        const id = crypto.randomUUID();

        const newBook: Book = {
            id,
            title: metadata.title || filePath.split(/[\\/]/).pop()?.replace(/\.epub$/i, '') || 'Unknown',
            author: metadata.creator || 'Unknown Author',
            cover: coverBase64,
            path: filePath,
            addedAt: Date.now(),
            progress: 0
        };

        const currentBooks = await LibraryStore.getBooks();
        // Avoid duplicates by path if available (Optional: maybe allow duplicates if content stored?)
        // For now, if path matches, replace content? Or skip?
        // Let's allow creating new entry if user re-imports, or update if exists.
        // But logic below was: if exists return existing.
        // If we want to support "Update content", we should update.
        // Let's keeping "return existing" logic for metadata, but maybe update data?
        // Simple approach: Always add as new logic or overwrite.
        // Existing logic:
        if (newBook.path) {
            const existing = currentBooks.find(b => b.path === newBook.path);
            if (existing) {
                // Update data just in case
                await dbOperations.put(STORE_BOOK_DATA, arrayBuffer, existing.id);
                return existing;
            }
        }

        await dbOperations.add(STORE_BOOKS, newBook);
        await dbOperations.add(STORE_BOOK_DATA, arrayBuffer, id);

        return newBook;
    },

    deleteBook: async (id: string) => {
        await dbOperations.delete(STORE_BOOKS, id);
        await dbOperations.delete(STORE_BOOK_DATA, id);
    },

    updateProgress: async (id: string, progress: number) => {
        const books = await LibraryStore.getBooks();
        const book = books.find(b => b.id === id);
        if (book) {
            book.progress = progress;
            await dbOperations.put(STORE_BOOKS, book);
        }
    }
};
