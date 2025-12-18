import ePub from 'epubjs';
import { dbOperations, STORE_BOOKS, STORE_BOOK_DATA } from './db';

// 书籍阅读状态
export type BookStatus = 'unread' | 'reading' | 'finished';

export interface Book {
    id: string;
    title: string;
    author: string;
    cover?: string; // Base64
    path?: string; // File path for Electron
    addedAt: number;
    progress?: number; // 0-100 percent
    lastCfi?: string; // ePub CFI for exact position
    totalPages?: number; // 总页数
    currentPage?: number; // 当前页
    categoryId?: string | null; // null = 未分类
    status?: BookStatus; // 阅读状态
    cefrAnalysis?: CefrAnalysisSummary; // CEFR 分析结果缓存
}

// CEFR 分析结果摘要 (存储在 Book 中)
export interface CefrAnalysisSummary {
    primaryLevel: string;  // A1-C2
    difficultyScore: number;  // 1-6
    totalWords: number;
    uniqueWords: number;
    analyzedAt: number;  // 分析时间戳
    distribution: {
        [key: string]: {
            count: number;
            percentage: number;
            uniqueWords: number;
        };
    };
    unknownWordsRatio: number;
    sampleUnknownWords: string[];
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

    updateProgress: async (id: string, progress: number, lastCfi?: string) => {
        try {
            // 直接获取单本书，而不是获取所有书籍
            const book = await dbOperations.get<Book>(STORE_BOOKS, id);
            if (book) {
                book.progress = progress;
                if (lastCfi) book.lastCfi = lastCfi;
                // 同时更新状态为"阅读中"
                if (progress > 0 && progress < 100) {
                    book.status = 'reading';
                } else if (progress >= 100) {
                    book.status = 'finished';
                }
                await dbOperations.put(STORE_BOOKS, book);
                console.log(`[Progress] Saved: ${book.title} - ${progress}% (CFI: ${lastCfi})`);
            } else {
                console.warn(`[Progress] Book not found: ${id}`);
            }
        } catch (e) {
            console.error('[Progress] Failed to save:', e);
        }
    },

    // 保存 CEFR 分析结果
    updateCefrAnalysis: async (id: string, analysis: CefrAnalysisSummary) => {
        const books = await LibraryStore.getBooks();
        const book = books.find(b => b.id === id);
        if (book) {
            book.cefrAnalysis = analysis;
            await dbOperations.put(STORE_BOOKS, book);
            return true;
        }
        return false;
    },

    // 清除 CEFR 分析结果
    clearCefrAnalysis: async (id: string) => {
        const books = await LibraryStore.getBooks();
        const book = books.find(b => b.id === id);
        if (book) {
            delete book.cefrAnalysis;
            await dbOperations.put(STORE_BOOKS, book);
        }
    }
};
