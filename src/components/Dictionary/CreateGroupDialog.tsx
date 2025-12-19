import React, { useState } from 'react';
import { X } from 'lucide-react';

interface CreateGroupDialogProps {
    onClose: () => void;
    onCreate: (name: string, description?: string) => void;
}

const CreateGroupDialog: React.FC<CreateGroupDialogProps> = ({ onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = () => {
        if (!name.trim()) return;
        onCreate(name.trim(), description.trim() || undefined);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card max-w-md w-full shadow-2xl border border-white/10 animate-fade-in-up">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-lg font-bold text-white">创建新群组</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-white/60" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-1.5">
                            群组名称 <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="例如：福尔摩斯"
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-white/20"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-1.5">
                            描述
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="可选的群组描述"
                            rows={3}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none text-white placeholder-white/20"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-2 p-4 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 border border-white/10 rounded-lg text-white/60 font-medium hover:bg-white/5 hover:text-white transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!name.trim()}
                        className="flex-1 py-2.5 bg-blue-600/80 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:bg-white/5 disabled:text-white/20 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                    >
                        创建
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateGroupDialog;
