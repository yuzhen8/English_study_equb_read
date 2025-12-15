import React, { useState, useEffect } from 'react';
import { Word } from '../../../services/WordStore';
import { cn } from '../../../lib/utils';
import { Volume2, Check, X } from 'lucide-react';

interface SpellingModeProps {
    word: Word;
    onResult: (quality: number) => void;
}

const SpellingMode: React.FC<SpellingModeProps> = ({ word, onResult }) => {
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showHint, setShowHint] = useState(false);

    // Reset state when word changes
    useEffect(() => {
        setInput('');
        setIsProcessing(false);
        setShowHint(false);
    }, [word.id]);

    const playAudio = (e: React.MouseEvent) => {
        e.stopPropagation();
        const utterance = new SpeechSynthesisUtterance(word.text);
        utterance.lang = 'en-US';
        speechSynthesis.speak(utterance);
    };

    const handleSubmit = () => {
        if (!input.trim() || isProcessing) return;

        setIsProcessing(true);
        const userInput = input.trim().toLowerCase();
        const correctWord = word.text.toLowerCase();

        const isCorrect = userInput === correctWord;
        
        // Calculate quality based on accuracy
        // Perfect match = 5, close match (typos) = 3-4, wrong = 1-2
        let quality = 1;
        if (isCorrect) {
            quality = 5;
        } else {
            // Simple Levenshtein distance approximation
            const distance = levenshteinDistance(userInput, correctWord);
            const maxLen = Math.max(userInput.length, correctWord.length);
            const similarity = 1 - (distance / maxLen);
            
            if (similarity > 0.8) {
                quality = 4; // Very close
            } else if (similarity > 0.6) {
                quality = 3; // Somewhat close
            } else if (similarity > 0.4) {
                quality = 2; // Not very close
            } else {
                quality = 1; // Wrong
            }
        }

        // Delay to show feedback
        setTimeout(() => {
            onResult(quality);
        }, 2000);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isProcessing) {
            handleSubmit();
        }
    };

    // Simple Levenshtein distance calculation
    const levenshteinDistance = (str1: string, str2: string): number => {
        const matrix: number[][] = [];
        const len1 = str1.length;
        const len2 = str2.length;

        for (let i = 0; i <= len2; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= len1; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= len2; i++) {
            for (let j = 1; j <= len1; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[len2][len1];
    };

    const isCorrect = input.trim().toLowerCase() === word.text.toLowerCase();
    const showResult = isProcessing && input.trim() !== '';

    return (
        <div className="max-w-md w-full mx-auto space-y-8">
            <div className="text-center py-8">
                <span className="inline-block px-3 py-1 bg-teal-50 text-teal-600 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                    Spelling
                </span>
                
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Listen and Spell</h2>
                    <p className="text-gray-500 text-sm mb-4">{word.translation}</p>
                    
                    <button
                        onClick={playAudio}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-700 rounded-xl hover:bg-teal-200 transition-colors"
                    >
                        <Volume2 size={20} />
                        <span className="font-medium">Play Audio</span>
                    </button>
                </div>

                {word.context && (
                    <div className="text-left bg-gray-50 rounded-xl p-4 mb-4">
                        <p className="text-sm text-gray-600 italic">"{word.context}"</p>
                    </div>
                )}
            </div>

            {/* Input Field */}
            <div className="space-y-4">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isProcessing}
                        placeholder="Type the word..."
                        className={cn(
                            "w-full px-4 py-4 text-2xl font-bold text-center rounded-xl border-2 transition-all",
                            "focus:outline-none focus:ring-2 focus:ring-teal-500",
                            showResult && isCorrect && "bg-green-50 border-green-300 text-green-800",
                            showResult && !isCorrect && "bg-red-50 border-red-300 text-red-800",
                            !showResult && "bg-white border-gray-200 text-gray-900"
                        )}
                        autoFocus
                    />
                    
                    {showResult && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            {isCorrect ? (
                                <Check size={24} className="text-green-600" />
                            ) : (
                                <X size={24} className="text-red-600" />
                            )}
                        </div>
                    )}
                </div>

                {showResult && !isCorrect && (
                    <div className="text-center">
                        <p className="text-red-600 font-medium mb-1">Correct spelling:</p>
                        <p className="text-2xl font-bold text-gray-900">{word.text}</p>
                    </div>
                )}

                {!showResult && (
                    <div className="flex justify-between items-center">
                        <button
                            onClick={() => setShowHint(!showHint)}
                            className="text-sm text-gray-500 hover:text-teal-600 transition-colors"
                        >
                            {showHint ? 'Hide Hint' : 'Show Hint'}
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!input.trim() || isProcessing}
                            className={cn(
                                "px-6 py-2 rounded-xl font-bold transition-colors",
                                input.trim() && !isProcessing
                                    ? "bg-teal-600 text-white hover:bg-teal-700"
                                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            )}
                        >
                            Submit
                        </button>
                    </div>
                )}

                {showHint && !showResult && (
                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                        <p className="text-sm text-teal-800">
                            <span className="font-medium">Hint:</span> The word starts with "{word.text.charAt(0).toUpperCase()}" and has {word.text.length} letters.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SpellingMode;

