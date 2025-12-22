import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';

const MainLayout: React.FC = () => {
    // Theme handled by App.tsx
    // const { currentTheme } = useTheme();

    const swipeHandlers = useSwipeNavigation();

    return (
        <div
            className="flex flex-col h-full font-sans overflow-hidden relative"
            {...swipeHandlers}
        >
            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative z-10 pb-24">
                <Outlet />
            </div>
            <BottomNav />
        </div>
    );
};

export default MainLayout;
