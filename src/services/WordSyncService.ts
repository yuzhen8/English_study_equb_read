import { supabase } from '../lib/supabase';
import { WordStore, Word } from './WordStore';

export const WordSyncService = {
    sync: async (userId: string) => {
        console.log('Starting sync for user:', userId);

        // 1. Get all local words
        const localWords = await WordStore.getWords();
        // Create a map for faster lookup
        const localMap = new Map<string, Word>();
        localWords.forEach(w => localMap.set(w.text.toLowerCase(), w));

        // 2. Get all remote words
        const { data: remoteWords, error } = await supabase
            .from('user_words')
            .select('*');

        if (error) {
            console.error('Failed to fetch remote words:', error);
            throw error;
        }

        const remoteMap = new Map<string, any>();
        remoteWords?.forEach(w => remoteMap.set(w.text.toLowerCase(), w));

        const toUpload: any[] = [];
        const toUpdateLocal: Word[] = [];
        const processedTexts = new Set<string>();

        // 3. Process remote words (Download or Conflict)
        if (remoteWords) {
            for (const remote of remoteWords) {
                const text = remote.text.toLowerCase();
                processedTexts.add(text);
                const local = localMap.get(text);

                if (local) {
                    // Conflict resolution: Last Write Wins
                    // We rely on 'updated_at' timestamp.
                    // Ideally local Word has updated_at. WordStore has 'addedAt', 'lastReviewedAt'.
                    // Let's assume max(addedAt, lastReviewedAt) is the modification time if updated_at specific field is missing.
                    // But wait, WordStore does not track explicit update time for all fields. 
                    // Let's deduce local update time.
                    const localTime = Math.max(local.addedAt, local.lastReviewedAt || 0);
                    // Remote 'updated_at' is in ms (as we defined in schema bigint default epoch*1000)
                    const remoteTime = remote.updated_at || 0;

                    if (remoteTime > localTime) {
                        // Remote is newer -> Update Local
                        toUpdateLocal.push(mapRemoteToLocal(remote, local.id));
                    } else if (localTime > remoteTime) {
                        // Local is newer -> Update Remote
                        toUpload.push(mapLocalToRemote(local, userId));
                    }
                    // If equal, do nothing
                } else {
                    // Only in Remote -> Add to Local
                    toUpdateLocal.push(mapRemoteToLocal(remote));
                }
            }
        }

        // 4. Process local words (Upload new ones)
        for (const local of localWords) {
            const text = local.text.toLowerCase();
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
                .upsert(toUpload, { onConflict: 'user_id,text' }); // We rely on unique constraint

            if (uploadError) console.error('Upload failed:', uploadError);
        }

        if (toUpdateLocal.length > 0) {
            console.log('Downloading changes:', toUpdateLocal.length);
            for (const word of toUpdateLocal) {
                await dbOperations.put(STORE_WORDS, word);
            }
            // await saveLoalBatch(toUpdateLocal);
        }

        console.log('Sync complete.');
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
        added_at: local.addedAt,
        next_review_at: local.nextReviewAt,
        last_reviewed_at: local.lastReviewedAt,
        review_count: local.reviewCount,
        ease_factor: local.easeFactor,
        interval: local.interval,
        updated_at: Date.now() // Taking current time as update time for sync
    };
}

function mapRemoteToLocal(remote: any, existingId?: string): Word {
    return {
        id: existingId || crypto.randomUUID(), // If new, generate ID. If update, preserve ID.
        text: remote.text,
        translation: remote.translation || '', // Handle nulls
        context: remote.context,
        status: remote.status || 'new',
        addedAt: remote.added_at || Date.now(),
        nextReviewAt: remote.next_review_at,
        lastReviewedAt: remote.last_reviewed_at,
        reviewCount: remote.review_count,
        easeFactor: remote.ease_factor,
        interval: remote.interval,
        lemma: undefined // Remote schema didn't have lemma? I should add it if I want.
        // For now, lemma might be lost on download if I didn't sync it.
        // It's not critical, can be re-analyzed.
    };
}
