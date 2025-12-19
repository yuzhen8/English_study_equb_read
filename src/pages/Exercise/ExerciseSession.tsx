import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Settings2 } from 'lucide-react';
import { Word, WordStore } from '../../services/WordStore';
import { GroupStore } from '../../services/GroupStore';
import FlashcardMode from './FlashcardMode';
import ChoiceMode from './ChoiceMode';
import SpellingMode from './modes/SpellingMode';
import ListeningChoiceMode from './modes/ListeningChoiceMode';
import ListeningSpellingMode from './modes/ListeningSpellingMode';
import FillBlankMode from './modes/FillBlankMode';
import SessionSummary from './SessionSummary';
import ExerciseSettings, { loadSettings } from './ExerciseSettings';

// 模式权重配置 (Mode Weights)
// 主动输出型 (高权重): 拼写、听力拼写、选词填空
// 被动识别型 (标准权重): 闪卡、听力选择、多项选择
const MODE_WEIGHTS: Record<string, number> = {
    'spelling': 2.0,           // 拼写构建 - 高权重
    'listening-spelling': 2.0, // 听力拼写 - 高权重
    'fill-blank': 1.5,         // 选词填空 - 中高权重
    'flashcard': 1.0,          // 闪卡 - 标准权重
    'listening-choice': 1.0,   // 听力选择 - 标准权重
    'choice': 0.8,             // 多项选择 - 略低权重
};

/**
 * 计算加权综合评分
 * @param results 各模式的评分结果
 * @returns 最终加权评分 (0-5)
 * 
 * 规则:
 * 1. 一票否决: 任意模式评分为 0 → 最终评分为 0
 * 2. 严重错误惩罚: 任意模式评分为 1 → 最终评分强制为 1
 * 3. 加权平均: 其他情况使用加权平均计算
 */
const calculateWeightedScore = (results: { mode: string; quality: number }[]): number => {
    // 检查一票否决
    if (results.some(r => r.quality === 0)) {
        return 0;
    }

    // 检查严重错误惩罚
    if (results.some(r => r.quality === 1)) {
        return 1;
    }

    // 计算加权平均
    let weightedSum = 0;
    let totalWeight = 0;

    for (const result of results) {
        const weight = MODE_WEIGHTS[result.mode] || 1.0;
        weightedSum += result.quality * weight;
        totalWeight += weight;
    }

    if (totalWeight === 0) return 0;

    return Math.round(weightedSum / totalWeight);
};

// 练习项类型：一个单词 + 一个模式
interface ExerciseItem {
    word: Word;
    mode: string;
}

