import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

const MainLayout: React.FC = () => {
    return (
        <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans">
            <div className="flex-1 overflow-y-auto pb-16">
                <Outlet />
            </div>
            <BottomNav />
        </div>
    );
};

export default MainLayout;
