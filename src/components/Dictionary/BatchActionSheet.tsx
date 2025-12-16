import React from 'react';
import { Dumbbell, FolderPlus, FolderInput, Download, Trash2 } from 'lucide-react';

interface BatchActionSheetProps {
    selectedCount: number;
    onAction: (action: 'train' | 'create-group' | 'add-to-group' | 'export' | 'delete') => void;
}

const BatchActionSheet: React.FC<BatchActionSheetProps> = ({ selectedCount, onAction }) => {
    const actions = [
        {
            id: 'train' as const,
            icon: Dumbbell,
            label: '训练',
            sublabel: `已选词语 ${selectedCount}`,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50'
        },
        {
            id: 'create-group' as const,
            icon: FolderPlus,
            label: '创建新的群组',
            color: 'text-green-600',
            bgColor: 'bg-green-50'
        },
        {
            id: 'add-to-group' as const,
            icon: FolderInput,
            label: '添加到群组',
            color: 'text-purple-600',
            bgColor: 'bg-purple-50'
        },
        {
            id: 'export' as const,
            icon: Download,
            label: '导出',
            color: 'text-gray-600',
            bgColor: 'bg-gray-50'
        },
        {
            id: 'delete' as const,
            icon: Trash2,
            label: '删除',
            color: 'text-red-600',
            bgColor: 'bg-red-50'
        }
    ];

    return (
        <div className="fixed bottom-24 left-0 right-0 z-20 px-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 max-w-md mx-auto pointer-events-auto">
                {actions.map((action, index) => (
                    <React.Fragment key={action.id}>
                        <button
                            onClick={() => onAction(action.id)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                        >
                            <div className={`p-2.5 rounded-lg ${action.bgColor}`}>
                                <action.icon size={20} className={action.color} />
                            </div>
                            <div className="flex-1">
                                <div className={`font-medium ${action.color}`}>{action.label}</div>
                                {action.sublabel && (
                                    <div className="text-xs text-gray-500 mt-0.5">{action.sublabel}</div>
                                )}
                            </div>
                        </button>
                        {index < actions.length - 1 && (
                            <div className="h-px bg-gray-100 mx-3" />
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default BatchActionSheet;
