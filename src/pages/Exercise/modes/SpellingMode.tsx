import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Word } from '../../../services/WordStore';
import { cn } from '../../../lib/utils';
import { Volume2, RotateCcw, ArrowLeft, BookOpen, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WordDetailPopup from '../../../components/WordDetailPopup';
import ExerciseSettings from '../ExerciseSettings';

interface SpellingModeProps {
    word: Word & { lemma?: string }; // lemma is the base form of the word
    onResult: (quality: number) => void;
    currentIndex?: number;
    totalCount?: number;
}

const SpellingMode: React.FC<SpellingModeProps> = ({
    word,
    onResult,
    currentIndex = 1,
    totalCount = 1
}) => {
    const navigate = useNavigate();

    // Use lemma (base form) if available, otherwise use text
    const targetWord = useMemo(() => {
        return (word.lemma || word.text).toLowerCase();
    }, [word.lemma, word.text]);

    const [slots, setSlots] = useState<(string | null)[]>([]);
    const [availableLetters, setAvailableLetters] = useState<string[]>([]);
    const [isComplete, setIsComplete] = useState(false);
    const [shakeIndex, setShakeIndex] = useState<number | null>(null);
    const [showWordDetail, setShowWordDetail] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    // 错误计数和重置状态
    const [mistakeCount, setMistakeCount] = useState(0);
    const [usedReset, setUsedReset] = useState(false);

    // Find next empty slot index
    const nextEmptySlot = useMemo(() => {
        const idx = slots.findIndex(s => s === null);
        return idx === -1 ? null : idx;
    }, [slots]);

    // Generate random letters for distraction
    const generateRandomLetters = useCallback((count: number): string[] => {
        const alphabet = 'abcdefghijklmnopqrstuvwxyz';
        const randomLetters: string[] = [];
        for (let i = 0; i < count; i++) {
            randomLetters.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
        }
        return randomLetters;
    }, []);

    // Initialize slots and shuffle letters
    useEffect(() => {
        const letters = targetWord.split('');

        // Create empty slots
        setSlots(new Array(letters.length).fill(null));

        // Shuffle letters with some extra random letters (fewer extras for easier gameplay)
        const extraCount = Math.max(2, Math.floor(letters.length * 0.5));
        const shuffled = [...letters, ...generateRandomLetters(extraCount)].sort(() => Math.random() - 0.5);
        setAvailableLetters(shuffled);

        setIsComplete(false);
        setShakeIndex(null);
        setMistakeCount(0);
        setUsedReset(false);
    }, [word.id, targetWord, generateRandomLetters]);

    // Handle clicking on a filled slot to remove the letter
    const handleSlotClick = (index: number) => {
        if (isComplete) return;

        // If slot is filled, remove it and return letter to pool
        if (slots[index] !== null) {
            const letter = slots[index];
            setSlots(prev => {
                const newSlots = [...prev];
                newSlots[index] = null;
                return newSlots;
            });
            setAvailableLetters(prev => [...prev, letter!]);
        }
    };

    // Handle clicking a letter from the keyboard
    const handleLetterClick = (letter: string, letterIndex: number) => {
        if (isComplete || nextEmptySlot === null) return;

        // Check if correct for the next empty slot
        const correctLetter = targetWord[nextEmptySlot];
        const isCorrect = letter === correctLetter;

        if (isCorrect) {
            // Remove letter from available
            setAvailableLetters(prev => {
                const newAvailable = [...prev];
                newAvailable.splice(letterIndex, 1);
                return newAvailable;
            });

            // Fill slot
            setSlots(prev => {
                const newSlots = [...prev];
                newSlots[nextEmptySlot] = letter;

                // Check if complete
                const allFilled = newSlots.every(s => s !== null);
                if (allFilled) {
                    setTimeout(() => setIsComplete(true), 100);
                }

                return newSlots;
            });
        } else {
            // Error: shake animation on current target slot
            setMistakeCount(prev => prev + 1);
            setShakeIndex(nextEmptySlot);
            setTimeout(() => setShakeIndex(null), 500);
        }
    };

    // Reset the puzzle
    const handleReset = () => {
        setUsedReset(true); // 标记使用了重置
        const letters = targetWord.split('');
        setSlots(new Array(letters.length).fill(null));
        const extraCount = Math.max(2, Math.floor(letters.length * 0.5));
        const shuffled = [...letters, ...generateRandomLetters(extraCount)].sort(() => Math.random() - 0.5);
        setAvailableLetters(shuffled);
        setIsComplete(false);
        setShakeIndex(null);
    };

    // Play audio using TTS
    const playAudio = () => {
        // Play the original word (including inflected form for context)
        const utterance = new SpeechSynthesisUtterance(word.lemma || word.text);
        utterance.lang = 'en-US';
        utterance.rate = 0.8; // Slightly slower for clarity
        speechSynthesis.speak(utterance);
    };

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isComplete) return;

            const key = e.key.toLowerCase();

            // Handle Backspace (Undo last slot)
            if (e.key === 'Backspace') {
                // Find last filled slot
                for (let i = slots.length - 1; i >= 0; i--) {
                    if (slots[i] !== null) {
                        handleSlotClick(i);
                        return;
                    }
                }
                return;
            }

            // Handle Letters
            if (/^[a-z]$/.test(key)) {
                // Find if this letter is available in the pool
                const index = availableLetters.findIndex(l => l.toLowerCase() === key);
                if (index !== -1) {
                    handleLetterClick(availableLetters[index], index);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [slots, availableLetters, isComplete, handleLetterClick]); // Dependencies are crucial here

    // Calculate progress
    const progress = slots.length > 0 ? slots.filter(s => s !== null).length / slots.length : 0;

    // 计算动态评分
    const calculateScore = (): number => {
        // 使用重置 = 1分
        if (usedReset) return 1;
        // 根据错误次数评分: 0错=5, 1错=4, 2错=3, 3+错=2
        if (mistakeCount === 0) return 5;
        if (mistakeCount === 1) return 4;
        if (mistakeCount === 2) return 3;
        return 2;
    };

    // Auto advance when complete
    useEffect(() => {
        if (isComplete) {
            const score = calculateScore();
            const timer = setTimeout(() => {
                onResult(score);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [isComplete, onResult, usedReset, mistakeCount]);

    return (
        <>
            <div className="flex flex-col h-screen bg-transparent text-white">
                {/* Header - Minimal, just back button and progress */}
                <header className="flex items-center justify-between px-4 py-3 bg-transparent">
                    <button
                        onClick={() => navigate('/exercise')}
                        className="p-2 hover:bg-white/10 rounded-full text-white/80 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <span className="text-sm font-medium text-white/60">
                        {currentIndex} / {totalCount}
                    </span>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-2 hover:bg-white/10 rounded-full text-white/60 transition-colors"
                    >
                        <Settings2 size={20} />
                    </button>
                </header>

                {/* Main Content Area - Scrollable */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-2xl mx-auto px-4 py-8">
                        {/* Content Card */}
                        <div className="glass-card p-8 mb-6 border border-white/10 shadow-lg">
                            {/* Audio Button */}
                            <div className="flex justify-center mb-6">
                                <button
                                    onClick={playAudio}
                                    className="w-16 h-16 bg-blue-500 hover:bg-blue-600 rounded-full text-white flex items-center justify-center shadow-lg shadow-blue-500/30 transition-all hover:scale-105 active:scale-95 border border-white/10"
                                >
                                    <Volume2 size={28} />
                                </button>
                            </div>

                            {/* Translation - 左对齐 */}
                            <div className="mb-4">
                                <p className="text-2xl font-medium text-white whitespace-pre-line text-left leading-relaxed">{word.translation.replace(/\\n/g, '\n')}</p>
                            </div>

                            {/* 单词详情按钮 */}
                            <div className="text-center mb-4">
                                <button
                                    onClick={() => setShowWordDetail(true)}
                                    className="inline-flex items-center gap-1 text-purple-300 hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-white/10 text-sm"
                                >
                                    <BookOpen size={16} />
                                    <span>查看详情</span>
                                </button>
                            </div>

                            {/* Reset Button */}
                            <div className="flex justify-center">
                                <button
                                    onClick={handleReset}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/40 hover:text-white text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <RotateCcw size={14} />
                                    重置
                                </button>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4 px-1">
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 box-shadow-glow transition-all duration-300 rounded-full"
                                    style={{ width: `${progress * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Slots (填空区) */}
                        <div className="flex flex-wrap justify-center gap-2 mb-6">
                            {slots.map((letter, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSlotClick(index)}
                                    className={cn(
                                        "w-12 h-14 rounded-xl border border-white/20 flex items-center justify-center transition-all font-bold text-2xl shadow-md backdrop-blur-sm",
                                        letter === null
                                            ? "bg-white/5 text-white/20"
                                            : "bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]",
                                        nextEmptySlot === index && letter === null && "ring-2 ring-blue-500/50 ring-offset-0 bg-white/10 animate-pulse",
                                        shakeIndex === index && "animate-shake bg-red-500/20 border-red-500/50"
                                    )}
                                >
                                    {letter ? letter : ''}
                                </button>
                            ))}
                        </div>

                        {/* Keyboard (字母池) - Inline, below slots */}
                        {!isComplete && (
                            <div className="flex flex-wrap justify-center gap-2 mb-8">
                                {availableLetters.map((letter, index) => (
                                    <button
                                        key={`${letter}-${index}`}
                                        onClick={() => handleLetterClick(letter, index)}
                                        className="w-12 h-12 bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl shadow-sm font-bold text-xl text-white transition-all active:scale-95 hover:shadow-lg hover:-translate-y-0.5"
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
                    <div className="fixed bottom-0 left-0 right-0 transform translate-y-0 transition-transform duration-300">
                        <button
                            onClick={() => onResult(calculateScore())}
                            className="w-full bg-green-500 text-white py-4 text-lg font-bold hover:bg-green-600 transition-colors"
                        >
                            完成！继续下一题
                        </button>
                    </div>
                )}
            </div>

            {/* Word Detail Popup */}
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

export default SpellingMode;
