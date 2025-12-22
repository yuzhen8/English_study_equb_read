import { useEffect, useRef } from 'react';
import { ReadingTimeStore, ReadingSession } from '../services/ReadingTimeStore';

export const useReadingTime = (userId: string, bookId: string) => {
    const trackingRef = useRef<{
        lastActivity: number;
        accumulatedTime: number; // in seconds
        intervalId: any;
    }>({
        lastActivity: Date.now(),
        accumulatedTime: 0,
        intervalId: null
    });

    useEffect(() => {
        if (!userId || !bookId) return;

        const updateActivity = () => {
            trackingRef.current.lastActivity = Date.now();
        };

        // Listen for activity to reset "Idle" check?
        // Requirement: "If stay on page > 1h, invalid".
        // This implies we don't just track "activity", we track "page turn" specifically?
        // Or generic interaction? The prompt says "stay on a page" (stay in one view).
        // If user scrolls, are they "on the same page"? EPUB scrolling flow: yes.
        // So any interaction resets the "Idle" timer ideally.
        // BUT strict interpretation: "Stay on interface... prolonged stay on one page accounts as invalid".
        // Let's treat "interaction" (click/key/scroll) as evidence of presence.

        window.addEventListener('click', updateActivity);
        window.addEventListener('keydown', updateActivity);
        // window.addEventListener('mousemove', updateActivity); // Too frequent?

        // Start tracking loop
        trackingRef.current.lastActivity = Date.now();

        const COMMIT_INTERVAL_MS = 30000; // Commit every 30s
        const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 Hour

        trackingRef.current.intervalId = setInterval(() => {
            const now = Date.now();
            const timeSinceLastActivity = now - trackingRef.current.lastActivity;

            if (timeSinceLastActivity > IDLE_TIMEOUT_MS) {
                // Too long idle. Do NOT count this interval.
                // We assume user left.
                // Reset activity to avoid "waking up" and suddenly counting 1h if they click once?
                // Actually if they click, lastActivity updates to NOW.
                // So if I come back after 2 hours and click:
                // lastActivity = now.
                // The loop runs. timeSinceLastActivity = 0.
                // It works.
                // But what about the *past* interval?
                // The loop runs every 30s.
                // if timeSinceLastActivity < IDLE_TIMEOUT, we add 30s?
                // No, simpler: 
                // We add `COMMIT_INTERVAL` (30s) to DB if `timeSinceLastActivity < IDLE_TIMEOUT`.

                // Correction: If I am idle for 59m, it counts. If 61m, it stops counting.
                // This logic:
                // Every 30s check: Is user idle?
                // If NO (active recently): Add 30s.
                // If YES (>1h ago): Don't add.

                // This is approximate but robust.
                return;
            }

            // User is considered active. Add 30s to DB.
            saveSession(COMMIT_INTERVAL_MS / 1000);

        }, COMMIT_INTERVAL_MS);


        const saveSession = async (durationSeconds: number) => {
            const today = new Date().toISOString().split('T')[0];
            const session: ReadingSession = {
                id: crypto.randomUUID(),
                userId,
                bookId,
                startTime: Date.now() - durationSeconds * 1000,
                endTime: Date.now(),
                duration: durationSeconds,
                date: today
            };
            await ReadingTimeStore.addSession(session);
        };

        return () => {
            window.removeEventListener('click', updateActivity);
            window.removeEventListener('keydown', updateActivity);
            if (trackingRef.current.intervalId) clearInterval(trackingRef.current.intervalId);
        };
    }, [userId, bookId]);
};

// Also export a helper to trigger "Activity" manually (e.g., on Page Turn)
export const markReadingActivity = () => {
    // This assumes we can dispatch an event or use context. 
    // For now, simpler to just simulate a click or assume useReadingTime handles global events.
    // Or we could return a 'notifyActivity' function from the hook?
    // But hooks can't easily export to outside unless passed down.
    // Global event listener is fine for 'click'.
};
