import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import { Word, WordStore } from '../../services/WordStore';
import FlashcardMode from './FlashcardMode';
import ChoiceMode from './ChoiceMode';
import SpellingMode from './modes/SpellingMode';
import SessionSummary from './SessionSummary';

const ExerciseSession: React.FC = () => {
    const { mode } = useParams<{ mode: string }>(); // 'mixed', 'flashcard', 'choice'
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [words, setWords] = useState<Word[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [sessionComplete, setSessionComplete] = useState(false);

    useEffect(() => {
        const loadSession = async () => {
            setLoading(true);
            try {
                // For now, simple logic: get due words for all modes
                // In future, 'mixed' might use different algorithm than specific modes
                let dueWords = await WordStore.getDueWords();

                // If no due words, maybe grab some "learning" or "new" words just for demo/practice?
                // Or just show "All caught up!"
                if (dueWords.length === 0) {
                    // Fallback: Grab some random words if empty (for testing/demo)
                    const allWords = await WordStore.getWords();
                    if (allWords.length > 0) {
                        dueWords = allWords.sort(() => 0.5 - Math.random()).slice(0, 10);
                    }
                } else {
                    // Limit session size to avoid fatigue
                    dueWords = dueWords.slice(0, 20);
                }

                setWords(dueWords);
            } catch (error) {
                console.error("Failed to load session", error);
            } finally {
                setLoading(false);
            }
        };
        loadSession();
    }, [mode]);

    const handleResult = async (quality: number) => {
        const currentWord = words[currentIndex];
        if (currentWord) {
            await WordStore.submitReview(currentWord.id, quality);
        }

        // Advance
        if (currentIndex < words.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
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

    if (!sessionComplete && words.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <h2 className="text-2xl font-bold text-gray-900">All Caught Up!</h2>
                <p className="text-gray-500">You have no words due for review right now.</p>
                <button
                    onClick={() => navigate(-1)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                >
                    Back to Exercises
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
                    <span className="ml-4 font-bold text-lg">Session Summary</span>
                </header>
                <div className="flex-1 flex items-center justify-center">
                    <SessionSummary totalReviewed={words.length} />
                </div>
            </div>
        );
    }

    const currentWord = words[currentIndex];

    // Determine effective mode for current card
    // mixed mode alternates between flashcard, choice, and spelling
    const getEffectiveMode = (index: number): string => {
        if (mode === 'mixed') {
            const modes = ['flashcard', 'choice', 'spelling'];
            return modes[index % modes.length];
        }
        return mode || 'flashcard';
    };

    const effectiveMode = getEffectiveMode(currentIndex);

    // For spelling mode, render full screen without ExerciseSession header
    if (effectiveMode === 'spelling') {
        return (
            <SpellingMode
                key={currentWord.id}
                word={currentWord}
                onResult={handleResult}
                currentIndex={currentIndex + 1}
                totalCount={words.length}
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
                        <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">{mode} Practice</span>
                        <span className="text-xs text-gray-400">{currentIndex + 1} / {words.length}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Progress Bar */}
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${((currentIndex) / words.length) * 100}%` }}
                        />
                    </div>
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full">
                        <MoreHorizontal size={20} />
                    </button>
                </div>
            </header>

            {/* Content - Add padding for fixed header */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 pt-20">
                <div className="w-full max-w-md">
                    {effectiveMode === 'choice' ? (
                        <ChoiceMode
                            key={currentWord.id} // Key to force reset on word change
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
        </div>
    );
};

export default ExerciseSession;
