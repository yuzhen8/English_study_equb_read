import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, MoreHorizontal, Trash2, Edit2, Dumbbell, Plus, X } from 'lucide-react';
import { cn } from '../../lib/utils';

import { GroupStore, WordGroup } from '../../services/GroupStore';
import { WordStore, Word } from '../../services/WordStore';
import WordDetailPopup from '../../components/WordDetailPopup';

const GroupDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [group, setGroup] = useState<WordGroup | null>(null);
    const [words, setWords] = useState<Word[]>([]);
    const [loading, setLoading] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
    const [showWordPopup, setShowWordPopup] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');

    // 加载群组数据
    useEffect(() => {
        if (id) {
            loadGroupData();
        }
    }, [id]);

    const loadGroupData = async () => {
        if (!id) return;
        setLoading(true);

        const groupData = await GroupStore.getGroup(id);
        if (groupData) {
            setGroup(groupData);
            setEditName(groupData.name);
            setEditDescription(groupData.description || '');

            // 加载群组内的单词
            const allWords = await WordStore.getWords();
            const groupWords = allWords.filter(w => groupData.wordIds.includes(w.id));
            setWords(groupWords);
        }

        setLoading(false);
    };

    // 过滤单词
    const filteredWords = words.filter(w =>
        w.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.translation.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 删除群组
    const handleDeleteGroup = async () => {
        if (!id) return;
        await GroupStore.deleteGroup(id);
        navigate('/');
    };

    // 更新群组信息
    const handleUpdateGroup = async () => {
        if (!id || !editName.trim()) return;
        await GroupStore.updateGroup(id, {
            name: editName.trim(),
            description: editDescription.trim() || undefined
        });
        setShowEditDialog(false);
        loadGroupData();
    };

    // 从群组移除单词
    const handleRemoveWords = async () => {
        if (!id || selectedWordIds.size === 0) return;
        await GroupStore.removeWordsFromGroup(id, Array.from(selectedWordIds));
        setSelectedWordIds(new Set());
        setIsEditMode(false);
        loadGroupData();
    };

    // 切换单词选择
    const toggleWordSelection = (wordId: string) => {
        const newSelected = new Set(selectedWordIds);
        if (newSelected.has(wordId)) {
            newSelected.delete(wordId);
        } else {
            newSelected.add(wordId);
        }
        setSelectedWordIds(newSelected);
    };

    // 开始练习
    const handleStartExercise = () => {
        if (!id || words.length === 0) return;
        // 跳转到练习页面，传递群组ID作为参数
        navigate(`/exercise/session/flashcard?groupId=${id}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-500">加载中...</div>
            </div>
        );
    }

    if (!group) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
                <div className="text-gray-500 mb-4">群组不存在</div>
                <button
                    onClick={() => navigate('/')}
                    className="text-blue-600 font-medium"
                >
                    返回首页
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white px-4 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} className="text-gray-700" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-gray-900">{group.name}</h1>
                        {group.description && (
                            <p className="text-sm text-gray-500 mt-0.5">{group.description}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setShowSearch(!showSearch)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <Search size={20} className="text-gray-500" />
                        </button>
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <MoreHorizontal size={20} className="text-gray-500" />
                            </button>
                            {/* Dropdown Menu */}
                            {showMenu && (
                                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[140px] z-20">
                                    <button
                                        onClick={() => {
                                            setShowMenu(false);
                                            setShowEditDialog(true);
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <Edit2 size={16} />
                                        编辑群组
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowMenu(false);
                                            setIsEditMode(!isEditMode);
                                            setSelectedWordIds(new Set());
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <Trash2 size={16} />
                                        {isEditMode ? '退出编辑' : '移除单词'}
                                    </button>
                                    <div className="h-px bg-gray-100 my-1" />
                                    <button
                                        onClick={() => {
                                            setShowMenu(false);
                                            setShowDeleteConfirm(true);
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                        <Trash2 size={16} />
                                        删除群组
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                {showSearch && (
                    <div className="mt-3">
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="搜索群组内单词..."
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Bar */}
            <div className="px-4 py-3 flex items-center justify-between bg-white border-b border-gray-100">
                <span className="text-sm text-gray-500">
                    共 <span className="font-bold text-gray-900">{words.length}</span> 个单词
                </span>
                {words.length > 0 && (
                    <button
                        onClick={handleStartExercise}
                        className="flex items-center gap-1.5 text-sm text-blue-600 font-medium"
                    >
                        <Dumbbell size={16} />
                        开始练习
                    </button>
                )}
            </div>

            {/* Word List */}
            <div className="px-4 py-2">
                {filteredWords.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="text-gray-400 mb-4">
                            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {searchQuery ? '未找到匹配的单词' : '群组内还没有单词'}
                        </h3>
                        <p className="text-sm text-gray-500 mb-6">
                            {searchQuery ? '尝试其他搜索词' : '点击下方按钮添加单词'}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={() => setShowWordPopup(true)}
                                className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors"
                            >
                                <Plus size={18} />
                                添加单词
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredWords.map((word) => (
                            <div
                                key={word.id}
                                className={cn(
                                    "bg-white rounded-xl p-4 shadow-sm border transition-colors",
                                    isEditMode
                                        ? selectedWordIds.has(word.id)
                                            ? "border-red-300 bg-red-50"
                                            : "border-gray-100"
                                        : "border-gray-100"
                                )}
                                onClick={() => isEditMode && toggleWordSelection(word.id)}
                            >
                                <div className="flex items-center gap-3">
                                    {isEditMode && (
                                        <div className={cn(
                                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                            selectedWordIds.has(word.id)
                                                ? "border-red-500 bg-red-500"
                                                : "border-gray-300"
                                        )}>
                                            {selectedWordIds.has(word.id) && (
                                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-gray-900">{word.text}</h3>
                                        <p className="text-sm text-gray-500 truncate mt-0.5">{word.translation}</p>
                                    </div>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-xs font-medium",
                                        word.status === 'new' && "bg-blue-100 text-blue-700",
                                        word.status === 'learning' && "bg-orange-100 text-orange-700",
                                        word.status === 'reviewed' && "bg-green-100 text-green-700",
                                        word.status === 'mastered' && "bg-purple-100 text-purple-700"
                                    )}>
                                        {word.status === 'new' && '新词'}
                                        {word.status === 'learning' && '学习中'}
                                        {word.status === 'reviewed' && '已复习'}
                                        {word.status === 'mastered' && '已掌握'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Mode Action Bar */}
            {isEditMode && selectedWordIds.size > 0 && (
                <div className="fixed bottom-24 left-4 right-4 bg-red-600 text-white rounded-2xl p-4 shadow-xl flex items-center justify-between z-20">
                    <span className="font-medium">已选择 {selectedWordIds.size} 个单词</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setSelectedWordIds(new Set());
                                setIsEditMode(false);
                            }}
                            className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleRemoveWords}
                            className="px-4 py-2 bg-white text-red-600 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                        >
                            移除
                        </button>
                    </div>
                </div>
            )}

            {/* FAB - Add Word */}
            {!isEditMode && (
                <button
                    onClick={() => setShowWordPopup(true)}
                    className="fixed bottom-24 right-4 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 hover:bg-black transition-colors z-20"
                >
                    <Plus size={20} />
                    <span className="font-bold">添加单词</span>
                </button>
            )}

            {/* Word Detail Popup for Adding */}
            {showWordPopup && (
                <WordDetailPopup
                    onClose={() => {
                        setShowWordPopup(false);
                        loadGroupData(); // 重新加载以更新列表
                    }}
                    groupId={id} // 传递群组ID，用于直接添加到群组
                />
            )}

            {/* Delete Confirm Dialog */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={24} className="text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">删除群组</h3>
                            <p className="text-sm text-gray-500">
                                确定要删除"{group.name}"吗？群组内的 {words.length} 个单词不会被删除。
                            </p>
                        </div>
                        <div className="flex border-t border-gray-100">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-3 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                            >
                                取消
                            </button>
                            <div className="w-px bg-gray-100" />
                            <button
                                onClick={handleDeleteGroup}
                                className="flex-1 py-3 text-red-600 font-medium hover:bg-red-50 transition-colors"
                            >
                                删除
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Group Dialog */}
            {showEditDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900">编辑群组</h2>
                            <button
                                onClick={() => setShowEditDialog(false)}
                                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    群组名称 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    描述
                                </label>
                                <textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 p-4 border-t border-gray-100">
                            <button
                                onClick={() => setShowEditDialog(false)}
                                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleUpdateGroup}
                                disabled={!editName.trim()}
                                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Click outside to close menu */}
            {showMenu && (
                <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                />
            )}
        </div>
    );
};

export default GroupDetail;
