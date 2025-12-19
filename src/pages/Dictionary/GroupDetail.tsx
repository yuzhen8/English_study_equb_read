import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, MoreHorizontal, Trash2, Edit2, Dumbbell, Plus, X, RefreshCw, ChevronDown, ArrowDown, ArrowUp } from 'lucide-react';
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
    const [statusFilter, setStatusFilter] = useState<string>('new');
    const [sortBy, setSortBy] = useState<string>('progress');
    const [sortAscending, setSortAscending] = useState(true);
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [selectedWordId, setSelectedWordId] = useState<string>('');

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

    // 过滤和排序逻辑
    const getFilteredAndSortedWords = () => {
        let filtered = words.filter(w => {
            if (!statusFilter) return true;
            if (statusFilter === 'new') return w.status === 'new';
            if (statusFilter === 'learning') {
                return w.status === 'learning' || w.status === 'reviewed';
            }
            if (statusFilter === 'reviewed') {
                return w.status === 'mastered';
            }
            return w.status === statusFilter;
        });

        if (searchQuery) {
            filtered = filtered.filter(w =>
                w.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                w.translation.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // 排序逻辑
        filtered.sort((a, b) => {
            let result = 0;
            switch (sortBy) {
                case 'alpha':
                    result = a.text.localeCompare(b.text);
                    break;
                case 'progress':
                    const progressOrder: Record<string, number> = { 'new': 0, 'learning': 1, 'reviewed': 2, 'mastered': 3 };
                    result = (progressOrder[a.status] || 0) - (progressOrder[b.status] || 0);
                    break;
                case 'date':
                    result = b.addedAt - a.addedAt;
                    break;
                case 'lastReview':
                    result = (b.lastReviewedAt || 0) - (a.lastReviewedAt || 0);
                    break;
                case 'nextReview':
                    result = (a.nextReviewAt || 0) - (b.nextReviewAt || 0);
                    break;
                case 'repeatCount':
                    result = (b.reviewCount || 0) - (a.reviewCount || 0);
                    break;
                case 'frequency':
                    result = (b.reviewCount || 0) - (a.reviewCount || 0);
                    break;
            }
            return sortAscending ? result : -result;
        });

        return filtered;
    };

    const filteredWords = getFilteredAndSortedWords();

    const statusTabs = [
        { value: 'new', label: '新的' },
        { value: 'learning', label: '学习' },
        { value: 'reviewed', label: '已学习' }
    ];

    const sortOptions = [
        { value: 'alpha', label: '字母顺序' },
        { value: 'progress', label: '进度' },
        { value: 'lastReview', label: '最后训练' },
        { value: 'nextReview', label: '下一次训练' },
        { value: 'repeatCount', label: '重复次数' },
        { value: 'date', label: '添加时间' },
        { value: 'frequency', label: '频率' }
    ];

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
            <div className="min-h-screen bg-transparent flex items-center justify-center">
                <div className="text-white/60">加载中...</div>
            </div>
        );
    }

    if (!group) {
        return (
            <div className="min-h-screen bg-transparent flex flex-col items-center justify-center">
                <div className="text-white/60 mb-4">群组不存在</div>
                <button
                    onClick={() => navigate('/')}
                    className="text-blue-300 font-medium"
                >
                    返回首页
                </button>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-transparent pb-20">
            {/* Header */}
            <div className="bg-transparent px-4 pt-12 pb-4 sticky top-0 z-10">
                <div className="flex items-center gap-3 mb-2">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} className="text-white/80" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-white">{group.name}</h1>
                        {group.description && (
                            <p className="text-sm text-white/50 mt-0.5">{group.description}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setShowSearch(!showSearch)}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <Search size={20} className="text-white/60" />
                        </button>
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <MoreHorizontal size={20} className="text-white/60" />
                            </button>
                            {/* Dropdown Menu */}
                            {showMenu && (
                                <div className="absolute right-0 top-full mt-1 glass-card border border-white/10 py-1 min-w-[140px] z-20 backdrop-blur-xl animate-in fade-in zoom-in-95">
                                    <button
                                        onClick={() => {
                                            setShowMenu(false);
                                            setShowEditDialog(true);
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-sm text-white/80 hover:bg-white/10 flex items-center gap-2 transition-colors"
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
                                        className="w-full px-4 py-2.5 text-left text-sm text-white/80 hover:bg-white/10 flex items-center gap-2 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                        {isEditMode ? '退出编辑' : '移除单词'}
                                    </button>
                                    <div className="h-px bg-white/10 my-1" />
                                    <button
                                        onClick={() => {
                                            setShowMenu(false);
                                            setShowDeleteConfirm(true);
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-white/10 flex items-center gap-2 transition-colors"
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
                    <div className="mt-3 animate-fade-in-down">
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="搜索群组内单词..."
                                className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 placeholder:text-white/30"
                                autoFocus
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Status Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 mt-3 no-scrollbar">
                    {statusTabs.map(tab => (
                        <button
                            key={tab.value}
                            onClick={() => setStatusFilter(tab.value)}
                            className={cn(
                                "px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-all border backdrop-blur-md",
                                statusFilter === tab.value
                                    ? 'bg-white/10 text-white border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]'
                                    : 'bg-black/20 text-white/50 hover:bg-white/5 border-transparent hover:text-white/80'
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Sort Controls */}
                <div className="flex items-center gap-2 mt-3 relative">
                    <span className="text-sm text-white/40">按照排序:</span>
                    <button
                        onClick={() => setShowSortMenu(!showSortMenu)}
                        className="flex items-center gap-1 text-sm text-blue-300 hover:bg-white/10 px-2 py-1 rounded transition-colors"
                    >
                        <RefreshCw size={14} className="text-white/40" />
                        <span>{sortOptions.find(o => o.value === sortBy)?.label}</span>
                        <ChevronDown size={14} />
                    </button>
                    <button
                        onClick={() => setSortAscending(!sortAscending)}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                        {sortAscending ? <ArrowDown size={16} className="text-white/40" /> : <ArrowUp size={16} className="text-white/40" />}
                    </button>

                    {showSortMenu && (
                        <div className="absolute top-full left-0 mt-1 glass-card border border-white/10 py-2 z-30 min-w-[140px] backdrop-blur-xl animate-in fade-in zoom-in-95">
                            {sortOptions.map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        setSortBy(option.value);
                                        setShowSortMenu(false);
                                    }}
                                    className={cn(
                                        "w-full px-4 py-2 text-left text-sm transition-colors hover:bg-white/10",
                                        sortBy === option.value ? 'text-blue-300 font-bold' : 'text-white/70'
                                    )}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Bar */}
            <div className="mx-4 mt-2 mb-4 p-3 flex items-center justify-between glass-card border border-white/10">
                <span className="text-sm text-white/60">
                    共 <span className="font-bold text-white">{words.length}</span> 个单词
                </span>
                {words.length > 0 && (
                    <button
                        onClick={handleStartExercise}
                        className="flex items-center gap-1.5 text-sm text-blue-300 font-medium hover:text-blue-200 transition-colors"
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
                        <div className="text-white/20 mb-4">
                            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-white/60 mb-2">
                            {searchQuery ? '未找到匹配的单词' : '群组内还没有单词'}
                        </h3>
                        <p className="text-sm text-white/40 mb-6">
                            {searchQuery ? '尝试其他搜索词' : '点击下方按钮添加单词'}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={() => setShowWordPopup(true)}
                                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:scale-105 transition-all shadow-lg shadow-blue-500/20"
                            >
                                <Plus size={18} />
                                添加单词
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredWords.map((word) => (
                            <div
                                key={word.id}
                                className={cn(
                                    "glass-card border border-white/5 p-4 transition-all duration-200 cursor-pointer",
                                    isEditMode
                                        ? selectedWordIds.has(word.id)
                                            ? "bg-red-500/10 border-red-500/30"
                                            : "hover:bg-white/10"
                                        : "hover:bg-white/10 hover:border-white/20 active:scale-[0.98]"
                                )}
                                onClick={() => {
                                    if (isEditMode) {
                                        toggleWordSelection(word.id);
                                    } else {
                                        setSelectedWordId(word.id);
                                    }
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    {isEditMode && (
                                        <div className={cn(
                                            "w-5 h-5 rounded-md border transition-all flex items-center justify-center",
                                            selectedWordIds.has(word.id)
                                                ? "border-red-500 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                                                : "border-white/30 bg-white/5"
                                        )}>
                                            {selectedWordIds.has(word.id) && (
                                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-white text-lg">{word.text}</h3>
                                        <p className="text-sm text-white/60 line-clamp-2 whitespace-pre-line mt-0.5">{word.translation.replace(/\\n/g, '\n')}</p>
                                    </div>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                        word.status === 'new' && "bg-blue-500/10 text-blue-300 border-blue-500/20",
                                        word.status === 'learning' && "bg-orange-500/10 text-orange-300 border-orange-500/20",
                                        word.status === 'reviewed' && "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
                                        word.status === 'mastered' && "bg-purple-500/10 text-purple-300 border-purple-500/20"
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
                <div className="fixed bottom-24 left-4 right-4 glass-card border border-red-500/30 bg-red-900/40 p-4 flex items-center justify-between z-20 backdrop-blur-xl animate-in slide-in-from-bottom-4">
                    <span className="font-medium text-red-200">已选择 {selectedWordIds.size} 个单词</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setSelectedWordIds(new Set());
                                setIsEditMode(false);
                            }}
                            className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-white text-sm"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleRemoveWords}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors text-sm shadow-[0_0_10px_rgba(239,68,68,0.4)]"
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
                    className="fixed bottom-24 right-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-full shadow-[0_0_20px_rgba(79,70,229,0.4)] flex items-center gap-2 hover:scale-105 transition-all z-20 border border-white/20"
                >
                    <Plus size={20} />
                    <span className="font-bold">添加单词</span>
                </button>
            )}

            {/* Word Detail Popup */}
            {(selectedWordId || showWordPopup) && (
                <WordDetailPopup
                    wordId={selectedWordId}
                    onClose={() => {
                        setSelectedWordId('');
                        setShowWordPopup(false);
                        loadGroupData(); // 重新加载以更新列表
                    }}
                    groupId={id} // 传递群组ID，用于直接添加到群组
                />
            )}

            {/* Delete Confirm Dialog */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card rounded-2xl max-w-sm w-full shadow-2xl border border-white/10 animate-fade-in-up">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                                <Trash2 size={24} className="text-red-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">删除群组</h3>
                            <p className="text-sm text-white/60">
                                确定要删除"{group.name}"吗？群组内的 {words.length} 个单词不会被删除。
                            </p>
                        </div>
                        <div className="flex border-t border-white/10">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-3 text-white/60 font-medium hover:bg-white/5 transition-colors"
                            >
                                取消
                            </button>
                            <div className="w-px bg-white/10" />
                            <button
                                onClick={handleDeleteGroup}
                                className="flex-1 py-3 text-red-400 font-medium hover:bg-red-500/10 transition-colors"
                            >
                                删除
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Group Dialog */}
            {showEditDialog && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card rounded-2xl max-w-md w-full shadow-2xl border border-white/10 animate-fade-in-up">
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h2 className="text-lg font-bold text-white">编辑群组</h2>
                            <button
                                onClick={() => setShowEditDialog(false)}
                                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X size={20} className="text-white/60" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1.5">
                                    群组名称 <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1.5">
                                    描述
                                </label>
                                <textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50 resize-none"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 p-4 border-t border-white/10">
                            <button
                                onClick={() => setShowEditDialog(false)}
                                className="flex-1 py-2.5 border border-white/10 rounded-lg text-white/70 font-medium hover:bg-white/10 transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleUpdateGroup}
                                disabled={!editName.trim()}
                                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed"
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
