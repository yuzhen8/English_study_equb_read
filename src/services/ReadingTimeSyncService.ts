import { supabase } from '../lib/supabase';
import { ReadingSession, ReadingTimeStore } from './ReadingTimeStore';

export const ReadingTimeSyncService = {
    isSyncing: false,

    sync: async (userId: string) => {
        if (ReadingTimeSyncService.isSyncing) return;
        ReadingTimeSyncService.isSyncing = true;

        try {
            // 1. Upload Unsynced Local Sessions
            const unsynced = await ReadingTimeStore.getUnsyncedSessions(userId);
            if (unsynced.length > 0) {
                console.log(`Uploading ${unsynced.length} reading sessions...`);

                // Map to Supabase schema (assuming snake_case)
                const payload = unsynced.map(s => ({
                    id: s.id,
                    user_id: s.userId,
                    book_id: s.bookId,
                    start_time: new Date(s.startTime).toISOString(),
                    end_time: new Date(s.endTime).toISOString(),
                    duration: s.duration,
                    date: s.date
                }));

                const { error } = await supabase
                    .from('reading_sessions')
                    .upsert(payload, { onConflict: 'id' });

                if (error) {
                    console.error('Failed to upload reading sessions:', error);
                } else {
                    // Mark as synced locally
                    await ReadingTimeStore.markSessionsAsSynced(unsynced.map(s => s.id));
                    console.log('Reading sessions uploaded successfully.');
                }
            }

            // 2. Download Remote Sessions (Simple "Sync All" for now to ensure stats consistency)
            // Optimization: Only fetch if we really need history? 
            // For now, let's just upload. Downloading MASSIVE history into IDB on every sync is dangerous.
            // BETTER STRATEGY: 
            // - We assume "Stats" page should calculate from Server if possible?
            // - OR we assume local IDB IS the source of truth for "My Device Reading".
            // - User requirement: "Reading time statistics... sync across devices".
            // - So we MUST download.
            // - Use 'updated_at' cursor?
            // - Let's implement a 'since' check.

            const lastSyncKey = `reading_sessions_last_sync_${userId}`;
            const lastSync = localStorage.getItem(lastSyncKey);

            let query = supabase
                .from('reading_sessions')
                .select('*')
                .eq('user_id', userId);

            if (lastSync) {
                query = query.gt('created_at', lastSync); // Assuming created_at/updated_at exists
            }

            const { data: remoteSessions, error: fetchError } = await query;

            if (fetchError) {
                console.error('Failed to fetch remote reading sessions:', fetchError);
            } else if (remoteSessions && remoteSessions.length > 0) {
                console.log(`Downloaded ${remoteSessions.length} new reading sessions.`);

                for (const remote of remoteSessions) {
                    // Convert back to local format
                    const session: ReadingSession = {
                        id: remote.id,
                        userId: remote.user_id,
                        bookId: remote.book_id,
                        startTime: new Date(remote.start_time).getTime(),
                        endTime: new Date(remote.end_time).getTime(),
                        duration: remote.duration,
                        date: remote.date,
                        synced: true // It came from remote, so it is synced
                    };
                    // We use addSession but we need to avoid re-uploading it?
                    // addSession usually sets synced=undefined. 
                    // We should use dbOperations directly or ensure addSession respects our 'synced' flag if we passed it?
                    // ReadingTimeStore.addSession takes 'session', so if we pass synced: true, it should store it.
                    await ReadingTimeStore.addSession(session);
                }

                // Update timestamp
                localStorage.setItem(lastSyncKey, new Date().toISOString());
            }

        } catch (e) {
            console.error('Reading Time Sync Error:', e);
        } finally {
            ReadingTimeSyncService.isSyncing = false;
        }
    }
};
