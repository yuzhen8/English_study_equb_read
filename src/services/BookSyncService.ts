import { supabase } from '../lib/supabase';
import { LibraryStore, Book } from './LibraryStore';
import { dbOperations, STORE_BOOKS } from './db';

export const BookSyncService = {
    sync: async (userId: string) => {
        console.log('Starting book sync for user:', userId);

        // 1. Get all local books
        const localBooks = await LibraryStore.getBooks();
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
                    // Conflict Resolution: Last Write Wins
                    // Use updated_at timestamp
                    // const localTime = local.addedAt; // LibraryStore doesn't track explicit updated_at for progress well, using addedAt is wrong.
                    // We need to check if we can rely on something else.
                    // Ideally we should add 'updatedAt' to Book interface.
                    // For now, let's assume if remote progress > local progress, we take remote.
                    // Or if remote has newer updated_at than... when?
                    // Let's rely on progress percentage as a heuristic for now if timestamps are missing,
                    // BUT LWW is safer.
                    // Since we don't have local updatedAt, we might always overwrite local if remote exists?
                    // No, that puts offline progress at risk.
                    // Let's add 'updatedAt' to Book interface in LibraryStore first?
                    // Or just use the max progress? Max progress usually makes sense for reading.
                    // Let's use Max Progress strategy for books as it's safer for "reading further".

                    const remoteProgress = remote.progress || 0;
                    const localProgress = local.progress || 0;

                    if (remoteProgress > localProgress) {
                        // Remote is ahead -> Update Local
                        toUpdateLocal.push({
                            ...local,
                            progress: remote.progress,
                            lastCfi: remote.last_cfi,
                            // Don't overwrite local path or ID
                        });
                    } else if (localProgress > remoteProgress) {
                        // Local is ahead -> Update Remote
                        toUpload.push(mapLocalToRemote(local, userId));
                    }
                } else {
                    // Only in Remote -> We can't fully create a book without the file.
                    // We can only create a "Ghost" book or skip it.
                    // User requirement: "Store_BOOK_DATA ... don't sync ... Book files let user import themselves".
                    // So we probably should NOT create local books if the file is missing.
                    // We can skip downloading books that don't exist locally.
                    console.log(`Skipping remote book ${key} as it does not exist locally.`);
                }
            }
        }

        // 3. Process local books (Upload new ones)
        for (const local of localBooks) {
            const key = getBookKey(local);
            if (!processedKeys.has(key)) {
                // Only in Local -> Upload Metadata to Remote
                toUpload.push(mapLocalToRemote(local, userId));
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
            }
        }

        console.log('Book sync complete.');
    }
};

function mapLocalToRemote(local: Book, userId: string): any {
    return {
        user_id: userId,
        title: local.title,
        author: local.author,
        progress: local.progress,
        last_cfi: local.lastCfi,
        added_at: local.addedAt,
        updated_at: Date.now()
    };
}
