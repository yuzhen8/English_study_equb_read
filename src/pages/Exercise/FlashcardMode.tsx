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
                        className="absolute inset-0 glass-card flex flex-col items-center justify-center p-8 border border-white/20 hover:border-indigo-400/50 transition-colors shadow-[0_0_40px_rgba(0,0,0,0.2)]"
                        style={{
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden'
                        }}
                    >
                        {/* Glow effect */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

                        <div className="text-center space-y-6 relative z-10">
                            <span className="inline-block px-3 py-1 bg-white/10 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                                Flashcard
                            </span>

                            <div>
                                <h2 className="text-5xl font-bold text-white mb-4 drop-shadow-lg tracking-tight">{word.lemma || word.text}</h2>
                                <div className="flex items-center justify-center gap-3">
                                    <button
                                        onClick={playAudio}
                                        className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors p-3 rounded-full hover:bg-white/10 glass-button"
                                    >
                                        <Volume2 size={28} />
                                    </button>
                                    <button
                                        onClick={handleShowDetail}
                                        className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors p-3 rounded-full hover:bg-white/10 glass-button"
                                        title="查看单词详情"
                                    >
                                        <BookOpen size={28} />
                                    </button>
                                </div>
                            </div>

                            <p className="text-white/30 text-sm animate-pulse">Tap to flip</p>
                        </div>
                    </div>

                    {/* Back */}
                    <div
                        className="absolute inset-0 glass-card bg-black/80 flex flex-col overflow-hidden border border-white/20"
                        style={{
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)'
                        }}
                    >
                        <div className="flex-1 flex flex-col justify-center p-8 space-y-6">
                            <div className="text-center">
                                <h3 className="text-2xl font-bold text-white mb-2 tracking-wide">{word.lemma || word.text}</h3>
                                <div className="w-12 h-1 bg-indigo-500 rounded-full mx-auto box-shadow-glow" />
                            </div>

                            <div className="space-y-4 w-full">
                                {/* Phonetic */}
                                {word.phonetic && (
                                    <div className="text-center">
                                        <p className="text-lg text-indigo-300 font-mono">/{word.phonetic}/</p>
                                    </div>
                                )}

                                {/* Translation - 左对齐 */}
                                <div>
                                    <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">释义</h4>
                                    <p className="text-xl text-white font-medium whitespace-pre-line text-left leading-relaxed">{word.translation.replace(/\\n/g, '\n')}</p>
                                </div>

                                {/* Context/Original sentence */}
                                {word.context && (
                                    <div>
                                        <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">原句</h4>
                                        <p className="text-white/80 italic text-left border-l-2 border-white/10 pl-3">"{word.context}"</p>
                                    </div>
                                )}
                            </div>

                            {/* 单词详情按钮 */}
                            <div className="text-center pt-2">
                                <button
                                    onClick={handleShowDetail}
                                    className="inline-flex items-center gap-2 text-indigo-300 hover:text-white transition-colors px-4 py-2 rounded-full hover:bg-white/10 border border-white/5 hover:border-white/20"
                                >
                                    <BookOpen size={16} />
                                    <span className="text-sm font-medium">查看详情</span>
                                </button>
                            </div>
                        </div>

                        {/* Gradient overlay for bottom separation */}
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                        {/* Controls - Only 2 buttons */}
                        <div className="p-4 grid grid-cols-2 gap-3 bg-black/40 backdrop-blur-md">
                            <button
                                onClick={(e) => { e.stopPropagation(); onResult(1); }}
                                className="flex flex-col items-center py-3 px-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition-colors group border border-orange-500/20 hover:border-orange-500/40"
                            >
                                <span className="text-base font-bold mb-1 group-hover:scale-110 transition-transform">学习</span>
                                <span className="text-xs text-orange-400/60">继续学习</span>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onResult(5); }}
                                className="flex flex-col items-center py-3 px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors group border border-emerald-500/20 hover:border-emerald-500/40"
                            >
                                <span className="text-base font-bold mb-1 group-hover:scale-110 transition-transform">悉知</span>
                                <span className="text-xs text-emerald-400/60">已掌握</span>
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

