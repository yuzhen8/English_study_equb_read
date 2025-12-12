import React from 'react';
import { Library, BookOpen, NotebookTabs, Settings } from 'lucide-react';

interface SidebarProps {
    activeView: string;
    onNavigate: (view: any) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate }) => {
    return (
        <div className="layout-sidebar">
            <div
                className={`nav-item ${activeView === 'library' ? 'active' : ''}`}
                onClick={() => onNavigate('library')}
                title="Library"
            >
                <Library size={24} />
            </div>
            <div
                className={`nav-item ${activeView === 'reader' ? 'active' : ''}`}
                onClick={() => onNavigate('reader')}
                title="Reader"
            >
                <BookOpen size={24} />
            </div>
            <div
                className={`nav-item ${activeView === 'vocabulary' ? 'active' : ''}`}
                onClick={() => onNavigate('vocabulary')}
                title="Vocabulary"
            >
                <NotebookTabs size={24} />
            </div>

            <div style={{ flex: 1 }} /> {/* Spacer */}

            <div
                className={`nav-item ${activeView === 'settings' ? 'active' : ''}`}
                onClick={() => onNavigate('settings')}
                title="Settings"
                style={{ marginBottom: '20px' }}
            >
                <Settings size={24} />
            </div>
        </div>
    );
};

export default Sidebar;
