import React, { ReactNode } from 'react';
import './Layout.css';
import Sidebar from './Sidebar';
import RightPanel from './RightPanel';

interface LayoutProps {
    children: ReactNode;
    rightPanel?: ReactNode;
    activeView: string;
    onNavigate: (view: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, rightPanel, activeView, onNavigate }) => {
    return (
        <div className="layout-container">
            <Sidebar activeView={activeView} onNavigate={onNavigate} />

            <main className="layout-content">
                {children}
            </main>

            <RightPanel>
                {rightPanel}
            </RightPanel>
        </div>
    );
};

export default Layout;
