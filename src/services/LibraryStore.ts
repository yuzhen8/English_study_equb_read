import ePub from 'epubjs';

export interface Book {
    id: string;
    title: string;
    author: string;
    cover?: string; // Base64 or Blob URL (if referencing local file)
    path?: string; // File path for Electron
    addedAt: number;
    progress?: number; // 0-100 or cfi
}

const STORAGE_KEY = 'linga_library_books';

export const LibraryStore = {
    getBooks: (): Book[] => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error("Failed to load books", e);
            return [];
        }
    },

    saveBooks: (books: Book[]) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    },

    addBook: async (file: File): Promise<Book> => {
        const arrayBuffer = await file.arrayBuffer();
        const book = ePub(arrayBuffer);

        // Wait for metadata
        const metadata = await book.loaded.metadata;

        // Get cover
        let coverBase64: string | undefined;
        try {
            const coverUrl = await book.coverUrl();
            if (coverUrl) {
                // Fetch the blob and convert to base64 for persistence
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

        const newBook: Book = {
            id: crypto.randomUUID(),
            title: metadata.title || file.name.replace(/\.epub$/i, ''),
            author: metadata.creator || 'Unknown Author',
            cover: coverBase64,
            path: (file as any).path, // Electron specific
            addedAt: Date.now(),
            progress: 0
        };

        const books = LibraryStore.getBooks();
        // Avoid duplicates by path if available
        if (newBook.path && books.some(b => b.path === newBook.path)) {
            // Update existing? Or throw? Let's just return the existing one.
            const existing = books.find(b => b.path === newBook.path);
            if (existing) return existing;
        }

        books.push(newBook);
        LibraryStore.saveBooks(books);
        return newBook;
    },

    deleteBook: (id: string) => {
        const books = LibraryStore.getBooks().filter(b => b.id !== id);
        LibraryStore.saveBooks(books);
    },

    updateProgress: (id: string, progress: number) => {
        const books = LibraryStore.getBooks();
        const book = books.find(b => b.id === id);
        if (book) {
            book.progress = progress;
            LibraryStore.saveBooks(books);
        }
    }
};
