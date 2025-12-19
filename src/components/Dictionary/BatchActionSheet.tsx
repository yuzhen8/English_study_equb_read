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
            color: 'text-blue-300',
            bgColor: 'bg-blue-500/20 box-shadow-glow'
        },
        {
            id: 'create-group' as const,
            icon: FolderPlus,
            label: '创建新的群组',
            color: 'text-emerald-300',
            bgColor: 'bg-emerald-500/20'
        },
        {
            id: 'add-to-group' as const,
            icon: FolderInput,
            label: '添加到群组',
            color: 'text-purple-300',
            bgColor: 'bg-purple-500/20'
        },
        {
            id: 'export' as const,
            icon: Download,
            label: '导出',
            color: 'text-white/80',
            bgColor: 'bg-white/10'
        },
        {
            id: 'delete' as const,
            icon: Trash2,
            label: '删除',
            color: 'text-red-300',
            bgColor: 'bg-red-500/20'
        }
    ];

    return (
        <div className="fixed bottom-24 left-0 right-0 z-20 px-4 pointer-events-none">
            <div className="glass-card backdrop-blur-md rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-white/10 p-2 max-w-md mx-auto pointer-events-auto animate-fade-in-up">
                {actions.map((action, index) => (
                    <React.Fragment key={action.id}>
                        <button
                            onClick={() => onAction(action.id)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-colors text-left group"
                        >
                            <div className={`p-2.5 rounded-lg ${action.bgColor} border border-white/5`}>
                                <action.icon size={20} className={action.color} />
                            </div>
                            <div className="flex-1">
                                <div className={`font-medium ${action.color} group-hover:text-white transition-colors`}>{action.label}</div>
                                {action.sublabel && (
                                    <div className="text-xs text-white/40 mt-0.5">{action.sublabel}</div>
                                )}
                            </div>
                        </button>
                        {index < actions.length - 1 && (
                            <div className="h-px bg-white/5 mx-3" />
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default BatchActionSheet;
