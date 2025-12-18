import { dbOperations, STORE_CATEGORIES, STORE_BOOKS } from './db';
import { Book } from './LibraryStore';

export interface Category {
    id: string;
    name: string;
    isSystem: boolean; // true = 不可删除/重命名 (如"全部书籍"、"未分类")
    createdAt: number;
    order?: number; // 排序顺序
}

// 系统分类 ID
export const SYSTEM_CATEGORY_ALL = 'all';
export const SYSTEM_CATEGORY_UNCATEGORIZED = 'uncategorized';
export const SYSTEM_CATEGORY_READING = 'reading';

export const CategoryStore = {
    /**
     * 获取所有分类
     */
    getCategories: async (): Promise<Category[]> => {
        try {
            const categories = await dbOperations.getAll<Category>(STORE_CATEGORIES);
            // 按 order 排序，系统分类在前
            return categories.sort((a, b) => {
                if (a.isSystem && !b.isSystem) return -1;
                if (!a.isSystem && b.isSystem) return 1;
                return (a.order || 0) - (b.order || 0);
            });
        } catch (e) {
            console.error("Failed to load categories", e);
            return [];
        }
    },

    /**
     * 获取单个分类
     */
    getCategory: async (id: string): Promise<Category | undefined> => {
        try {
            return await dbOperations.get<Category>(STORE_CATEGORIES, id);
        } catch (e) {
            console.error("Failed to get category", e);
            return undefined;
        }
    },

    /**
     * 创建分类
     */
    createCategory: async (name: string): Promise<Category> => {
        const category: Category = {
            id: crypto.randomUUID(),
            name: name.trim(),
            isSystem: false,
            createdAt: Date.now(),
            order: Date.now() // 使用时间戳作为默认顺序
        };

        await dbOperations.add(STORE_CATEGORIES, category);
        return category;
    },

    /**
     * 重命名分类
     */
    renameCategory: async (id: string, newName: string): Promise<boolean> => {
        try {
            const category = await CategoryStore.getCategory(id);
            if (!category || category.isSystem) {
                return false; // 不能重命名系统分类
            }

            category.name = newName.trim();
            await dbOperations.put(STORE_CATEGORIES, category);
            return true;
        } catch (e) {
            console.error("Failed to rename category", e);
            return false;
        }
    },

    /**
     * 删除分类 (书籍会被移动到未分类)
     */
    deleteCategory: async (id: string): Promise<boolean> => {
        try {
            const category = await CategoryStore.getCategory(id);
            if (!category || category.isSystem) {
                return false; // 不能删除系统分类
            }

            // 将该分类下的所有书籍移动到未分类
            const books = await dbOperations.getAll<Book>(STORE_BOOKS);
            for (const book of books) {
                if (book.categoryId === id) {
                    book.categoryId = null;
                    await dbOperations.put(STORE_BOOKS, book);
                }
            }

            // 删除分类
            await dbOperations.delete(STORE_CATEGORIES, id);
            return true;
        } catch (e) {
            console.error("Failed to delete category", e);
            return false;
        }
    },

    /**
     * 获取分类下的书籍
     */
    getBooksInCategory: async (categoryId: string | null): Promise<Book[]> => {
        try {
            const books = await dbOperations.getAll<Book>(STORE_BOOKS);

            if (categoryId === SYSTEM_CATEGORY_ALL) {
                return books;
            }

            if (categoryId === SYSTEM_CATEGORY_READING) {
                return books.filter(b => b.status === 'reading');
            }

            if (categoryId === SYSTEM_CATEGORY_UNCATEGORIZED || categoryId === null) {
                return books.filter(b => !b.categoryId);
            }

            return books.filter(b => b.categoryId === categoryId);
        } catch (e) {
            console.error("Failed to get books in category", e);
            return [];
        }
    },

    /**
     * 移动书籍到分类
     */
    moveBookToCategory: async (bookId: string, categoryId: string | null): Promise<boolean> => {
        try {
            const book = await dbOperations.get<Book>(STORE_BOOKS, bookId);
            if (!book) return false;

            book.categoryId = categoryId;
            await dbOperations.put(STORE_BOOKS, book);
            return true;
        } catch (e) {
            console.error("Failed to move book to category", e);
            return false;
        }
    },

    /**
     * 批量移动书籍到分类
     */
    moveBooksToCategory: async (bookIds: string[], categoryId: string | null): Promise<boolean> => {
        try {
            for (const bookId of bookIds) {
                await CategoryStore.moveBookToCategory(bookId, categoryId);
            }
            return true;
        } catch (e) {
            console.error("Failed to move books to category", e);
            return false;
        }
    },

    /**
     * 初始化系统分类 (首次运行时调用)
     */
    initSystemCategories: async (): Promise<void> => {
        const categories = await CategoryStore.getCategories();

        // 检查是否已有分类，如果没有则创建系统分类
        if (categories.length === 0) {
            // 系统分类不需要存储，它们是虚拟的
            // 但我们可以在界面上显示它们
            console.log("No categories found, system categories will be shown by default");
        }
    },

    /**
     * 获取分类下的书籍数量
     */
    getBookCountInCategory: async (categoryId: string | null): Promise<number> => {
        const books = await CategoryStore.getBooksInCategory(categoryId);
        return books.length;
    }
};
