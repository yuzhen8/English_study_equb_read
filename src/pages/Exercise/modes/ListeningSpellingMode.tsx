import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Word } from '../../../services/WordStore';
import { cn } from '../../../lib/utils';
import { Volume2, RotateCcw, ArrowLeft, BookOpen, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WordDetailPopup from '../../../components/WordDetailPopup';
import ExerciseSettings from '../ExerciseSettings';

interface ListeningSpellingModeProps {
    word: Word & { lemma?: string };
    onResult: (quality: number) => void;
    currentIndex?: number;
    totalCount?: number;
}

/**
 * 拼写构建(听) - 根据单词发音拼写单词
 */
const ListeningSpellingMode: React.FC<ListeningSpellingModeProps> = ({
    word,
    onResult,
    currentIndex = 1,
    totalCount = 1
}) => {
    const navigate = useNavigate();
    const [showWordDetail, setShowWordDetail] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const targetWord = useMemo(() => {
        return (word.lemma || word.text).toLowerCase();
    }, [word.lemma, word.text]);

    const [slots, setSlots] = useState<(string | null)[]>([]);
    const [availableLetters, setAvailableLetters] = useState<string[]>([]);
    const [isComplete, setIsComplete] = useState(false);
    const [shakeIndex, setShakeIndex] = useState<number | null>(null);
    const [showHint, setShowHint] = useState(false);
    // 错误计数和惩罚状态
    const [mistakeCount, setMistakeCount] = useState(0);
    const [usedHint, setUsedHint] = useState(false);
    const [usedReset, setUsedReset] = useState(false);

    const nextEmptySlot = useMemo(() => {
        const idx = slots.findIndex(s => s === null);
        return idx === -1 ? null : idx;
    }, [slots]);

    const generateRandomLetters = useCallback((count: number): string[] => {
        const alphabet = 'abcdefghijklmnopqrstuvwxyz';
        const randomLetters: string[] = [];
        for (let i = 0; i < count; i++) {
            randomLetters.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
        }
        return randomLetters;
    }, []);

    useEffect(() => {
        const wordLetters = targetWord.split('');
        setSlots(Array(targetWord.length).fill(null));

        const randomCount = Math.max(3, Math.floor(targetWord.length * 0.5));
        const randomLetters = generateRandomLetters(randomCount);
        const combined = [...wordLetters, ...randomLetters].sort(() => 0.5 - Math.random());
        setAvailableLetters(combined);
        setIsComplete(false);
        setShakeIndex(null);
        setShowHint(false);
        setMistakeCount(0);
        setUsedHint(false);
        setUsedReset(false);

        // 自动播放
        setTimeout(() => playAudio(), 500);
    }, [targetWord, generateRandomLetters]);

    const playAudio = () => {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word.lemma || word.text);
        utterance.lang = 'en-US';
        utterance.rate = 0.85;
        speechSynthesis.speak(utterance);
    };

    const handleLetterClick = (letter: string, index: number) => {
        if (nextEmptySlot === null || isComplete) return;

        const expectedLetter = targetWord[nextEmptySlot];

        if (letter.toLowerCase() === expectedLetter.toLowerCase()) {
            const newSlots = [...slots];
            newSlots[nextEmptySlot] = letter;
            setSlots(newSlots);

            const newAvailable = [...availableLetters];
            newAvailable.splice(index, 1);
            setAvailableLetters(newAvailable);

            if (newSlots.every(s => s !== null)) {
                setIsComplete(true);
            }
        } else {
            setMistakeCount(prev => prev + 1);
            setShakeIndex(nextEmptySlot);
            setTimeout(() => setShakeIndex(null), 500);
        }
    };

    const handleReset = () => {
        setUsedReset(true); // 标记使用了重置
        const wordLetters = targetWord.split('');
        setSlots(Array(targetWord.length).fill(null));

        const randomCount = Math.max(3, Math.floor(targetWord.length * 0.5));
        const randomLetters = generateRandomLetters(randomCount);
        const combined = [...wordLetters, ...randomLetters].sort(() => 0.5 - Math.random());
        setAvailableLetters(combined);
        setIsComplete(false);
        setShakeIndex(null);
    };

    // 计算动态评分
    const calculateScore = (): number => {
        // 使用提示或重置 = 1分
        if (usedHint || usedReset) return 1;
        // 根据错误次数评分: 0错=5, 1错=4, 2错=3, 3+错=2
        if (mistakeCount === 0) return 5;
        if (mistakeCount === 1) return 4;
        if (mistakeCount === 2) return 3;
        return 2;
    };

    useEffect(() => {
        if (isComplete) {
            const score = calculateScore();
            const timer = setTimeout(() => {
                onResult(score);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [isComplete, onResult, usedHint, usedReset, mistakeCount]);

    return (
        <>
            <div className="flex flex-col h-screen bg-transparent text-white">
                {/* Header */}
                <header className="flex items-center justify-between px-4 py-3 bg-transparent">
                    <button
                        onClick={() => navigate('/exercise')}
                        className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} className="text-white/80" />
                    </button>
                    <div className="text-center">
                        <span className="text-sm text-white/60">{currentIndex} / {totalCount}</span>
                    </div>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <Settings2 size={20} className="text-white/60" />
                    </button>
                </header>

                {/* Content - 使用flex布局居中内容，无滚动条 */}
                <div className="flex-1 flex flex-col items-center justify-center px-4 py-4">
                    <div className="w-full max-w-md">
                        {/* 卡片内容 */}
                        <div className="glass-card p-6 mb-4 border border-white/10 shadow-lg">
                            {/* 模式标签 */}
                            <div className="text-center mb-6">
                                <span className="inline-block px-3 py-1 bg-white/10 text-amber-300 border border-amber-500/30 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                                    Listening Spelling
                                </span>
                            </div>

                            {/* 音频按钮 */}
                            <div className="flex justify-center mb-3">
                                <button
                                    onClick={playAudio}
                                    className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-full text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
                                >
                                    <Volume2 size={24} />
                                </button>
                            </div>

                            {/* 提示和详情按钮 - 始终显示 */}
                            <div className="flex items-center justify-center gap-3 mb-6">
                                {!showHint && !isComplete && (
                                    <button
                                        onClick={() => { setShowHint(true); setUsedHint(true); }}
                                        className="text-sm text-white/40 hover:text-white transition-colors"
                                    >
                                        显示提示
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowWordDetail(true)}
                                    className="inline-flex items-center gap-1 text-purple-300 hover:text-white transition-colors px-3 py-1 rounded-full hover:bg-white/10 text-sm"
                                >
                                    <BookOpen size={14} />
                                    <span>详情</span>
                                </button>
                            </div>

                            {/* 翻译提示 - 点击后显示 */}
                            {showHint && !isComplete && (
                                <div className="text-center mb-3 animate-fade-in">
                                    <p className="text-sm text-white/80 whitespace-pre-line">
                                        {word.translation.replace(/\\n/g, '\n')}
                                    </p>
                                </div>
                            )}

                            {/* 完成后显示单词和翻译 */}
                            {isComplete && (
                                <div className="text-center mb-4 animate-fade-in">
                                    <p className="text-emerald-400 font-bold text-lg mb-1 drop-shadow-md">正确! 🎉</p>
                                    <p className="text-white/90 whitespace-pre-line text-sm text-left">
                                        {word.translation.replace(/\\n/g, '\n')}
                                    </p>
                                </div>
                            )}

                            {/* Reset Button */}
                            <div className="flex justify-center">
                                <button
                                    onClick={handleReset}
                                    className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/40 hover:text-white text-xs font-medium transition-colors flex items-center gap-1"
                                >
                                    <RotateCcw size={12} />
                                    重置
                                </button>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-6 px-1">
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-400 box-shadow-glow transition-all duration-300 rounded-full"
                                    style={{ width: `${(slots.filter(s => s !== null).length / slots.length) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Slots */}
                        <div className="flex flex-wrap justify-center gap-2 mb-6">
                            {slots.map((letter, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        "w-12 h-14 border rounded-xl flex items-center justify-center text-xl font-bold transition-all shadow-md",
                                        letter
                                            ? "bg-amber-400/20 border-amber-400/50 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.2)]"
                                            : idx === nextEmptySlot
                                                ? "border-amber-400/80 bg-white/5 shadow-[0_0_8px_rgba(251,191,36,0.3)] animate-pulse"
                                                : "border-white/10 bg-black/20 text-white/20",
                                        shakeIndex === idx && "animate-shake border-red-500 bg-red-500/20"
                                    )}
                                >
                                    {letter || ''}
                                </div>
                            ))}
                        </div>

                        {/* Letter Pool */}
                        {!isComplete && (
                            <div className="flex flex-wrap justify-center gap-2">
                                {availableLetters.map((letter, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleLetterClick(letter, idx)}
                                        className="w-11 h-11 bg-white/5 border border-white/10 rounded-xl text-lg font-bold text-white hover:border-amber-400/60 hover:bg-amber-400/10 transition-colors active:scale-95 shadow-sm"
                                    >
                                        {letter}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer - Success Button */}
                {isComplete && (
                    <div className="fixed bottom-0 left-0 right-0">
                        <button
                            onClick={() => onResult(calculateScore())}
                            className="w-full bg-green-500 text-white py-4 text-lg font-bold hover:bg-green-600 transition-colors"
                        >
                            完成！继续下一题
                        </button>
                    </div>
                )}
            </div>

            {showWordDetail && (
                <WordDetailPopup
                    wordId={word.id}
                    onClose={() => setShowWordDetail(false)}
                />
            )}

            {/* Settings Modal */}
            {showSettings && (
                <ExerciseSettings onClose={() => setShowSettings(false)} />
            )}
        </>
    );
};

export default ListeningSpellingMode;
