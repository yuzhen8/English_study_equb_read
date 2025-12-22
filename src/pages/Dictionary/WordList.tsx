import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckSquare, ChevronDown, MoreVertical, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import WordDetailPopup from '../../components/WordDetailPopup';
import BatchActionSheet from '../../components/Dictionary/BatchActionSheet';
import CreateGroupDialog from '../../components/Dictionary/CreateGroupDialog';
import GroupSelectionDialog from '../../components/Dictionary/GroupSelectionDialog';
import { WordStore, Word } from '../../services/WordStore';
import { GroupStore } from '../../services/GroupStore';

type StatusFilter = '' | 'new' | 'learning' | 'reviewed' | 'mastered';
type SortBy = 'alpha' | 'progress' | 'lastReview' | 'nextReview' | 'repeatCount' | 'date' | 'frequency';

const WordList: React.FC = () => {
    const navigate = useNavigate();
    const [words, setWords] = useState<Word[]>([]);
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
    const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('new');
    const [sortBy, setSortBy] = useState<SortBy>('progress');
    const [sortAscending, setSortAscending] = useState(true);
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [selectedWordId, setSelectedWordId] = useState<string>('');
    const [showBatchActions, setShowBatchActions] = useState(false);
    const sortMenuRef = useRef<HTMLDivElement>(null);

    // Dialog states
    const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
    const [showGroupSelectionDialog, setShowGroupSelectionDialog] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);

    useEffect(() => {
        loadWords();
        // Subscribe to changes
        const unsubscribe = WordStore.subscribe(() => {
            loadWords();
        });
        return () => unsubscribe();
    }, []);

    const loadWords = async () => {
        const list = await WordStore.getWords();
        setWords(list);
    };

    // 关闭排序菜单的点击外部处理
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
                setShowSortMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 过滤和排序
    const getFilteredAndSortedWords = () => {
        let filtered = words.filter(w => {
            if (!statusFilter) return true;
            if (statusFilter === 'new') return w.status === 'new';
            if (statusFilter === 'learning') {
                // "学习"显示所有已开始学习的单词（learning + reviewed）
                return w.status === 'learning' || w.status === 'reviewed';
            }
            if (statusFilter === 'reviewed') {
                // "已学习"显示已掌握的单词
                return w.status === 'mastered';
            }
            return w.status === statusFilter;
        });

        // 排序逻辑
        filtered.sort((a, b) => {
            let result = 0;
            switch (sortBy) {
                case 'alpha':
                    result = a.text.localeCompare(b.text);
                    break;
                case 'progress':
                    // 进度：形如 new < learning < reviewed < mastered
                    const progressOrder: Record<string, number> = { 'new': 0, 'learning': 1, 'reviewed': 2, 'mastered': 3 };
                    result = (progressOrder[a.status] || 0) - (progressOrder[b.status] || 0);
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
                case 'date':
                    result = b.addedAt - a.addedAt;
                    break;
                case 'frequency':
                    // 频率优先显示常用词（假设 reviewCount 代表频率）
                    result = (b.reviewCount || 0) - (a.reviewCount || 0);
                    break;
            }
            return sortAscending ? result : -result;
        });

        return filtered;
    };

    // 按日期分组
    const groupByDate = (wordsList: Word[]) => {
        const groups = new Map<string, Word[]>();
        wordsList.forEach(word => {
            const date = new Date(word.addedAt);
            const dateKey = `${date.getDate()} ${date.getMonth() + 1}月 ${date.getFullYear()}`;
            if (!groups.has(dateKey)) {
                groups.set(dateKey, []);
            }
            groups.get(dateKey)!.push(word);
        });
        return Array.from(groups.entries());
    };

    const filteredWords = getFilteredAndSortedWords();
    const groupedWords = sortBy === 'date' ? groupByDate(filteredWords) : [];

    // 多选操作
    const handleSelectAll = () => {
        setSelectedWordIds(new Set(filteredWords.map(w => w.id)));
    };

    const handleClearSelection = () => {
        setSelectedWordIds(new Set());
    };

    const toggleWordSelection = (wordId: string) => {
        const newSet = new Set(selectedWordIds);
        if (newSet.has(wordId)) {
            newSet.delete(wordId);
        } else {
            newSet.add(wordId);
        }
        setSelectedWordIds(newSet);
    };

    // 批量操作处理
    const handleBatchAction = async (action: 'train' | 'create-group' | 'add-to-group' | 'export' | 'delete') => {
        const ids = Array.from(selectedWordIds);

        switch (action) {
            case 'train':
                navigate(`/exercise/session/mixed?wordIds=${ids.join(',')}`);
                break;
            case 'create-group':
                setShowCreateGroupDialog(true);
                break;
            case 'add-to-group':
                setShowGroupSelectionDialog(true);
                break;
            case 'export':
                setShowExportMenu(true);
                break;
            case 'delete':
                if (confirm(`确定要删除 ${ids.length} 个单词吗？`)) {
                    await WordStore.deleteWords(ids);
                    await loadWords();
                    setSelectedWordIds(new Set());
                    setIsMultiSelectMode(false);
                }
                break;
        }
    };

    const handleCreateGroup = async (name: string, description?: string) => {
        const ids = Array.from(selectedWordIds);
        await GroupStore.createGroup(name, description, ids);
        setSelectedWordIds(new Set());
        setIsMultiSelectMode(false);
    };

    const handleAddToGroup = async (groupId: string) => {
        const ids = Array.from(selectedWordIds);
        await GroupStore.addWordsToGroup(groupId, ids);
        setSelectedWordIds(new Set());
        setIsMultiSelectMode(false);
    };

    const handleExport = async (format: 'json' | 'csv') => {
        const ids = Array.from(selectedWordIds);
        const exportWords = await WordStore.exportWords(ids);

        let content: string;
        let filename: string;
        let mimeType: string;

        if (format === 'json') {
            content = JSON.stringify(exportWords, null, 2);
            filename = `words_export_${Date.now()}.json`;
            mimeType = 'application/json';
        } else {
            content = WordStore.exportWordsAsCSV(exportWords);
            filename = `words_export_${Date.now()}.csv`;
            mimeType = 'text/csv';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        setShowExportMenu(false);
        setSelectedWordIds(new Set());
        setIsMultiSelectMode(false);
    };

    const statusTabs = [
        { value: 'new' as StatusFilter, label: '新的' },
        { value: 'learning' as StatusFilter, label: '学习' },
        { value: 'reviewed' as StatusFilter, label: '已学习' }
    ];

    const sortOptions = [
        { value: 'alpha' as SortBy, label: '字母顺序', icon: 'AB' },
        { value: 'progress' as SortBy, label: '进度', icon: null },
        { value: 'lastReview' as SortBy, label: '最后训练', icon: null },
        { value: 'nextReview' as SortBy, label: '下一次训练', icon: null },
        { value: 'repeatCount' as SortBy, label: '重复次数', icon: null },
        { value: 'date' as SortBy, label: '添加时间', icon: null },
        { value: 'frequency' as SortBy, label: '频率', icon: null }
    ];

    return (
        <>
            <div className="h-full overflow-y-auto custom-scrollbar bg-transparent pb-20">
                {/* Header */}
                <div className="bg-transparent px-4 pt-12 pb-4 sticky top-0 z-10">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate('/')}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/80"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-white tracking-tight">
                                    {isMultiSelectMode ? '多选模式' : '我的单词'}
                                </h1>
                                {isMultiSelectMode && selectedWordIds.size > 0 && (
                                    <p className="text-sm text-white/60 mt-0.5">
                                        已选词语 {selectedWordIds.size}
                                    </p>
                                )}
                            </div>
                        </div>
                        {!isMultiSelectMode && (
                            <button
                                onClick={() => setIsMultiSelectMode(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-300 hover:bg-white/10 rounded-lg transition-colors border border-blue-500/30 font-medium"
                            >
                                <CheckSquare size={16} />
                                <span>多选</span>
                            </button>
                        )}
                    </div>

                    {/* Status Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
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
                    <div className="flex items-center gap-2 mt-3 relative" ref={sortMenuRef}>
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
                            title={sortAscending ? '升序' : '降序'}
                        >
                            {sortAscending ? <ArrowDown size={16} className="text-white/40" /> : <ArrowUp size={16} className="text-white/40" />}
                        </button>

                        {/* Sort Dropdown Menu */}
                        {showSortMenu && (
                            <div className="absolute top-full left-0 mt-1 glass-card border border-white/10 py-2 z-30 min-w-[180px] backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-3 py-2 text-sm font-medium text-white/40">按照排序</div>
                                {sortOptions.map(option => (
                                    <button
                                        key={option.value}
                                        onClick={() => {
                                            setSortBy(option.value);
                                            setShowSortMenu(false);
                                        }}
                                        className={cn(
                                            "w-full px-3 py-2 text-left text-sm flex items-center gap-3 hover:bg-white/10 transition-colors",
                                            sortBy === option.value ? 'text-blue-300' : 'text-white/70'
                                        )}
                                    >
                                        {option.icon ? (
                                            <span className="w-5 text-center font-medium opacity-70">{option.icon}</span>
                                        ) : (
                                            <RefreshCw size={16} className="text-white/40" />
                                        )}
                                        <span>{option.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Multi-select controls */}
                    {isMultiSelectMode && (
                        <div className="glass-card mx-4 mt-2 px-4 py-2 flex items-center gap-3 border border-white/10 animate-fade-in-down">
                            <button
                                onClick={handleSelectAll}
                                className="text-sm text-blue-300 hover:text-white transition-colors"
                            >
                                全选
                            </button>
                            <div className="w-px h-4 bg-white/10" />
                            <button
                                onClick={handleClearSelection}
                                className="text-sm text-white/60 hover:text-white transition-colors"
                            >
                                清除选择
                            </button>
                        </div>
                    )}
                </div>

                {/* Word List */}
                <div className={cn(
                    "p-4 space-y-4",
                    isMultiSelectMode && selectedWordIds.size > 0 && "pb-80" // 为 BatchActionSheet 留出空间
                )}>
                    {sortBy === 'date' ? (
                        // 按日期分组显示
                        groupedWords.map(([date, dateWords]) => (
                            <div key={date} className="mb-6">
                                <div className="text-xs text-white/40 font-medium mb-2 px-2 uppercase tracking-widest">
                                    {date}
                                </div>
                                <div className="space-y-3">
                                    {dateWords.map((word) => (
                                        <div
                                            key={word.id}
                                            className={cn(
                                                "glass-card border border-white/5 p-4 flex items-center gap-3 transition-all duration-200 group active:scale-[0.98]",
                                                !isMultiSelectMode && "hover:border-white/20 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] cursor-pointer"
                                            )}
                                            onClick={() => {
                                                if (isMultiSelectMode) {
                                                    toggleWordSelection(word.id);
                                                } else {
                                                    setSelectedWordId(word.id);
                                                }
                                            }}
                                        >
                                            {isMultiSelectMode && (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedWordIds.has(word.id)}
                                                    onChange={() => toggleWordSelection(word.id)}
                                                    className="w-5 h-5 rounded border-white/30 text-blue-500 bg-white/5 focus:ring-blue-500/50"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-white text-lg group-hover:text-blue-300 transition-colors">{word.text}</div>
                                                <div className="text-sm text-white/60 mt-0.5 line-clamp-2 whitespace-pre-line group-hover:text-white/80 transition-colors">
                                                    {word.translation.replace(/\\n/g, '\n')}
                                                </div>
                                            </div>
                                            {!isMultiSelectMode && (
                                                <button className="p-2 hover:bg-white/10 rounded-lg text-white/20 group-hover:text-white/60 transition-colors">
                                                    <MoreVertical size={18} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        // 按字母排序显示（单列表）
                        <div className="space-y-3">
                            {filteredWords.map((word) => (
                                <div
                                    key={word.id}
                                    className={cn(
                                        "glass-card border border-white/5 p-4 flex items-center gap-3 transition-all duration-200 group active:scale-[0.98]",
                                        !isMultiSelectMode && "hover:border-white/20 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] cursor-pointer"
                                    )}
                                    onClick={() => {
                                        if (isMultiSelectMode) {
                                            toggleWordSelection(word.id);
                                        } else {
                                            setSelectedWordId(word.id);
                                        }
                                    }}
                                >
                                    {isMultiSelectMode && (
                                        <div className="relative flex items-center justify-center">
                                            <div className={cn(
                                                "w-5 h-5 rounded-md border transition-all flex items-center justify-center",
                                                selectedWordIds.has(word.id)
                                                    ? "bg-blue-500 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                                    : "border-white/30 bg-white/5"
                                            )}>
                                                {selectedWordIds.has(word.id) && <CheckSquare size={12} className="text-white" />}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-white text-lg group-hover:text-blue-300 transition-colors">{word.text}</div>
                                        <div className="text-sm text-white/60 mt-0.5 line-clamp-2 whitespace-pre-line group-hover:text-white/80 transition-colors">
                                            {word.translation.replace(/\\n/g, '\n')}
                                        </div>
                                    </div>
                                    {!isMultiSelectMode && (
                                        <button className="p-2 hover:bg-white/10 rounded-lg text-white/20 group-hover:text-white/60 transition-colors">
                                            <MoreVertical size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {filteredWords.length === 0 && (
                        <div className="text-center py-12 text-white/30">
                            暂无单词
                        </div>
                    )}
                </div>
            </div>

            {/* 多选模式底部固定按钮 */}
            {isMultiSelectMode && selectedWordIds.size > 0 && (
                <div className="fixed bottom-24 right-6 z-10 animate-in slide-in-from-bottom-4">
                    <button
                        onClick={() => setShowBatchActions(!showBatchActions)}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-full shadow-[0_0_20px_rgba(79,70,229,0.4)] border border-white/20 flex items-center justify-center gap-2 hover:scale-105 transition-all"
                    >
                        <div className="flex items-center gap-1">
                            <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                            <div className="w-1 h-1 bg-white rounded-full animate-pulse delay-75"></div>
                            <div className="w-1 h-1 bg-white rounded-full animate-pulse delay-150"></div>
                        </div>
                        <span className="text-sm font-bold whitespace-nowrap">已选择 {selectedWordIds.size} 个</span>
                    </button>
                </div>
            )}

            {/* Batch Action Sheet */}
            {showBatchActions && (
                <BatchActionSheet
                    selectedCount={selectedWordIds.size}
                    onAction={(action) => {
                        handleBatchAction(action);
                        setShowBatchActions(false);
                    }}
                />
            )}

            {/* Word Detail Popup */}
            {selectedWordId && !isMultiSelectMode && (
                <WordDetailPopup
                    wordId={selectedWordId}
                    onClose={() => setSelectedWordId('')}
                />
            )}

            {/* Create Group Dialog */}
            {showCreateGroupDialog && (
                <CreateGroupDialog
                    onClose={() => setShowCreateGroupDialog(false)}
                    onCreate={handleCreateGroup}
                />
            )}

            {/* Group Selection Dialog */}
            {showGroupSelectionDialog && (
                <GroupSelectionDialog
                    wordIds={Array.from(selectedWordIds)}
                    onClose={() => setShowGroupSelectionDialog(false)}
                    onSelect={handleAddToGroup}
                />
            )}

            {/* Export Menu */}
            {showExportMenu && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card rounded-2xl p-4 max-w-xs w-full shadow-2xl border border-white/10 animate-fade-in-up">
                        <h3 className="font-bold text-white mb-3">选择导出格式</h3>
                        <div className="space-y-2">
                            <button
                                onClick={() => handleExport('json')}
                                className="w-full p-3 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-xl font-medium hover:bg-blue-500/30 transition-colors"
                            >
                                JSON 格式
                            </button>
                            <button
                                onClick={() => handleExport('csv')}
                                className="w-full p-3 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl font-medium hover:bg-emerald-500/30 transition-colors"
                            >
                                CSV 格式
                            </button>
                            <button
                                onClick={() => setShowExportMenu(false)}
                                className="w-full p-3 border border-white/10 rounded-xl text-white/60 font-medium hover:bg-white/10 hover:text-white transition-colors"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default WordList;
