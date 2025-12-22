import { supabase } from '../lib/supabase';
import { WordStore, Word } from './WordStore';

export const WordSyncService = {
    isSyncing: false,

    sync: async (userId: string) => {
        if (WordSyncService.isSyncing) {
            console.log('Word sync already in progress, skipping.');
            return;
        }
        WordSyncService.isSyncing = true;

        try {
            console.log('Starting sync for user:', userId);

            // 1. Get all local words (INCLUDING DELETED)
            const localWords = await WordStore.getWords(true);
            const localMap = new Map<string, Word>();
            localWords.forEach(w => localMap.set(w.text.toLowerCase(), w));

            // 2. Get all remote words (INCLUDING DELETED)
            const { data: remoteWords, error } = await supabase
                .from('user_words')
                .select('*');

            if (error) {
                console.error('Failed to fetch remote words:', error);
                throw error;
            }

            const toUpload: any[] = [];
            const toUpdateLocal: Word[] = [];
            const processedTexts = new Set<string>();

            // 3. Process remote words (Download or Conflict)
            if (remoteWords) {
                for (const remote of remoteWords) {
                    const text = remote.text.toLowerCase().trim();
                    if (!text) continue;

                    processedTexts.add(text);
                    const local = localMap.get(text);

                    // Conflict resolution: Last Write Wins based on explicit updatedAt
                    if (local) {
                        // Use explicit updatedAt if available, else fallback to old logic
                        const localTime = local.updatedAt || Math.max(local.addedAt, local.lastReviewedAt || 0);
                        const remoteTime = remote.updated_at ? new Date(remote.updated_at).getTime() : 0;

                        if (remoteTime > localTime) {
                            // Remote is newer -> Update Local
                            // This handles "Remote Delete" (if remote.is_deleted is true)
                            // AND "Remote Resurrection" (if remote.is_deleted is false)
                            console.log(`Remote update wins for ${text}: Remote(${remoteTime}) > Local(${localTime})`);
                            toUpdateLocal.push(mapRemoteToLocal(remote, local.id));
                        } else if (localTime > remoteTime) {
                            // Local is newer -> Update Remote
                            // This handles "Local Delete" (if local.isDeleted is true)
                            // AND "Local Resurrection" (if local.isDeleted is false)
                            console.log(`Local update wins for ${text}: Local(${localTime}) > Remote(${remoteTime})`);
                            toUpload.push(mapLocalToRemote(local, userId));
                        }
                        // If equal, do nothing
                    } else {
                        // Only in Remote -> Add to Local
                        // Even if it is deleted in remote, we should add it locally as deleted 
                        // so we know about it in future (to avoid Ghost Data if I re-add it locally without knowing it was deleted remotely).
                        // However, if it's deleted remotely and we don't have it, do we really need to store it?
                        // YES, otherwise next time we sync, we might "create" it locally if user adds it, and then conflict?
                        // Actually if we simply import it as "isDeleted: true", user won't see it.
                        // But wait, if remote is deleted and I don't have it, why clutter DB?
                        // If I add it locally later, it will have new timestamp and overwrite remote.
                        // So we can technically skip fetching "deleted" words required for "only in remote" case?
                        // BUT user request says: "Future add back can sync".
                        // Saving it as isDeleted = true is safer for consistency.
                        toUpdateLocal.push(mapRemoteToLocal(remote));
                    }
                }
            }

            // 4. Process local words (Upload new ones)
            for (const local of localWords) {
                const text = local.text.toLowerCase().trim();
                if (!text) continue;

                if (!processedTexts.has(text)) {
                    // Only in Local -> Upload to Remote
                    toUpload.push(mapLocalToRemote(local, userId));
                }
            }

            // 5. Execute Batch Operations
            if (toUpload.length > 0) {
                console.log('Uploading changes:', toUpload.length);
                const { error: uploadError } = await supabase
                    .from('user_words')
                    .upsert(toUpload, { onConflict: 'user_id,text' });

                if (uploadError) console.error('Upload failed:', uploadError);
            }

            if (toUpdateLocal.length > 0) {
                console.log('Downloading changes:', toUpdateLocal.length);
                for (const word of toUpdateLocal) {
                    await dbOperations.put(STORE_WORDS, word);
                    WordStore.notifyListeners(word, 'sync'); // Notify UI to update
                }
            }

            console.log('Sync complete.');
        } finally {
            WordSyncService.isSyncing = false;
        }
    },

    pushWord: async (userId: string, word: Word) => {
        try {
            const payload = mapLocalToRemote(word, userId);
            const { error } = await supabase
                .from('user_words')
                .upsert(payload, { onConflict: 'user_id,text' });

            if (error) {
                console.error('Failed to push word:', error);
            } else {
                // console.log('Word pushed to remote:', word.text);
            }
        } catch (e) {
            console.error('Error pushing word:', e);
        }
    }
};

import { dbOperations, STORE_WORDS } from './db';



function mapLocalToRemote(local: Word, userId: string): any {
    return {
        user_id: userId,
        text: local.text,
        translation: local.translation,
        context: local.context,
        status: local.status,
        lemma: local.lemma,
        added_at: local.addedAt,
        next_review_at: local.nextReviewAt,
        last_reviewed_at: local.lastReviewedAt,
        review_count: local.reviewCount,
        ease_factor: local.easeFactor,
        interval: local.interval,
        updated_at: local.updatedAt || Date.now(), // Use explicit, fallback to now
        is_deleted: !!local.isDeleted
    };
}

function mapRemoteToLocal(remote: any, existingId?: string): Word {
    return {
        id: existingId || crypto.randomUUID(), // If new, generate ID. If update, preserve ID.
        text: remote.text.trim(), // Normalize: trim
        translation: remote.translation || '', // Handle nulls
        context: remote.context,
        status: remote.status || 'new',
        lemma: remote.lemma,
        addedAt: remote.added_at || Date.now(),
        nextReviewAt: remote.next_review_at,
        lastReviewedAt: remote.last_reviewed_at,
        reviewCount: remote.review_count,
        easeFactor: remote.ease_factor,
        interval: remote.interval || 0,
        updatedAt: remote.updated_at ? new Date(remote.updated_at).getTime() : Date.now(),
        isDeleted: !!remote.is_deleted
    };
}
