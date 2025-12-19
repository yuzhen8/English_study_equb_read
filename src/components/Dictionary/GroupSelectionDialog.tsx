import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { GroupStore, WordGroup } from '../../services/GroupStore';

interface GroupSelectionDialogProps {
    wordIds: string[];
    onClose: () => void;
    onSelect: (groupId: string) => void;
}

const GroupSelectionDialog: React.FC<GroupSelectionDialogProps> = ({ onClose, onSelect }) => {
    const [groups, setGroups] = useState<WordGroup[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        const allGroups = await GroupStore.getGroups();
        setGroups(allGroups);
    };

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card max-w-md w-full shadow-2xl max-h-[80vh] flex flex-col border border-white/10 animate-fade-in-up">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-lg font-bold text-white">添加到群组</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-white/60" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-white/10">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="搜索群组..."
                            className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-white/20"
                        />
                    </div>
                </div>

                {/* Group List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {filteredGroups.length === 0 ? (
                        <div className="text-center py-8 text-white/40">
                            {searchQuery ? '未找到匹配的群组' : '暂无群组，请先创建'}
                        </div>
                    ) : (
                        filteredGroups.map(group => (
                            <button
                                key={group.id}
                                onClick={() => {
                                    onSelect(group.id);
                                    onClose();
                                }}
                                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors text-left group"
                            >
                                <div>
                                    <div className="font-medium text-white group-hover:text-blue-300 transition-colors">{group.name}</div>
                                    {group.description && (
                                        <div className="text-sm text-white/40 mt-0.5">{group.description}</div>
                                    )}
                                </div>
                                <div className="text-xs text-white/30">
                                    {group.wordIds.length} 个单词
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 border border-white/10 rounded-lg text-white/60 font-medium hover:bg-white/5 hover:text-white transition-colors"
                    >
                        取消
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GroupSelectionDialog;