const ExerciseSession: React.FC = () => {
    const { mode } = useParams<{ mode: string }>(); // 'mixed', 'flashcard', 'choice'
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [exerciseItems, setExerciseItems] = useState<ExerciseItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [sessionComplete, setSessionComplete] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    // 暂存结果，只有完成所有单词后才提交
    const [pendingResults, setPendingResults] = useState<{ wordId: string; quality: number; mode: string }[]>([]);
    // 存储原始单词列表用于计算总数
    const [uniqueWords, setUniqueWords] = useState<Word[]>([]);

    useEffect(() => {
        const loadSession = async () => {
            setLoading(true);
            try {
                const scope = searchParams.get('scope') || 'random';
                const groupId = searchParams.get('groupId');
                const settings = loadSettings();

                let selectedWords: Word[] = [];
                const allWords = await WordStore.getWords();

                // 根据范围选择单词
                switch (scope) {
                    case 'today':
                        // 今天添加的单词（按天结算，从当天 0:00 开始）
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const startOfToday = today.getTime();
                        selectedWords = allWords.filter(w => w.addedAt >= startOfToday);
                        break;
                    case 'review':
                        // 复习模式：仅获取到期的单词
                        selectedWords = await WordStore.getDueWords();
                        selectedWords = selectedWords.sort(() => 0.5 - Math.random());
                        break;
                    case 'learning':
                        selectedWords = allWords.filter(w => w.status === 'learning' || w.status === 'reviewed');
                        selectedWords = selectedWords.sort(() => 0.5 - Math.random());
                        break;
                    case 'new':
                        selectedWords = allWords.filter(w => w.status === 'new');
                        selectedWords = selectedWords.sort(() => 0.5 - Math.random());
                        break;
                    case 'newWords':
                        // 随机新词：仅未开始学习的单词
                        selectedWords = allWords.filter(w => w.status === 'new');
                        selectedWords = selectedWords.sort(() => 0.5 - Math.random());
                        break;
                    case 'random':
                        selectedWords = allWords.sort(() => 0.5 - Math.random());
                        break;
                    default:
                        if (scope.startsWith('group-') && groupId) {
                            const group = await GroupStore.getGroup(groupId);
                            if (group) {
                                selectedWords = allWords.filter(w => group.wordIds.includes(w.id));
                                selectedWords = selectedWords.sort(() => 0.5 - Math.random());
                            }
                        } else {
                            selectedWords = allWords.sort(() => 0.5 - Math.random());
                        }
                        break;
                }

                // 从URL参数获取limit，默认20
                const limitParam = searchParams.get('limit');
                const limit = limitParam ? parseInt(limitParam, 10) : 20;
                selectedWords = selectedWords.slice(0, limit);

                // 保存原始单词列表
                setUniqueWords(selectedWords);

                // 根据模式生成练习项
                if (mode === 'mixed') {
                    // 获取启用的模式
                    const enabledModes: string[] = [];
                    if (settings.includeFlashcard) enabledModes.push('flashcard');
                    if (settings.includeChoice) enabledModes.push('choice');
                    if (settings.includeSpelling) enabledModes.push('spelling');
                    if (settings.includeListeningChoice) enabledModes.push('listening-choice');
                    if (settings.includeListeningSpelling) enabledModes.push('listening-spelling');
                    if (settings.includeFillBlank) enabledModes.push('fill-blank');

                    // 如果没有启用任何模式，默认启用flashcard
                    if (enabledModes.length === 0) enabledModes.push('flashcard');

                    // 为每个单词生成所有启用模式的练习项
                    const items: ExerciseItem[] = [];
                    for (const word of selectedWords) {
                        for (const m of enabledModes) {
                            items.push({ word, mode: m });
                        }
                    }
                    setExerciseItems(items);
                } else {
                    // 单一模式：每个单词只有一个练习项
                    const items = selectedWords.map(word => ({ word, mode: mode || 'flashcard' }));
                    setExerciseItems(items);
                }
            } catch (error) {
                console.error("Failed to load session", error);
            } finally {
                setLoading(false);
            }
        };
        loadSession();
    }, [mode, searchParams]);

    const handleResult = async (quality: number) => {
        const currentItem = exerciseItems[currentIndex];
        if (currentItem) {
            // 暂存结果，不立即提交
            setPendingResults(prev => [...prev, { wordId: currentItem.word.id, quality, mode: currentItem.mode }]);
        }

        // Advance
        if (currentIndex < exerciseItems.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // 所有练习项完成，批量提交所有结果
            const allResults = [...pendingResults, { wordId: currentItem.word.id, quality, mode: currentItem.mode }];

            // 按单词分组结果
            const resultsByWord = new Map<string, { wordId: string; results: { mode: string; quality: number }[] }>();
            for (const result of allResults) {
                if (!resultsByWord.has(result.wordId)) {
                    resultsByWord.set(result.wordId, { wordId: result.wordId, results: [] });
                }
                resultsByWord.get(result.wordId)!.results.push({ mode: result.mode, quality: result.quality });
            }

            // 日志数据收集
            const logEntries: any[] = [];

            for (const [wordId, data] of resultsByWord) {
                // 捕获 SRS 变更前状态
                const beforeState = await WordStore.getWord(wordId);

                // 使用加权评分算法计算最终分数
                const weightedQuality = calculateWeightedScore(data.results);

                // 提交复习结果
                await WordStore.submitReview(wordId, weightedQuality);

                // 捕获 SRS 变更后状态
                const afterState = await WordStore.getWord(wordId);

                // 生成日志条目
                if (beforeState && afterState) {
                    logEntries.push({
                        word: beforeState.text,
                        wordId,
                        modeResults: data.results,
                        weightedQuality: weightedQuality,
                        before: {
                            status: beforeState.status,
                            interval: beforeState.interval,
                            easeFactor: beforeState.easeFactor,
                            nextReviewAt: beforeState.nextReviewAt,
                            reviewCount: beforeState.reviewCount
                        },
                        after: {
                            status: afterState.status,
                            interval: afterState.interval,
                            easeFactor: afterState.easeFactor,
                            nextReviewAt: afterState.nextReviewAt,
                            reviewCount: afterState.reviewCount
                        },
                        changes: {
                            intervalDelta: (afterState.interval || 0) - (beforeState.interval || 0),
                            easeFactorDelta: ((afterState.easeFactor || 2.5) - (beforeState.easeFactor || 2.5)).toFixed(2),
                            statusChanged: beforeState.status !== afterState.status
                        }
                    });
                }
            }

            // 调用日志接口（如果启用且有日志条目）
            const settings = loadSettings();
            console.log('[SRS Debug] Log entries count:', logEntries.length);
            console.log('[SRS Debug] enableSRSDebugLog:', settings.enableSRSDebugLog);

            if (settings.enableSRSDebugLog && logEntries.length > 0) {
                console.log('[SRS Debug] electronAPI available:', !!window.electronAPI);
                console.log('[SRS Debug] logSRS method available:', !!(window.electronAPI?.logSRS));

                if (window.electronAPI?.logSRS) {
                    try {
                        const result = await window.electronAPI.logSRS({
                            sessionMode: mode,
                            totalWords: resultsByWord.size,
                            totalExercises: allResults.length,
                            entries: logEntries
                        });
                        console.log('[SRS Debug] Log result:', result);
                    } catch (error) {
                        console.error('[SRS Debug] Failed to save log:', error);
                    }
                } else {
                    console.warn('[SRS Debug] logSRS not available - Electron may need restart');
                }
            }

            setSessionComplete(true);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-transparent">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
        );
    }

    if (!sessionComplete && exerciseItems.length === 0) {
        return (
            <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-8 text-center space-y-4">
                <h2 className="text-2xl font-bold text-white">没有单词需要学习</h2>
                <p className="text-white/60">当前没有待学习的单词。</p>
                <button
                    onClick={() => navigate(-1)}
                    className="bg-white/10 text-white border border-white/20 px-6 py-2 rounded-xl font-bold hover:bg-white/20 transition-colors"
                >
                    返回
                </button>
            </div>
        );
    }

    if (sessionComplete) {
        return (
            <div className="min-h-screen bg-transparent flex flex-col">
                <header className="bg-transparent p-4 flex items-center text-white">
                    <button onClick={() => navigate('/exercise')} className="p-2 hover:bg-white/10 rounded-full glass-button">
                        <ArrowLeft size={24} />
                    </button>
                    <span className="ml-4 font-bold text-lg">学习完成</span>
                </header>
                <div className="flex-1 flex items-center justify-center">
                    <SessionSummary totalReviewed={uniqueWords.length} />
                </div>
            </div>
        );
    }

    const currentItem = exerciseItems[currentIndex];
    const currentWord = currentItem?.word;
    const effectiveMode = currentItem?.mode || 'flashcard';

    // 模式名称映射
    const getModeDisplayName = (m: string): string => {
        const names: Record<string, string> = {
            'flashcard': '单词闪卡',
            'choice': '多项选择',
            'spelling': '拼写构建',
            'listening-choice': '听力选择',
            'listening-spelling': '听力拼写',
            'fill-blank': '选词填空',
            'mixed': '混合练习'
        };
        return names[m] || m;
    };

    // For spelling and listening-spelling modes, render full screen without ExerciseSession header
    if (effectiveMode === 'spelling') {
        return (
            <SpellingMode
                key={currentWord.id}
                word={currentWord}
                onResult={handleResult}
                currentIndex={currentIndex + 1}
                totalCount={exerciseItems.length}
            />
        );
    }

    if (effectiveMode === 'listening-spelling') {
        return (
            <ListeningSpellingMode
                key={currentWord.id}
                word={currentWord}
                onResult={handleResult}
                currentIndex={currentIndex + 1}
                totalCount={exerciseItems.length}
            />
        );
    }

    return (
        <div className="min-h-screen bg-transparent flex flex-col">
            {/* Header - Sticky at top */}
            <header className="sticky top-0 glass-card mx-4 mt-4 px-4 h-16 flex items-center justify-between z-10 rounded-2xl animate-fade-in">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/exercise')} className="p-2 hover:bg-white/10 rounded-full text-white/80 transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">{getModeDisplayName(effectiveMode)}</span>
                        <span className="text-xs text-white/40">{currentIndex + 1} / {exerciseItems.length}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">

                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <Settings2 size={20} />
                    </button>
                </div>
            </header>

            {/* Content - No padding needed for sticky header */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden">
                <div className="w-full max-w-md">
                    {effectiveMode === 'choice' ? (
                        <ChoiceMode
                            key={currentWord.id}
                            word={currentWord}
                            onResult={handleResult}
                        />
                    ) : effectiveMode === 'listening-choice' ? (
                        <ListeningChoiceMode
                            key={currentWord.id}
                            word={currentWord}
                            onResult={handleResult}
                        />
                    ) : effectiveMode === 'fill-blank' ? (
                        <FillBlankMode
                            key={currentWord.id}
                            word={currentWord}
                            onResult={handleResult}
                        />
                    ) : (
                        <FlashcardMode
                            key={currentWord.id}
                            word={currentWord}
                            onResult={handleResult}
                        />
                    )}
                </div>
            </div>

            {/* Settings Modal */}
            {showSettings && (
                <ExerciseSettings onClose={() => setShowSettings(false)} />
            )}
        </div>
    );
};

export default ExerciseSession;
