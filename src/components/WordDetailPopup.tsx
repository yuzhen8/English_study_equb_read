import React, { useEffect, useState } from 'react';
import { X, ChevronDown, ChevronUp, Search, Info } from 'lucide-react';
import { WordStore, Word } from '../services/WordStore';
import { hybridDictionary, DictionaryResult } from '../services/DictionaryService';

import AudioPlayer from './AudioPlayer';
import { cn } from '../lib/utils';

interface WordDetailPopupProps {
    wordId?: string;
    initialData?: {
        text: string;
        context?: string;
    };
    onClose: () => void;
}

const WordDetailPopup: React.FC<WordDetailPopupProps> = ({ wordId, initialData, onClose }) => {
    const [dictionaryResult, setDictionaryResult] = useState<DictionaryResult | null>(null);
    const [savedWord, setSavedWord] = useState<Word | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [expandedSections, setExpandedSections] = useState<{
        ai: boolean;
        examples: boolean;
    }>({ ai: false, examples: false });
    const [audioUrl, setAudioUrl] = useState<string>('');
    const [searchInput, setSearchInput] = useState<string>('');
    const [showSearch, setShowSearch] = useState<boolean>(false);
    const [showSources, setShowSources] = useState<boolean>(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                let wordText = '';

                // Determine word text and context
                if (wordId) {
                    const w = await WordStore.getWord(wordId);
                    if (w) {
                        wordText = w.text;
                        setSavedWord(w);
                    }
                } else if (initialData) {
                    wordText = initialData.text;
                    // Check if word already exists in DB
                    const allWords = await WordStore.getWords();
                    const existing = allWords.find(w => w.text.toLowerCase() === wordText.toLowerCase());
                    if (existing) {
                        setSavedWord(existing);
                    }
                } else {
                    // No wordId or initialData - show search input
                    setShowSearch(true);
                    setLoading(false);
                    return;
                }

                if (wordText) {
                    // 1. Query Local Dictionary (Fast)
                    const localResult = await hybridDictionary.queryLocal(wordText);
                    if (localResult) {
                        setDictionaryResult(localResult);
                        setLoading(false); // Stop loading immediately if local found
                    }

                    // 2. Query Online Dictionary (Async Update)
                    hybridDictionary.queryOnline(wordText).then(onlineResult => {
                        if (onlineResult) {
                            setDictionaryResult(prev => {
                                if (!prev) return onlineResult;
                                return hybridDictionary.mergeResults(prev, onlineResult);
                            });

                            // Audio cache is handled inside queryOnline, but we need to update URL if available
                            if (onlineResult.phonetics.length > 0) {
                                const audioPhonetic = onlineResult.phonetics.find(p => p.audio);
                                if (audioPhonetic && audioPhonetic.audio) {
                                    hybridDictionary.getAudioUrl(wordText, audioPhonetic.audio)
                                        .then(url => setAudioUrl(url))
                                        .catch(err => console.warn('Failed to load audio:', err));
                                }
                            }
                        }
                    }).catch(err => console.warn('Online query failed', err));

                    // If no local result, keep loading true until online finishes (or handle via empty state)
                    if (!localResult) {
                        // If no local, we must wait for online or at least show loading
                        // We do nothing here, let the promise chain handle it or user sees loading
                    }
                }
            } catch (e) {
                console.error("Failed to load word details", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [wordId, initialData]);

    const handleAdd = async () => {
        if (!dictionaryResult) return;
        try {
            const translation = dictionaryResult.translations?.[0] ||
                dictionaryResult.meanings[0]?.definitions[0]?.definition ||
                '';
            const context = initialData?.context || '';
            const newWord = await WordStore.addWord(
                dictionaryResult.word,
                translation,
                context
            );
            setSavedWord(newWord);
        } catch (e) {
            console.error("Failed to add word", e);
        }
    };

    const handleRemove = async () => {
        if (!savedWord) return;
        try {
            await WordStore.deleteWord(savedWord.id);
            setSavedWord(null);
        } catch (e) {
            console.error("Failed to remove word", e);
        }
    };

    const toggleSection = (section: 'ai' | 'examples') => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleSearch = async () => {
        if (!searchInput.trim()) return;
        setShowSearch(false);
        setLoading(true);
        try {
            const wordText = searchInput.trim();
            // Check if word already exists in DB
            const allWords = await WordStore.getWords();
            const existing = allWords.find(w => w.text.toLowerCase() === wordText.toLowerCase());
            if (existing) {
                setSavedWord(existing);
            }

            // 1. Query Local (Fast)
            const localResult = await hybridDictionary.queryLocal(wordText);
            if (localResult) {
                setDictionaryResult(localResult);
                setLoading(false);
            }

            // 2. Query Online (Async)
            hybridDictionary.queryOnline(wordText).then(onlineResult => {
                if (onlineResult) {
                    setDictionaryResult(prev => {
                        if (!prev) return onlineResult;
                        return hybridDictionary.mergeResults(prev, onlineResult);
                    });
                    // Audio
                    if (onlineResult.phonetics.length > 0) {
                        const audioPhonetic = onlineResult.phonetics.find(p => p.audio);
                        if (audioPhonetic && audioPhonetic.audio) {
                            hybridDictionary.getAudioUrl(wordText, audioPhonetic.audio)
                                .then(url => setAudioUrl(url))
                                .catch(console.warn);
                        }
                    }
                }
            });
        } catch (e) {
            console.error("Failed to search word", e);
        } finally {
            setLoading(false);
        }
    };

    if (showSearch) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50" onClick={onClose}>
                <div
                    className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900">添加单词</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="输入单词..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                        />
                        <button
                            onClick={handleSearch}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <Search size={18} />
                            <span>搜索</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50" onClick={onClose}>
                <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                    <div className="text-center">加载中...</div>
                </div>
            </div>
        );
    }

    if (!dictionaryResult) return null;

    const formatDate = (ts: number) => new Date(ts).toLocaleString();
    const isSaved = savedWord !== null;

    // Get primary phonetic text
    const primaryPhonetic = dictionaryResult.phonetics.find(p => p.text)?.text || '';

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            {/* Click outside handler - transparent layer */}
            <div
                className="absolute inset-0 bg-transparent pointer-events-auto"
                onClick={onClose}
            />

            <div
                className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col relative pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex-shrink-0">
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                        <button
                            onClick={() => setShowSources(!showSources)}
                            className={cn(
                                "p-1 rounded-full transition-colors",
                                showSources ? "text-blue-600 bg-blue-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            )}
                            title="显示/隐藏数据来源"
                        >
                            <Info size={20} />
                        </button>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="pr-20">
                        <div className="flex items-center gap-2 mb-2">
                            <h2 className="text-3xl font-bold text-gray-900">{dictionaryResult.word}</h2>
                            {showSources && dictionaryResult.source.local && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded border border-gray-200">{dictionaryResult.source.local}</span>
                            )}
                        </div>
                        {/* Lemma / Prototype */}
                        {dictionaryResult.lemma && dictionaryResult.lemma.toLowerCase() !== dictionaryResult.word.toLowerCase() && (
                            <p className="text-sm text-gray-500 mb-2">
                                原型: <span className="font-semibold text-blue-600">{dictionaryResult.lemma}</span>
                            </p>
                        )}

                        <div className="flex items-center gap-3 mb-3">
                            {primaryPhonetic && (
                                <div className="flex items-center gap-1">
                                    <span className="text-gray-600 text-lg">/{primaryPhonetic}/</span>
                                    {showSources && dictionaryResult.source.online && (
                                        <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded border border-green-100">{dictionaryResult.source.online}</span>
                                    )}
                                </div>
                            )}
                            {audioUrl && (
                                <AudioPlayer src={audioUrl} />
                            )}
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2">
                            {dictionaryResult.meanings.map((m, idx) => (
                                <span
                                    key={idx}
                                    className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full"
                                >
                                    {m.partOfSpeech}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Context Section */}
                    {(initialData?.context || savedWord?.context) && (
                        <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                            <p className="text-sm text-gray-500 font-bold uppercase tracking-wide mb-1">上下文</p>
                            <p className="text-gray-900 italic leading-relaxed">{initialData?.context || savedWord?.context}</p>
                        </div>
                    )}

                    {/* Basic Translation */}
                    {dictionaryResult.translations && dictionaryResult.translations.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <p className="text-sm text-gray-500 font-bold uppercase tracking-wide">中文释义</p>
                                {showSources && dictionaryResult.source.local && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded border border-gray-200">{dictionaryResult.source.local}</span>
                                )}
                            </div>
                            <p className="text-gray-900 text-lg leading-relaxed">{dictionaryResult.translations[0]}</p>
                        </div>
                    )}

                    {/* Meanings from Online Dictionary */}
                    {dictionaryResult.meanings.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <p className="text-sm text-gray-500 font-bold uppercase tracking-wide">英文释义</p>
                                {showSources && dictionaryResult.source.online && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded border border-green-100">{dictionaryResult.source.online}</span>
                                )}
                            </div>
                            {/* Limit to 2 meanings */}
                            {dictionaryResult.meanings.slice(0, 2).map((meaning, idx) => (
                                <div key={idx} className="mb-4 last:mb-0">
                                    <span className="text-sm font-semibold text-blue-600 italic">
                                        {meaning.partOfSpeech}
                                    </span>
                                    <ul className="mt-2 space-y-2">
                                        {/* Limit definitions to 3 per meaning */}
                                        {meaning.definitions.slice(0, 3).map((def, defIdx) => (
                                            <li key={defIdx} className="text-gray-900">
                                                <span className="text-gray-700">{def.definition}</span>
                                                {def.example && (
                                                    <p className="text-gray-500 italic text-sm mt-1 ml-4 border-l-2 border-gray-200 pl-2">
                                                        "{def.example}"
                                                    </p>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Expandable Examples Section */}
                    {dictionaryResult.meanings.some(m => m.definitions.some(d => d.example)) && (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggleSection('examples')}
                                className="w-full p-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                                <span className="text-sm font-medium text-gray-700">更多例句</span>
                                {expandedSections.examples ? (
                                    <ChevronUp size={18} className="text-gray-500" />
                                ) : (
                                    <ChevronDown size={18} className="text-gray-500" />
                                )}
                            </button>
                            {expandedSections.examples && (
                                <div className="p-4 space-y-3">
                                    {dictionaryResult.meanings.map((meaning, idx) =>
                                        meaning.definitions
                                            .filter(def => def.example)
                                            .map((def, defIdx) => (
                                                <div key={`${idx}-${defIdx}`} className="text-sm">
                                                    <p className="text-gray-700 italic">"{def.example}"</p>
                                                    <p className="text-gray-500 mt-1">{def.definition}</p>
                                                </div>
                                            ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* AI Section (Collapsible) */}
                    {dictionaryResult.source.ai && (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggleSection('ai')}
                                className="w-full p-3 flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700">AI 深度解析</span>
                                    {showSources && (
                                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded border border-purple-100">AI</span>
                                    )}
                                </div>
                                {expandedSections.ai ? (
                                    <ChevronUp size={18} className="text-gray-500" />
                                ) : (
                                    <ChevronDown size={18} className="text-gray-500" />
                                )}
                            </button>
                            {expandedSections.ai && (
                                <div className="p-4 text-gray-700 text-sm">
                                    <p>AI 翻译和词源解释功能正在开发中...</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Source Indicators */}
                    <div className="flex gap-2 text-xs text-gray-400 pt-2 border-t border-gray-50 mt-2">
                        {dictionaryResult.source.local && (
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{dictionaryResult.source.local}</span>
                        )}
                        {dictionaryResult.source.online && (
                            <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded">{dictionaryResult.source.online}</span>
                        )}
                        {dictionaryResult.source.ai && (
                            <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded">{dictionaryResult.source.ai}</span>
                        )}
                    </div>
                </div>

                {/* Footer (Fixed) */}
                <div className="p-6 border-t border-gray-100 flex-shrink-0">
                    {isSaved ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">状态</span>
                                <span className={cn(
                                    "px-3 py-1 text-xs font-semibold rounded-full uppercase",
                                    savedWord.status === 'new' && "bg-blue-100 text-blue-800",
                                    savedWord.status === 'learning' && "bg-yellow-100 text-yellow-800",
                                    savedWord.status === 'reviewed' && "bg-green-100 text-green-800",
                                    savedWord.status === 'mastered' && "bg-purple-100 text-purple-800"
                                )}>
                                    {savedWord.status}
                                </span>
                            </div>
                            {savedWord.addedAt && (
                                <p className="text-xs text-gray-500 text-right">
                                    添加于 {formatDate(savedWord.addedAt)}
                                </p>
                            )}
                            <button
                                onClick={handleRemove}
                                className="w-full bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                                从生词本移除
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleAdd}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-md transition-colors flex items-center justify-center gap-2"
                        >
                            <span>+ 添加到生词本</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WordDetailPopup;
