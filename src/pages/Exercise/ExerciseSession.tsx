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
    const [pendingResults, setPendingResults] = useState<{ wordId: string; quality: number }[]>([]);
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
                const now = Date.now();
                const oneDay = 24 * 60 * 60 * 1000;

                // 根据范围选择单词
                switch (scope) {
                    case 'today':
                        selectedWords = allWords.filter(w => now - w.addedAt < oneDay);
                        break;
                    case 'learning':
                        selectedWords = allWords.filter(w => w.status === 'learning' || w.status === 'reviewed');
                        selectedWords = selectedWords.sort(() => 0.5 - Math.random());
                        break;
                    case 'new':
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
            setPendingResults(prev => [...prev, { wordId: currentItem.word.id, quality }]);
        }

        // Advance
        if (currentIndex < exerciseItems.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // 所有练习项完成，批量提交所有结果
            const allResults = [...pendingResults, { wordId: currentItem.word.id, quality }];
            for (const result of allResults) {
                await WordStore.submitReview(result.wordId, result.quality);
            }
            setSessionComplete(true);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!sessionComplete && exerciseItems.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <h2 className="text-2xl font-bold text-gray-900">没有单词需要学习</h2>
                <p className="text-gray-500">当前没有待学习的单词。</p>
                <button
                    onClick={() => navigate(-1)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                >
                    返回
                </button>
            </div>
        );
    }

    if (sessionComplete) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <header className="bg-white shadow-sm p-4 flex items-center">
                    <button onClick={() => navigate('/exercise')} className="p-2 hover:bg-gray-100 rounded-full">
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
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header - Fixed at top */}
            <header className="fixed top-0 left-0 right-0 bg-white shadow-sm px-4 h-16 flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/exercise')} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-500">{getModeDisplayName(effectiveMode)}</span>
                        <span className="text-xs text-gray-400">{currentIndex + 1} / {exerciseItems.length}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Progress Bar */}
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${((currentIndex) / exerciseItems.length) * 100}%` }}
                        />
                    </div>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                    >
                        <Settings2 size={20} />
                    </button>
                </div>
            </header>

            {/* Content - Add padding for fixed header, no scrollbar unless needed */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 pt-20 overflow-hidden">
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
