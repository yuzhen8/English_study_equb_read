import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, CheckSquare, SortAsc } from 'lucide-react';
import { cn } from '../../lib/utils';
import WordDetailPopup from '../../components/WordDetailPopup';
import BatchActionSheet from '../../components/Dictionary/BatchActionSheet';
import CreateGroupDialog from '../../components/Dictionary/CreateGroupDialog';
import GroupSelectionDialog from '../../components/Dictionary/GroupSelectionDialog';
import { WordStore, Word } from '../../services/WordStore';
import { GroupStore } from '../../services/GroupStore';

type StatusFilter = '' | 'new' | 'learning' | 'reviewed' | 'mastered';
type SortBy = 'date' | 'alpha';

const WordList: React.FC = () => {
    const navigate = useNavigate();
    const [words, setWords] = useState<Word[]>([]);
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
    const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
    const [sortBy, setSortBy] = useState<SortBy>('date');
    const [selectedWordId, setSelectedWordId] = useState<string>('');
    const [showBatchActions, setShowBatchActions] = useState(false); // 控制批量操作面板显示

    // Dialog states
    const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
    const [showGroupSelectionDialog, setShowGroupSelectionDialog] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);

    useEffect(() => {
        loadWords();
    }, []);

    const loadWords = async () => {
        const list = await WordStore.getWords();
        setWords(list);
    };

    // 过滤和排序
    const getFilteredAndSortedWords = () => {
        let filtered = words.filter(w => statusFilter ? w.status === statusFilter : true);

        if (sortBy === 'date') {
            filtered.sort((a, b) => b.addedAt - a.addedAt);
        } else {
            filtered.sort((a, b) => a.text.localeCompare(b.text));
        }

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
        { value: '' as StatusFilter, label: '全部' },
        { value: 'new' as StatusFilter, label: '新的' },
        { value: 'learning' as StatusFilter, label: '学习' },
        { value: 'reviewed' as StatusFilter, label: '已学习' }
    ];

    return (
        <>
            <div className="min-h-screen bg-gray-50 pb-20">
                {/* Header */}
                <div className="bg-white px-4 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate('/')}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {isMultiSelectMode ? '多选模式' : '我的单词'}
                                </h1>
                                {isMultiSelectMode && selectedWordIds.size > 0 && (
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        已选词语 {selectedWordIds.size}
                                    </p>
                                )}
                            </div>
                        </div>
                        {!isMultiSelectMode && (
                            <button
                                onClick={() => setIsMultiSelectMode(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                                <CheckSquare size={16} />
                                <span>多选</span>
                            </button>
                        )}
                    </div>

                    {/* Status Tabs */}
                    <div className="flex gap-4 overflow-x-auto pb-2">
                        {statusTabs.map(tab => (
                            <button
                                key={tab.value}
                                onClick={() => setStatusFilter(tab.value)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${statusFilter === tab.value
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Multi-select controls */}
                {isMultiSelectMode && (
                    <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-3">
                        <button
                            onClick={handleSelectAll}
                            className="text-sm text-blue-600 hover:underline"
                        >
                            全选
                        </button>
                        <div className="w-px h-4 bg-gray-300" />
                        <button
                            onClick={handleClearSelection}
                            className="text-sm text-gray-600 hover:underline"
                        >
                            清除选择
                        </button>
                    </div>
                )}

                {/* Word List */}
                <div className={cn(
                    "p-4",
                    isMultiSelectMode && selectedWordIds.size > 0 && "pb-80" // 为 BatchActionSheet 留出空间
                )}>
                    {sortBy === 'date' ? (
                        // 按日期分组显示
                        groupedWords.map(([date, dateWords]) => (
                            <div key={date} className="mb-6">
                                <div className="text-xs text-gray-400 font-medium mb-2 px-2">
                                    {date}
                                </div>
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    {dateWords.map((word, index) => (
                                        <React.Fragment key={word.id}>
                                            <div
                                                className={`flex items-center gap-3 p-4 ${!isMultiSelectMode ? 'cursor-pointer hover:bg-gray-50' : ''
                                                    } transition-colors`}
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
                                                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-gray-900">{word.text}</div>
                                                    <div className="text-sm text-gray-500 mt-0.5 truncate">
                                                        {word.translation}
                                                    </div>
                                                </div>
                                                {!isMultiSelectMode && (
                                                    <button className="p-1 hover:bg-gray-100 rounded-lg">
                                                        <MoreVertical size={18} className="text-gray-400" />
                                                    </button>
                                                )}
                                            </div>
                                            {index < dateWords.length - 1 && (
                                                <div className="h-px bg-gray-100 mx-4" />
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        // 按字母排序显示（单列表）
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            {filteredWords.map((word, index) => (
                                <React.Fragment key={word.id}>
                                    <div
                                        className={`flex items-center gap-3 p-4 ${!isMultiSelectMode ? 'cursor-pointer hover:bg-gray-50' : ''
                                            } transition-colors`}
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
                                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-900">{word.text}</div>
                                            <div className="text-sm text-gray-500 mt-0.5 truncate">
                                                {word.translation}
                                            </div>
                                        </div>
                                        {!isMultiSelectMode && (
                                            <button className="p-1 hover:bg-gray-100 rounded-lg">
                                                <MoreVertical size={18} className="text-gray-400" />
                                            </button>
                                        )}
                                    </div>
                                    {index < filteredWords.length - 1 && (
                                        <div className="h-px bg-gray-100 mx-4" />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    {filteredWords.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            暂无单词
                        </div>
                    )}
                </div>
            </div>

            {/* 多选模式底部固定按钮 */}
            {isMultiSelectMode && selectedWordIds.size > 0 && (
                <div className="fixed bottom-24 right-6 z-10">
                    <button
                        onClick={() => setShowBatchActions(!showBatchActions)}
                        className="bg-gray-900 text-white px-5 py-3 rounded-full shadow-lg flex items-center justify-center gap-2 hover:bg-black transition-colors"
                    >
                        <div className="flex items-center gap-1">
                            <div className="w-1 h-1 bg-white rounded-full"></div>
                            <div className="w-1 h-1 bg-white rounded-full"></div>
                            <div className="w-1 h-1 bg-white rounded-full"></div>
                        </div>
                        <span className="text-sm font-medium whitespace-nowrap">已选择 {selectedWordIds.size} 个中的 {filteredWords.length} 个</span>
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-4 max-w-xs w-full shadow-2xl">
                        <h3 className="font-bold text-gray-900 mb-3">选择导出格式</h3>
                        <div className="space-y-2">
                            <button
                                onClick={() => handleExport('json')}
                                className="w-full p-3 bg-blue-50 text-blue-600 rounded-xl font-medium hover:bg-blue-100 transition-colors"
                            >
                                JSON 格式
                            </button>
                            <button
                                onClick={() => handleExport('csv')}
                                className="w-full p-3 bg-green-50 text-green-600 rounded-xl font-medium hover:bg-green-100 transition-colors"
                            >
                                CSV 格式
                            </button>
                            <button
                                onClick={() => setShowExportMenu(false)}
                                className="w-full p-3 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
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
