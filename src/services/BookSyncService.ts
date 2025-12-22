import { supabase } from '../lib/supabase';
import { LibraryStore, Book } from './LibraryStore';
import { dbOperations, STORE_BOOKS } from './db';

export const BookSyncService = {
    isSyncing: false,

    sync: async (userId: string) => {
        if (BookSyncService.isSyncing) {
            console.log('Book sync already in progress, skipping.');
            return;
        }
        BookSyncService.isSyncing = true;

        try {
            console.log('Starting book sync for user:', userId);

            // 1. Get all local books (INCLUDING DELETED)
            const localBooks = await LibraryStore.getBooks(true);

            // Map by "Title|Author" as unique key
            const getBookKey = (b: { title: string, author?: string }) => `${b.title}|${b.author || 'Unknown'}`;
            const localMap = new Map<string, Book>();
            localBooks.forEach(b => localMap.set(getBookKey(b), b));

            // 2. Get all remote books
            const { data: remoteBooks, error } = await supabase
                .from('user_books')
                .select('*');

            if (error) {
                console.error('Failed to fetch remote books:', error);
                throw error;
            }

            const toUpload: any[] = [];
            const toUpdateLocal: Book[] = [];
            const processedKeys = new Set<string>();

            if (remoteBooks) {
                for (const remote of remoteBooks) {
                    const key = getBookKey({ title: remote.title, author: remote.author });
                    processedKeys.add(key);
                    const local = localMap.get(key);

                    if (local) {
                        // Conflict Resolution: Last Write Wins using explicit timestamps
                        const localTime = local.updatedAt || local.addedAt || 0;
                        const remoteTime = remote.updated_at ? new Date(remote.updated_at).getTime() : 0;

                        if (remoteTime > localTime) {
                            // Remote is newer -> Update Local
                            console.log(`Remote book update wins: ${remote.title} (Remote:${remoteTime} > Local:${localTime})`);
                            toUpdateLocal.push(mapRemoteToLocal(remote, local));
                        } else if (localTime > remoteTime) {
                            // Local is newer -> Update Remote
                            console.log(`Local book update wins: ${local.title} (Local:${localTime} > Remote:${remoteTime})`);
                            toUpload.push(mapLocalToRemote(local, userId));
                        }
                    } else {
                        // Only in Remote
                        if (remote.is_deleted) {
                            // Remote is deleted and we don't have it -> Ignore (or ensure suppressed)
                            continue;
                        }

                        // Ghost Book (Metadata Only)
                        // If we skip it, user complains.
                        // Ideally we should show it. For now, skipping as per "User import themselves".
                        // BUT if we want to fix "Delete sync", we must respect is_deleted.
                        console.log(`Skipping remote book ${key} as it does not exist locally.`);
                    }
                }
            }

            // 3. Process local books (Upload new ones)
            for (const local of localBooks) {
                const key = getBookKey(local);
                if (!processedKeys.has(key)) {
                    // Only in Local
                    // Even if deleted, if we haven't seen it in remote, we might want to push it
                    // so remote knows it's deleted (if remote had it? But remote didn't have it here).
                    // If remote doesn't have it, and logic is isDeleted, no point pushing a "Deleted" record to remote if it never existed there.
                    // But if local is NOT deleted, push it.
                    if (!local.isDeleted) {
                        toUpload.push(mapLocalToRemote(local, userId));
                    }
                }
            }

            // 4. Batch Operations
            if (toUpload.length > 0) {
                console.log('Uploading book metadata:', toUpload.length);
                const { error: uploadError } = await supabase
                    .from('user_books')
                    .upsert(toUpload, { onConflict: 'user_id,title,author' });

                if (uploadError) console.error('Book upload failed:', uploadError);
            }

            if (toUpdateLocal.length > 0) {
                console.log('Updating local books:', toUpdateLocal.length);
                for (const book of toUpdateLocal) {
                    await dbOperations.put(STORE_BOOKS, book);

                    // If book is marked as deleted by remote, ensure file is removed
                    if (book.isDeleted && book.path) {
                        try {
                            await window.electronAPI.deleteBookFile(book.id);
                            console.log(`Deleted local file for ${book.title} due to remote sync.`);
                        } catch (e) {
                            console.warn(`Failed to delete file for ${book.title}`, e);
                        }
                    }
                }
            }

            console.log('Book sync complete.');
        } finally {
            BookSyncService.isSyncing = false;
        }
    },

    /**
     * Push single book progress to remote
     * Used by Reader for real-time sync
     */
    pushBookProgress: async (userId: string, book: Book) => {
        try {
            const payload = mapLocalToRemote(book, userId);
            const { error } = await supabase
                .from('user_books')
                .upsert(payload, { onConflict: 'user_id,title,author' });

            if (error) console.error('Failed to push book progress:', error);
            else console.log(`Pushed progress for ${book.title}: ${book.progress}%`);
        } catch (e) {
            console.error('Push book progress error:', e);
        }
    }
};

function mapLocalToRemote(local: Book, userId: string): any {
    return {
        user_id: userId,
        title: local.title,
        author: local.author || '',
        progress: local.progress,
        last_cfi: local.lastCfi,
        added_at: local.addedAt,
        updated_at: local.updatedAt || Date.now(),
        is_deleted: !!local.isDeleted
    };
}

function mapRemoteToLocal(remote: any, existingLocal: Book): Book {
    return {
        ...existingLocal,
        progress: remote.progress,
        lastCfi: remote.last_cfi,
        updatedAt: remote.updated_at ? new Date(remote.updated_at).getTime() : Date.now(),
        isDeleted: !!remote.is_deleted
    };
}
