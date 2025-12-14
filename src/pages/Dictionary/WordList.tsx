import React, { useState, useEffect } from 'react';
import WordDetailPopup from '../../components/WordDetailPopup';
import { WordStore } from '../../services/WordStore';

// 简单的状态过滤选项
const statusOptions = [
    { value: '', label: '全部' },
    { value: 'new', label: '新词' },
    { value: 'learning', label: '学习中' },
    { value: 'reviewed', label: '已复习' },
    { value: 'mastered', label: '已掌握' },
];

const WordList: React.FC = () => {
    const [words, setWords] = useState([] as any[]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // 加载单词列表
    const loadWords = async () => {
        const list = await WordStore.getWords();
        setWords(list);
    };

    const [selectedWordId, setSelectedWordId] = useState<string>('');
    useEffect(() => {
        loadWords();
    }, []);

    // 过滤后的结果
    const filtered = words.filter((w) => {
        const matchesText = w.text.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter ? w.status === statusFilter : true;
        return matchesText && matchesStatus;
    });

    return (
        <>
            <div className="p-4 max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold mb-4">单词列表</h2>
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <input
                        type="text"
                        placeholder="搜索单词..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 p-2 border rounded"
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="p-2 border rounded"
                    >
                        {statusOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((word) => (
                        <div
                            key={word.id}
                            className="p-4 border rounded hover:shadow cursor-pointer"
                            onClick={() => setSelectedWordId(word.id)}
                        >
                            <div className="font-medium text-lg">{word.text}</div>
                            <div className="text-gray-600">{word.translation}</div>
                            <div className="text-sm mt-1">
                                状态: <span className="font-semibold">{word.status}</span>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <p className="col-span-full text-center text-gray-500">暂无匹配的单词</p>
                    )}
                </div>
            </div>
            {selectedWordId && (
                <WordDetailPopup wordId={selectedWordId} onClose={() => setSelectedWordId('')} />
            )}
        </>
    );
};

export default WordList;
