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
            setShakeIndex(nextEmptySlot);
            setTimeout(() => setShakeIndex(null), 500);
        }
    };

    const handleReset = () => {
        const wordLetters = targetWord.split('');
        setSlots(Array(targetWord.length).fill(null));

        const randomCount = Math.max(3, Math.floor(targetWord.length * 0.5));
        const randomLetters = generateRandomLetters(randomCount);
        const combined = [...wordLetters, ...randomLetters].sort(() => 0.5 - Math.random());
        setAvailableLetters(combined);
        setIsComplete(false);
        setShakeIndex(null);
    };

    useEffect(() => {
        if (isComplete) {
            const timer = setTimeout(() => {
                onResult(5);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [isComplete, onResult]);

    return (
        <>
            <div className="flex flex-col h-screen bg-gray-50 text-slate-900">
                {/* Header */}
                <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
                    <button
                        onClick={() => navigate('/exercise')}
                        className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} className="text-gray-700" />
                    </button>
                    <div className="text-center">
                        <span className="text-sm text-gray-500">{currentIndex} / {totalCount}</span>
                    </div>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <Settings2 size={20} className="text-gray-500" />
                    </button>
                </header>

                {/* Content - 使用flex布局居中内容，无滚动条 */}
                <div className="flex-1 flex flex-col items-center justify-center px-4 py-4">
                    <div className="w-full max-w-md">
                        {/* 卡片内容 */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
                            {/* 模式标签 */}
                            <div className="text-center mb-3">
                                <span className="inline-block px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold uppercase tracking-wider">
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
                            <div className="flex items-center justify-center gap-3 mb-3">
                                {!showHint && !isComplete && (
                                    <button
                                        onClick={() => setShowHint(true)}
                                        className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        显示提示
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowWordDetail(true)}
                                    className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 transition-colors px-3 py-1 rounded-full hover:bg-purple-50 text-sm"
                                >
                                    <BookOpen size={14} />
                                    <span>详情</span>
                                </button>
                            </div>

                            {/* 翻译提示 - 点击后显示 */}
                            {showHint && !isComplete && (
                                <div className="text-center mb-3 animate-fade-in">
                                    <p className="text-sm text-gray-600 whitespace-pre-line">
                                        {word.translation.replace(/\\n/g, '\n')}
                                    </p>
                                </div>
                            )}

                            {/* 完成后显示单词和翻译 */}
                            {isComplete && (
                                <div className="text-center mb-3 animate-fade-in">
                                    <p className="text-green-600 font-medium mb-1">正确! 🎉</p>
                                    <p className="text-gray-600 whitespace-pre-line text-sm text-left">
                                        {word.translation.replace(/\\n/g, '\n')}
                                    </p>
                                </div>
                            )}

                            {/* Reset Button */}
                            <div className="flex justify-center">
                                <button
                                    onClick={handleReset}
                                    className="px-3 py-1 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-500 text-xs font-medium transition-colors flex items-center gap-1"
                                >
                                    <RotateCcw size={12} />
                                    重置
                                </button>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-500 transition-all duration-300 rounded-full"
                                    style={{ width: `${(slots.filter(s => s !== null).length / slots.length) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Slots */}
                        <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                            {slots.map((letter, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        "w-10 h-12 border-2 rounded-lg flex items-center justify-center text-lg font-bold transition-all",
                                        letter
                                            ? "bg-amber-100 border-amber-300 text-amber-800"
                                            : idx === nextEmptySlot
                                                ? "border-amber-400 bg-amber-50"
                                                : "border-gray-200 bg-white",
                                        shakeIndex === idx && "animate-shake border-red-400 bg-red-50"
                                    )}
                                >
                                    {letter || ''}
                                </div>
                            ))}
                        </div>

                        {/* Letter Pool */}
                        {!isComplete && (
                            <div className="flex flex-wrap justify-center gap-1.5">
                                {availableLetters.map((letter, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleLetterClick(letter, idx)}
                                        className="w-10 h-10 bg-white border-2 border-gray-200 rounded-lg text-base font-bold text-gray-700 hover:border-amber-400 hover:bg-amber-50 transition-colors active:scale-95"
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
                            onClick={() => onResult(5)}
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
