import React from 'react';

interface RightPanelProps {
    children?: React.ReactNode;
}

const RightPanel: React.FC<RightPanelProps> = ({ children }) => {
    return (
        <div className="layout-right-panel">
            <div className="right-panel-header">
                Dictionary / Tools
            </div>
            <div style={{ padding: '15px' }}>
                {children || <div style={{ color: '#666', fontStyle: 'italic' }}>Select a word to see details</div>}
            </div>
        </div>
    );
};

export default RightPanel;
