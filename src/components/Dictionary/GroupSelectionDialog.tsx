import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { GroupStore, WordGroup } from '../../services/GroupStore';

interface GroupSelectionDialogProps {
    wordIds: string[];
    onClose: () => void;
    onSelect: (groupId: string) => void;
}

const GroupSelectionDialog: React.FC<GroupSelectionDialogProps> = ({ wordIds, onClose, onSelect }) => {
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">添加到群组</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="搜索群组..."
                            className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Group List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {filteredGroups.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
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
                                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                            >
                                <div>
                                    <div className="font-medium text-gray-900">{group.name}</div>
                                    {group.description && (
                                        <div className="text-sm text-gray-500 mt-0.5">{group.description}</div>
                                    )}
                                </div>
                                <div className="text-xs text-gray-400">
                                    {group.wordIds.length} 个单词
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                        取消
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GroupSelectionDialog;
