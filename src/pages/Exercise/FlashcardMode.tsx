import React, { useState } from 'react';
import { Word } from '../../services/WordStore';
import { Volume2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FlashcardModeProps {
    word: Word;
    onResult: (quality: number) => void;
}

const FlashcardMode: React.FC<FlashcardModeProps> = ({ word, onResult }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    // Reset state when word changes
    React.useEffect(() => {
        setIsFlipped(false);
    }, [word.id]);

    const playAudio = (e: React.MouseEvent) => {
        e.stopPropagation();
        // TODO: Use a proper audio service or passed in play function
        // For now, simple standard web audio if URL available, or mock
        console.log('Play audio for', word.text);

        // Try to find audio in word data or use TTS
        const utterance = new SpeechSynthesisUtterance(word.text);
        utterance.lang = 'en-US';
        speechSynthesis.speak(utterance);
    };

    return (
        <div className="max-w-md w-full mx-auto perspective-1000">
            <div
                className={cn(
                    "relative w-full aspect-[4/5] transition-all duration-500 transform-style-3d cursor-pointer",
                    isFlipped ? "rotate-y-180" : ""
                )}
                onClick={() => !isFlipped && setIsFlipped(true)}
            >
                {/* Front */}
                <div className={cn(
                    "absolute inset-0 backface-hidden bg-white rounded-3xl shadow-xl flex flex-col items-center justify-center p-8 border-2 border-transparent hover:border-blue-100 transition-colors",
                    isFlipped && "pointer-events-none" // prevent clicking front when back is shown (visually)
                )}>
                    <div className="text-center space-y-6">
                        <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider">
                            Flashcard
                        </span>

                        <div>
                            <h2 className="text-5xl font-bold text-gray-900 mb-4">{word.text}</h2>
                            <button
                                onClick={playAudio}
                                className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors p-2 rounded-full hover:bg-blue-50"
                            >
                                <Volume2 size={24} />
                            </button>
                        </div>

                        <p className="text-gray-400 text-sm">Tap to flip</p>
                    </div>
                </div>

                {/* Back */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white rounded-3xl shadow-xl flex flex-col overflow-hidden">
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">{word.text}</h3>
                            <div className="w-12 h-1 bg-blue-500 rounded-full mx-auto" />
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Meaning</h4>
                                <p className="text-xl text-gray-800 font-medium">{word.translation}</p>
                            </div>

                            {word.context && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Context</h4>
                                    <p className="text-gray-600 italic">"{word.context}"</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Gradient overlay for bottom separation */}
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

                    {/* Controls */}
                    <div className="p-4 grid grid-cols-4 gap-2 bg-gray-50">
                        <button
                            onClick={(e) => { e.stopPropagation(); onResult(1); }}
                            className="flex flex-col items-center py-2 px-1 rounded-xl hover:bg-red-50 text-red-600 transition-colors group"
                        >
                            <span className="text-xs font-bold mb-1 group-hover:scale-110 transition-transform">Again</span>
                            <span className="text-[10px] text-red-400">1 min</span>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onResult(3); }}
                            className="flex flex-col items-center py-2 px-1 rounded-xl hover:bg-orange-50 text-orange-600 transition-colors group"
                        >
                            <span className="text-xs font-bold mb-1 group-hover:scale-110 transition-transform">Hard</span>
                            <span className="text-[10px] text-orange-400">2 days</span>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onResult(4); }}
                            className="flex flex-col items-center py-2 px-1 rounded-xl hover:bg-blue-50 text-blue-600 transition-colors group"
                        >
                            <span className="text-xs font-bold mb-1 group-hover:scale-110 transition-transform">Good</span>
                            <span className="text-[10px] text-blue-400">4 days</span>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onResult(5); }}
                            className="flex flex-col items-center py-2 px-1 rounded-xl hover:bg-green-50 text-green-600 transition-colors group"
                        >
                            <span className="text-xs font-bold mb-1 group-hover:scale-110 transition-transform">Easy</span>
                            <span className="text-[10px] text-green-400">7 days</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FlashcardMode;
