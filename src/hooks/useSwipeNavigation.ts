import { useState, TouchEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const MIN_SWIPE_DISTANCE = 50;
const MAX_VERTICAL_DISTANCE = 50;

const NAV_ORDER = [
    '/',
    '/dictionary',
    '/exercise',
    '/statistics',
    '/profile'
];

export const useSwipeNavigation = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);
    const [touchEnd, setTouchEnd] = useState<{ x: number, y: number } | null>(null);

    const onTouchStart = (e: TouchEvent) => {
        setTouchEnd(null);
        setTouchStart({
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        });
    };

    const onTouchMove = (e: TouchEvent) => {
        setTouchEnd({
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        });
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distanceX = touchStart.x - touchEnd.x;
        const distanceY = touchStart.y - touchEnd.y;
        const isLeftSwipe = distanceX > MIN_SWIPE_DISTANCE;
        const isRightSwipe = distanceX < -MIN_SWIPE_DISTANCE;
        const isVerticalSwipe = Math.abs(distanceY) > MAX_VERTICAL_DISTANCE;

        // If simple click or vertical scroll, ignore
        if (Math.abs(distanceX) < MIN_SWIPE_DISTANCE || isVerticalSwipe) {
            return;
        }

        // Determine current index
        // We match strictly for root pages, but for sub-pages we might want to be smart.
        // For now, let's just find the closest match or default to 0.
        // Actually, let's effectively flatten sub-routes to their parent tab.
        const currentPath = location.pathname;
        let currentIndex = NAV_ORDER.findIndex(path =>
            path === '/' ? currentPath === '/' : currentPath.startsWith(path)
        );

        if (currentIndex === -1) {
            // If we are in a sub-route that doesn't strictly start with one of the others (unlikely given the list),
            // or if it's 'auth' or 'reader', we probably shouldn't swipe?
            // Reader is outside MainLayout, so safe.
            // Auth is in MainLayout...
            if (currentPath.startsWith('/auth')) return;
            currentIndex = 0; // Default to first
        }

        if (isLeftSwipe) {
            // Next tab
            if (currentIndex < NAV_ORDER.length - 1) {
                const nextPath = NAV_ORDER[currentIndex + 1];
                // Navigate with a transition if possible? React Router doesn't do transitions natively comfortably without AnimatedOutlet.
                navigate(nextPath);
            }
        }

        if (isRightSwipe) {
            // Prev tab
            if (currentIndex > 0) {
                const prevPath = NAV_ORDER[currentIndex - 1];
                navigate(prevPath);
            }
        }
    };

    return {
        onTouchStart,
        onTouchMove,
        onTouchEnd
    };
};
