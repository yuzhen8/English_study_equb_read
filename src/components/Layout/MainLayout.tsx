import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

const MainLayout: React.FC = () => {
    return (
        <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans">
            {/* 内容区域：高度=屏幕高度-导航栏高度(64px)，滚动条在此区域内 */}
            <div className="flex-1 overflow-y-auto">
                <Outlet />
            </div>
            <BottomNav />
        </div>
    );
};

export default MainLayout;
