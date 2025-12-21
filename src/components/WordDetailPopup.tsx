import React, { useEffect, useState } from 'react';
import { X, ChevronDown, ChevronUp, Search, Info, BookOpen, Sparkles, Globe, Book, BrainCircuit } from 'lucide-react';
import { WordStore, type Word } from '../services/WordStore';
import { GroupStore } from '../services/GroupStore';
import { hybridDictionary, type DictionaryResult } from '../services/DictionaryService';
import AudioPlayer from './AudioPlayer';
import { cn } from '../lib/utils';

interface WordDetailPopupProps {
    wordId?: string;
    initialData?: {
        text: string;
        context?: string;
    };
    groupId?: string; // 如果指定，添加单词后会同时添加到该群组
    onClose: () => void;
}

// 统一的 Section 组件，支持折叠功能和来源显示
const DetailSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    colorClass: string; // e.g., "bg-blue-500"
    children: React.ReactNode;
    collapsible?: boolean;
    defaultOpen?: boolean;
    source?: string; // 来源文本
    showSource?: boolean; // 控制是否显示来源
}> = ({ title, icon, colorClass, children, collapsible = false, defaultOpen = true, source, showSource = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="relative pl-5">
            {/* 左侧装饰线 - 根据折叠状态调整高度 */}
            <div
                className={cn(
                    "absolute left-0 top-1 w-1 rounded-full opacity-60 transition-all duration-300",
                    colorClass,
                    isOpen ? "bottom-1" : "h-4"
                )}
            />

            {/* 标题 - 可点击折叠 */}
            <div
                className={cn(
                    "flex items-center justify-between mb-1.5 select-none transition-colors h-6",
                    collapsible && "cursor-pointer hover:text-gray-600"
                )}
                onClick={() => collapsible && setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        {icon} {title}
                    </span>
                    {/* 根据 showSource 属性决定是否显示来源徽章 */}
                    {showSource && source && (
                        <span className="px-1.5 py-[1px] rounded-[4px] text-[9px] leading-none font-medium bg-gray-100 text-gray-500 border border-gray-200 animate-in fade-in zoom-in duration-200 ml-1">
                            {source}
                        </span>
                    )}
                </div>

                {collapsible && (
                    <span className="text-gray-400">
                        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                )}
            </div>

            {/* 内容 */}
            {(!collapsible || isOpen) && (
                <div className="text-sm text-gray-800 leading-relaxed animate-in slide-in-from-top-1 fade-in duration-200">
                    {children}
                </div>
            )}
        </div>
    );
};

const WordDetailPopup: React.FC<WordDetailPopupProps> = ({ wordId, initialData, groupId, onClose }) => {
    const [dictionaryResult, setDictionaryResult] = useState<DictionaryResult | null>(null);
    const [savedWord, setSavedWord] = useState<Word | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    const [audioUrl, setAudioUrl] = useState<string>('');
    const [searchInput, setSearchInput] = useState<string>('');
    const [showSearch, setShowSearch] = useState<boolean>(false);

    // 控制是否全局显示来源标签 (默认开启)
    const [showSources, setShowSources] = useState<boolean>(true);

    // 加载数据逻辑
    useEffect(() => {
        let isMounted = true;

        const load = async () => {
            setLoading(true);
            try {
                let wordText = '';

                // 1. 确定查询文本
                if (wordId) {
                    const w = await WordStore.getWord(wordId);
                    if (isMounted && w) {
                        wordText = w.text;
                        setSavedWord(w);
                    }
                } else if (initialData) {
                    wordText = initialData.text;
                    const allWords = await WordStore.getWords();
                    const existing = allWords.find(w => w.text.toLowerCase() === wordText.toLowerCase());
                    if (isMounted && existing) {
                        setSavedWord(existing);
                    }
                } else {
                    // 无参数时显示搜索框
                    if (isMounted) {
                        setShowSearch(true);
                        setLoading(false);
                    }
                    return;
                }

                if (!wordText) {
                    if (isMounted) setLoading(false);
                    return;
                }

                // 2. 执行查询 (本地优先策略)
                const localResult = await hybridDictionary.queryLocal(wordText);

                if (!isMounted) return;

                if (localResult) {
                    // A. 本地命中：立即显示，后台更新
                    setDictionaryResult(localResult);
                    setLoading(false);

                    hybridDictionary.queryOnline(wordText).then(onlineResult => {
                        if (isMounted && onlineResult) {
                            setDictionaryResult(prev => {
                                if (!prev) return onlineResult;
                                return hybridDictionary.mergeResults(prev, onlineResult);
                            });
                            // 音频处理
                            if (onlineResult.phonetics.length > 0) {
                                const audioPhonetic = onlineResult.phonetics.find(p => p.audio);
                                if (audioPhonetic && audioPhonetic.audio) {
                                    hybridDictionary.getAudioUrl(wordText, audioPhonetic.audio)
                                        .then(url => { if (isMounted) setAudioUrl(url); })
                                        .catch(console.warn);
                                }
                            }
                        }
                    }).catch(err => console.warn('Background online query failed', err));
                } else {
                    // B. 本地未命中：等待在线结果
                    try {
                        const onlineResult = await hybridDictionary.queryOnline(wordText);
                        if (isMounted && onlineResult) {
                            setDictionaryResult(onlineResult);
                            if (onlineResult.phonetics.length > 0) {
                                const audioPhonetic = onlineResult.phonetics.find(p => p.audio);
                                if (audioPhonetic && audioPhonetic.audio) {
                                    hybridDictionary.getAudioUrl(wordText, audioPhonetic.audio)
                                        .then(url => { if (isMounted) setAudioUrl(url); })
                                        .catch(console.warn);
                                }
                            }
                        }
                    } catch (err) {
                        console.warn('Online query failed', err);
                    } finally {
                        if (isMounted) setLoading(false);
                    }
                }

            } catch (e) {
                console.error("Failed to load word details", e);
                if (isMounted) setLoading(false);
            }
        };

        load();
        return () => { isMounted = false; };
    }, [wordId, initialData]);

    const handleAdd = async () => {
        console.log('[WordDetailPopup] handleAdd called');
        console.log('[WordDetailPopup] dictionaryResult:', dictionaryResult);
        console.log('[WordDetailPopup] initialData:', initialData);
        console.log('[WordDetailPopup] savedWord:', savedWord);

        try {
            // 确定单词文本和上下文
            // 优先使用原型 (Lemma) 作为单词本的主词条
            let wordText = dictionaryResult?.word || initialData?.text || '';
            const lemma = dictionaryResult?.lemma;
            if (lemma && lemma.toLowerCase() !== wordText.toLowerCase()) {
                console.log(`[WordDetailPopup] Using lemma '${lemma}' instead of '${wordText}'`);
                wordText = lemma;
            }

            const context = initialData?.context || savedWord?.context || '';

            console.log('[WordDetailPopup] wordText:', wordText);
            console.log('[WordDetailPopup] context:', context);

            if (!wordText) {
                console.error('[WordDetailPopup] No word text available');
                return;
            }

            // 获取翻译
            let translation = '';

            // 如果切换到了原型，需要重新查询原型的释义
            if (lemma && lemma.toLowerCase() !== (dictionaryResult?.word || '').toLowerCase()) {
                console.log(`[WordDetailPopup] Fetching definition for lemma: ${lemma}`);
                try {
                    const lemmaResult = await hybridDictionary.queryLocal(lemma);
                    if (lemmaResult) {
                        translation = lemmaResult.translations?.[0] ||
                            lemmaResult.meanings[0]?.definitions[0]?.definition || '';
                    } else {
                        // 如果本地查不到，尝试在线查询（虽然 queryLocal 通常包含大部分基础词）
                        const onlineResult = await hybridDictionary.queryOnline(lemma);
                        if (onlineResult) {
                            translation = onlineResult.translations?.[0] || ''; // Online result usually doesn't have translations array populated like local, need verifying structure if using online
                            // Hack: For online results, we might not get Chinese immediately if not utilizing a translation service
                        }
                    }
                } catch (err) {
                    console.warn('[WordDetailPopup] Failed to fetch lemma definition', err);
                }
            }

            // 如果上面没获取到（或者没切换原型），还是用原来的逻辑兜底
            if (!translation && dictionaryResult) {
                // 优先使用简明释义，没有则使用第一条详细释义
                translation = dictionaryResult.translations?.[0] ||
                    dictionaryResult.meanings[0]?.definitions[0]?.definition || '';
            }

            // 如果没有翻译，使用占位符（后续可以手动编辑）
            if (!translation) {
                translation = '(待翻译)';
            }

            console.log('[WordDetailPopup] translation:', translation);
            console.log('[WordDetailPopup] Calling WordStore.addWord...');

            const newWord = await WordStore.addWord(
                wordText,
                translation,
                context,
                undefined, // sourceBookId
                dictionaryResult?.lemma // Base form of the word
            );

            console.log('[WordDetailPopup] Word added successfully:', newWord);

            // 如果指定了群组ID，将单词添加到群组
            if (groupId) {
                await GroupStore.addWordsToGroup(groupId, [newWord.id]);
                console.log('[WordDetailPopup] Word added to group:', groupId);
            }

            setSavedWord(newWord);
        } catch (e) {
            console.error("[WordDetailPopup] Failed to add word", e);
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

    const handleSearch = async () => {
        if (!searchInput.trim()) return;
        setShowSearch(false);
        setLoading(true);
        setSavedWord(null);
        setAudioUrl('');
        setDictionaryResult(null);

        try {
            const wordText = searchInput.trim();
            // 检查是否已存在
            const allWords = await WordStore.getWords();
            const existing = allWords.find(w => w.text.toLowerCase() === wordText.toLowerCase());
            if (existing) setSavedWord(existing);

            // 复用查询逻辑 (简化版)
            const localResult = await hybridDictionary.queryLocal(wordText);
            if (localResult) {
                setDictionaryResult(localResult);
                setLoading(false);
                hybridDictionary.queryOnline(wordText).then(onlineResult => {
                    if (onlineResult) {
                        setDictionaryResult(prev => prev ? hybridDictionary.mergeResults(prev, onlineResult) : onlineResult);
                        const audio = onlineResult.phonetics.find(p => p.audio)?.audio;
                        if (audio) hybridDictionary.getAudioUrl(wordText, audio).then(setAudioUrl);
                    }
                });
            } else {
                const onlineResult = await hybridDictionary.queryOnline(wordText);
                if (onlineResult) {
                    setDictionaryResult(onlineResult);
                    const audio = onlineResult.phonetics.find(p => p.audio)?.audio;
                    if (audio) hybridDictionary.getAudioUrl(wordText, audio).then(setAudioUrl);
                }
                setLoading(false);
            }
        } catch (e) {
            console.error("Failed to search word", e);
            setLoading(false);
        }
    };

    // 搜索视图
    if (showSearch) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 animate-in fade-in duration-200" onClick={onClose}>
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900">查找单词</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="输入想要查询的单词..."
                            className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-lg"
                            autoFocus
                        />
                        <button onClick={handleSearch} className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <Search size={20} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Loading 视图
    if (loading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-black/20 z-50" onClick={onClose}>
                <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center gap-3 animate-in zoom-in-95">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="text-gray-500 font-medium">正在查询...</span>
                </div>
            </div>
        );
    }

    // 未找到结果视图
    if (!dictionaryResult) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-black/20 z-50" onClick={onClose}>
                <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center gap-4 animate-in zoom-in-95 max-w-sm text-center">
                    <div className="p-3 bg-gray-100 rounded-full text-gray-400">
                        <Search size={32} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">未找到单词</h3>
                        <p className="text-gray-500 mt-1">抱歉，无法找到该单词的释义。</p>
                    </div>
                    <button onClick={onClose} className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-black transition-colors">
                        关闭
                    </button>
                </div>
            </div>
        );
    }

    const handleJumpToWord = async (targetWord: string) => {
        if (!targetWord) return;
        setLoading(true);
        setSavedWord(null);
        setAudioUrl('');
        setDictionaryResult(null);

        try {
            // Check if word exists in store
            const allWords = await WordStore.getWords();
            const existing = allWords.find(w => w.text.toLowerCase() === targetWord.toLowerCase());
            if (existing) setSavedWord(existing);

            // Query dictionary
            const localResult = await hybridDictionary.queryLocal(targetWord);
            if (localResult) {
                setDictionaryResult(localResult);
                setLoading(false);
                hybridDictionary.queryOnline(targetWord).then(onlineResult => {
                    if (onlineResult) {
                        setDictionaryResult(prev => prev ? hybridDictionary.mergeResults(prev, onlineResult) : onlineResult);
                        const audio = onlineResult.phonetics.find(p => p.audio)?.audio;
                        if (audio) hybridDictionary.getAudioUrl(targetWord, audio).then(setAudioUrl);
                    }
                });
            } else {
                const onlineResult = await hybridDictionary.queryOnline(targetWord);
                if (onlineResult) {
                    setDictionaryResult(onlineResult);
                    const audio = onlineResult.phonetics.find(p => p.audio)?.audio;
                    if (audio) hybridDictionary.getAudioUrl(targetWord, audio).then(setAudioUrl);
                }
                setLoading(false);
            }
        } catch (e) {
            console.error("Failed to jump to word", e);
            setLoading(false);
        }
    };

    const primaryPhonetic = dictionaryResult.phonetics.find(p => p.text)?.text || '';

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50" onClick={onClose}>
            {/* 卡片主体 */}
            <div
                className="bg-white rounded-2xl shadow-2xl border border-gray-200/80 w-full max-w-xl mx-4 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()} // 阻止卡片内的点击事件冒泡到父元素
            >
                {/* 1. 头部区域 */}
                <div className="px-6 pt-6 pb-4 border-b border-gray-100 bg-white rounded-t-2xl z-10">
                    <div className="flex justify-between items-start mb-1">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-none">
                                {dictionaryResult.word}
                            </h2>
                            {dictionaryResult.lemma && dictionaryResult.lemma.toLowerCase() !== dictionaryResult.word.toLowerCase() && (
                                <button
                                    onClick={() => handleJumpToWord(dictionaryResult.lemma!)}
                                    className="text-xs text-blue-500 hover:text-blue-700 font-medium mt-1 text-left bg-blue-50/50 hover:bg-blue-100 px-2 py-0.5 rounded transition-colors w-fit flex items-center gap-1"
                                    title="跳转到原型详情"
                                >
                                    原型: {dictionaryResult.lemma} <span className="text-[10px] opacity-60">↗</span>
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* 来源切换按钮 */}
                            <button
                                onClick={() => setShowSources(!showSources)}
                                className={cn(
                                    "p-2 rounded-full transition-all duration-200",
                                    showSources ? "text-blue-600 bg-blue-50" : "text-gray-300 hover:text-gray-500 hover:bg-gray-50"
                                )}
                                title={showSources ? "隐藏来源" : "显示来源"}
                            >
                                <Info size={18} strokeWidth={2.5} />
                            </button>

                            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                        {primaryPhonetic && (
                            <span className="font-mono text-gray-500 text-sm bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                /{primaryPhonetic}/
                            </span>
                        )}
                        {/* 使用频率显示 - 放在音频左边 */}
                        {dictionaryResult.frequency && (
                            <span className="px-2 py-1 text-xs font-medium bg-amber-50 text-amber-700 rounded-md border border-amber-100">
                                频率: {dictionaryResult.frequency}
                            </span>
                        )}
                        {/* 音频播放 - 支持TTS回退 */}
                        <div className="scale-90 origin-left">
                            <AudioPlayer src={audioUrl || undefined} word={dictionaryResult?.word} />
                        </div>
                        {/* 如果有reviewCount显示复习次数 */}
                        {savedWord?.reviewCount && savedWord.reviewCount > 0 && (
                            <span className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded-md border border-blue-100">
                                已复习 {savedWord.reviewCount} 次
                            </span>
                        )}
                    </div>
                </div>

                {/* 2. 内容区域 */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">

                    {/* 中文释义 */}
                    {dictionaryResult.translations && dictionaryResult.translations.length > 0 && (
                        <DetailSection
                            title="中文释义"
                            icon={<Globe size={14} />}
                            colorClass="bg-green-500"
                            source={dictionaryResult.source.local || undefined}
                            showSource={showSources}
                        >
                            <p className="font-medium text-gray-900 leading-relaxed whitespace-pre-line">
                                {dictionaryResult.translations.join('；').replace(/\\n/g, '\n')}
                            </p>
                        </DetailSection>
                    )}

                    {/* 英文释义 */}
                    {dictionaryResult.meanings.length > 0 && (
                        <DetailSection
                            title="英文释义"
                            icon={<Book size={14} />}
                            colorClass="bg-purple-500"
                            collapsible={true}
                            defaultOpen={false}
                            source={dictionaryResult.source.online || undefined}
                            showSource={showSources}
                        >
                            <div className="space-y-3">
                                {dictionaryResult.meanings.map((meaning, idx) => (
                                    <div key={idx} className="group">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded italic font-serif">
                                                {meaning.partOfSpeech}
                                            </span>
                                        </div>
                                        <ul className="space-y-2">
                                            {meaning.definitions.slice(0, 3).map((def, defIdx) => (
                                                <li key={defIdx} className="text-sm">
                                                    <span className="text-gray-900 block">
                                                        <span className="text-gray-400 font-medium mr-1.5">{defIdx + 1}.</span>
                                                        {def.definition}
                                                    </span>
                                                    {def.example && (
                                                        <span className="text-gray-500 block pl-5 mt-1 text-xs italic border-l-2 border-gray-100">
                                                            "{def.example}"
                                                        </span>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </DetailSection>
                    )}

                    {/* 原句 */}
                    {(initialData?.context || savedWord?.context) && (
                        <DetailSection
                            title="原句"
                            icon={<BookOpen size={14} />}
                            colorClass="bg-blue-500"
                            collapsible={true}
                            defaultOpen={false}
                            source="Context"
                            showSource={showSources}
                        >
                            <p className="italic text-gray-700 bg-blue-50/50 p-3 rounded-lg border border-blue-50/50 text-sm leading-relaxed">
                                "{initialData?.context || savedWord?.context}"
                            </p>
                            {/* 已加入词典时显示加入时间 */}
                            {savedWord && (
                                <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                                    <span>加入词典时间:</span>
                                    <span className="font-medium">
                                        {new Date(savedWord.addedAt).toLocaleDateString('zh-CN', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                            )}
                        </DetailSection>
                    )}

                    {/* AI 深度解析 */}
                    <DetailSection
                        title="AI 深度解析"
                        icon={<BrainCircuit size={14} />}
                        colorClass="bg-amber-500"
                        collapsible={true}
                        defaultOpen={false}
                        source="Gemini"
                        showSource={showSources}
                    >
                        <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100/50 text-gray-700 text-sm">
                            <div className="flex items-start gap-2">
                                <Sparkles size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-medium text-amber-900 mb-1">Coming Soon</p>
                                    <p className="opacity-90">AI 深度解析功能正在开发中，未来将提供词源、记忆法及同义词辨析。</p>
                                </div>
                            </div>
                        </div>
                    </DetailSection>

                </div>

                {/* 3. 底部操作栏 */}
                <div
                    className="p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl"
                    onClick={(e) => e.stopPropagation()} // 阻止整个操作栏的点击事件冒泡
                >
                    {savedWord ? (
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm">
                                <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    savedWord.status === 'new' && "bg-blue-500",
                                    savedWord.status === 'learning' && "bg-yellow-500",
                                    savedWord.status === 'reviewed' && "bg-green-500",
                                    savedWord.status === 'mastered' && "bg-purple-500"
                                )} />
                                <span className="text-xs font-medium text-gray-600 capitalize">{savedWord.status}</span>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation(); // 阻止事件冒泡
                                    handleRemove();
                                }}
                                className="flex-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow active:scale-[0.98]"
                            >
                                移除单词
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={(e) => {
                                e.stopPropagation(); // 阻止事件冒泡
                                console.log('[WordDetailPopup] Button clicked!', e);
                                handleAdd();
                            }}
                            className="w-full bg-gray-900 hover:bg-black text-white px-4 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                            <span>添加到生词本</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WordDetailPopup;