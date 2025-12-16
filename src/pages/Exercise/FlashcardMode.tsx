import React, { useState } from 'react';
import { Word } from '../../services/WordStore';
import { Volume2, BookOpen } from 'lucide-react';
import { cn } from '../../lib/utils';
import WordDetailPopup from '../../components/WordDetailPopup';

interface FlashcardModeProps {
    word: Word & { lemma?: string; phonetic?: string };
    onResult: (quality: number) => void;
}

const FlashcardMode: React.FC<FlashcardModeProps> = ({ word, onResult }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [showWordDetail, setShowWordDetail] = useState(false);

    // Reset state when word changes
    React.useEffect(() => {
        setIsFlipped(false);
    }, [word.id]);

    const playAudio = (e: React.MouseEvent) => {
        e.stopPropagation();
        const utterance = new SpeechSynthesisUtterance(word.text);
        utterance.lang = 'en-US';
        speechSynthesis.speak(utterance);
    };

    const handleShowDetail = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowWordDetail(true);
    };

    return (
        <>
            <div className="max-w-md w-full mx-auto" style={{ perspective: '1000px' }}>
                <div
                    className={cn(
                        "relative w-full aspect-[4/5] transition-all duration-500 cursor-pointer"
                    )}
                    style={{
                        transformStyle: 'preserve-3d',
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                    onClick={() => !isFlipped && setIsFlipped(true)}
                >
                    {/* Front */}
                    <div
                        className="absolute inset-0 bg-white rounded-3xl shadow-xl flex flex-col items-center justify-center p-8 border-2 border-transparent hover:border-blue-100 transition-colors"
                        style={{
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden'
                        }}
                    >
                        <div className="text-center space-y-6">
                            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider">
                                Flashcard
                            </span>

                            <div>
                                <h2 className="text-5xl font-bold text-gray-900 mb-4">{word.lemma || word.text}</h2>
                                <div className="flex items-center justify-center gap-2">
                                    <button
                                        onClick={playAudio}
                                        className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors p-2 rounded-full hover:bg-blue-50"
                                    >
                                        <Volume2 size={24} />
                                    </button>
                                    <button
                                        onClick={handleShowDetail}
                                        className="inline-flex items-center gap-2 text-gray-500 hover:text-purple-600 transition-colors p-2 rounded-full hover:bg-purple-50"
                                        title="查看单词详情"
                                    >
                                        <BookOpen size={24} />
                                    </button>
                                </div>
                            </div>

                            <p className="text-gray-400 text-sm">Tap to flip</p>
                        </div>
                    </div>

                    {/* Back */}
                    <div
                        className="absolute inset-0 bg-white rounded-3xl shadow-xl flex flex-col overflow-hidden"
                        style={{
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)'
                        }}
                    >
                        <div className="flex-1 flex flex-col justify-center p-8 space-y-6">
                            <div className="text-center">
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">{word.lemma || word.text}</h3>
                                <div className="w-12 h-1 bg-blue-500 rounded-full mx-auto" />
                            </div>

                            <div className="space-y-4 w-full">
                                {/* Phonetic */}
                                {word.phonetic && (
                                    <div className="text-center">
                                        <p className="text-lg text-gray-600">/{word.phonetic}/</p>
                                    </div>
                                )}

                                {/* Translation - 左对齐 */}
                                <div>
                                    <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">释义</h4>
                                    <p className="text-xl text-gray-800 font-medium whitespace-pre-line text-left">{word.translation.replace(/\\n/g, '\n')}</p>
                                </div>

                                {/* Context/Original sentence */}
                                {word.context && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">原句</h4>
                                        <p className="text-gray-600 italic text-left">"{word.context}"</p>
                                    </div>
                                )}
                            </div>

                            {/* 单词详情按钮 */}
                            <div className="text-center">
                                <button
                                    onClick={handleShowDetail}
                                    className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 transition-colors px-4 py-2 rounded-full hover:bg-purple-50"
                                >
                                    <BookOpen size={18} />
                                    <span className="text-sm font-medium">查看详情</span>
                                </button>
                            </div>
                        </div>

                        {/* Gradient overlay for bottom separation */}
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

                        {/* Controls - Only 2 buttons */}
                        <div className="p-4 grid grid-cols-2 gap-3 bg-gray-50">
                            <button
                                onClick={(e) => { e.stopPropagation(); onResult(2); }}
                                className="flex flex-col items-center py-3 px-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 transition-colors group border border-orange-200"
                            >
                                <span className="text-base font-bold mb-1 group-hover:scale-110 transition-transform">学习</span>
                                <span className="text-xs text-orange-400">继续学习</span>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onResult(5); }}
                                className="flex flex-col items-center py-3 px-2 rounded-xl bg-green-50 hover:bg-green-100 text-green-600 transition-colors group border border-green-200"
                            >
                                <span className="text-base font-bold mb-1 group-hover:scale-110 transition-transform">悉知</span>
                                <span className="text-xs text-green-400">已掌握</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Word Detail Popup */}
            {showWordDetail && (
                <WordDetailPopup
                    wordId={word.id}
                    onClose={() => setShowWordDetail(false)}
                />
            )}
        </>
    );
};

export default FlashcardMode;

