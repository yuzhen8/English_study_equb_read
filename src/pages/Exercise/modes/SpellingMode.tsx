import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Word } from '../../../services/WordStore';
import { cn } from '../../../lib/utils';
import { Volume2, RotateCcw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
            setShakeIndex(nextEmptySlot);
            setTimeout(() => setShakeIndex(null), 500);
        }
    };

    // Reset the puzzle
    const handleReset = () => {
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

    // Calculate progress
    const progress = slots.length > 0 ? slots.filter(s => s !== null).length / slots.length : 0;

    // Auto advance when complete
    useEffect(() => {
        if (isComplete) {
            const timer = setTimeout(() => {
                onResult(5); // Perfect score for completion
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [isComplete, onResult]);

    return (
        <div className="flex flex-col h-screen bg-gray-50 text-slate-900">
            {/* Header - Minimal, just back button and progress */}
            <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
                <button
                    onClick={() => navigate('/exercise')}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-600"
                >
                    <ArrowLeft size={20} />
                </button>
                <span className="text-sm font-medium text-slate-600">
                    {currentIndex} / {totalCount}
                </span>
            </header>

            {/* Main Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto px-4 py-8">
                    {/* Content Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
                        {/* Audio Button */}
                        <div className="flex justify-center mb-6">
                            <button
                                onClick={playAudio}
                                className="w-14 h-14 bg-blue-600 hover:bg-blue-700 rounded-full text-white flex items-center justify-center shadow-md transition-all hover:scale-105 active:scale-95"
                            >
                                <Volume2 size={24} />
                            </button>
                        </div>

                        {/* Translation */}
                        <div className="text-center mb-6">
                            <p className="text-2xl font-medium text-slate-900">{word.translation}</p>
                        </div>

                        {/* Reset Button */}
                        <div className="flex justify-center">
                            <button
                                onClick={handleReset}
                                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-500 text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                <RotateCcw size={14} />
                                重置
                            </button>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-600 transition-all duration-300 rounded-full"
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
                                    "w-12 h-14 rounded-lg border-b-4 flex items-center justify-center transition-all font-bold text-2xl",
                                    letter === null
                                        ? "bg-gray-100 border-gray-300 text-gray-400"
                                        : "bg-blue-50 text-blue-700 border-blue-500",
                                    nextEmptySlot === index && letter === null && "ring-2 ring-blue-600 ring-offset-2",
                                    shakeIndex === index && "animate-shake bg-red-50 border-red-500"
                                )}
                            >
                                {letter ? letter.toUpperCase() : ''}
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
                                    className="w-11 h-11 bg-gray-100 hover:bg-blue-50 rounded-lg shadow-sm font-bold text-xl text-slate-900 transition-all active:scale-95 hover:shadow-md"
                                >
                                    {letter.toUpperCase()}
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
                        onClick={() => onResult(5)}
                        className="w-full bg-green-500 text-white py-4 text-lg font-bold hover:bg-green-600 transition-colors"
                    >
                        完成！继续下一题
                    </button>
                </div>
            )}
        </div>
    );
};

export default SpellingMode;
