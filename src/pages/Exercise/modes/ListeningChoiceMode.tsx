import React, { useState, useEffect } from 'react';
import { Word, WordStore } from '../../../services/WordStore';
import { cn } from '../../../lib/utils';
import { Check, X, Volume2, BookOpen } from 'lucide-react';
import WordDetailPopup from '../../../components/WordDetailPopup';

interface ListeningChoiceModeProps {
    word: Word & { lemma?: string };
    onResult: (quality: number) => void;
}

/**
 * 多项选择(听) - 根据单词发音选择正确的中文解释
 */
const ListeningChoiceMode: React.FC<ListeningChoiceModeProps> = ({ word, onResult }) => {
    const [options, setOptions] = useState<Word[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showWordDetail, setShowWordDetail] = useState(false);
    const [hasPlayed, setHasPlayed] = useState(false);

    useEffect(() => {
        const loadOptions = async () => {
            const distractors = await WordStore.getDistractors(word.id, 3);
            const allOptions = [...distractors, word].sort(() => 0.5 - Math.random());
            setOptions(allOptions);
        };
        loadOptions();
        setSelectedId(null);
        setIsProcessing(false);
        setHasPlayed(false);

        // 自动播放一次
        setTimeout(() => playAudio(), 500);
    }, [word.id]);

    const playAudio = () => {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word.lemma || word.text);
        utterance.lang = 'en-US';
        utterance.rate = 0.85;
        speechSynthesis.speak(utterance);
        setHasPlayed(true);
    };

    const handleSelect = (id: string) => {
        if (isProcessing || selectedId) return;

        setSelectedId(id);
        setIsProcessing(true);

        const isCorrect = id === word.id;
        const quality = isCorrect ? 5 : 1;

        setTimeout(() => {
            onResult(quality);
        }, 600);
    };

    if (options.length === 0) {
        return <div className="text-center py-10">Loading options...</div>;
    }

    return (
        <>
            <div className="max-w-md w-full mx-auto space-y-4">
                {/* 听力提示区域 */}
                <div className="text-center py-4">
                    <span className="inline-block px-3 py-1 bg-white/10 text-pink-300 border border-pink-500/30 rounded-full text-xs font-bold uppercase tracking-wider mb-4 backdrop-blur-md shadow-[0_0_10px_rgba(236,72,153,0.2)]">
                        Listening Choice
                    </span>

                    {/* 大音频按钮 */}
                    <div className="flex flex-col items-center gap-3 mb-3">
                        <button
                            onClick={playAudio}
                            className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 transition-all hover:scale-105 active:scale-95 border border-white/20"
                        >
                            <Volume2 size={28} />
                        </button>
                        <p className="text-white/40 text-sm">
                            {hasPlayed ? '点击重新播放' : '正在播放...'}
                        </p>
                    </div>

                    {/* 详情按钮 - 始终显示 */}
                    <button
                        onClick={() => setShowWordDetail(true)}
                        className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors px-4 py-2 rounded-full hover:bg-white/10 border border-white/5 hover:border-white/20 glass-button mb-4"
                    >
                        <BookOpen size={16} />
                        <span className="text-sm font-medium">查看详情</span>
                    </button>

                    {/* 显示答案后显示单词 */}
                    {selectedId && (
                        <div className="animate-fade-in">
                            <h2 className="text-2xl font-bold text-white drop-shadow-md">{word.lemma || word.text}</h2>
                        </div>
                    )}

                    {!selectedId && (
                        <p className="text-white/40 text-sm">根据发音选择正确的中文释义</p>
                    )}
                </div>

                {/* 选项列表 */}
                <div className="space-y-2">
                    {options.map((option) => {
                        const isSelected = selectedId === option.id;
                        const isCorrect = option.id === word.id;
                        const showCorrect = selectedId !== null && isCorrect;
                        const showWrong = isSelected && !isCorrect;

                        let buttonClass = "glass-card bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5";
                        let icon = null;

                        if (showCorrect) {
                            buttonClass = "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]";
                            icon = <Check size={20} className="text-emerald-400 flex-shrink-0" />;
                        } else if (showWrong) {
                            buttonClass = "bg-red-500/20 border-red-500/50 text-red-300 ring-1 ring-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]";
                            icon = <X size={20} className="text-red-400 flex-shrink-0" />;
                        } else if (selectedId && !isCorrect && !isSelected) {
                            buttonClass = "bg-white/5 border-transparent text-white/20 opacity-50 cursor-not-allowed";
                        }

                        return (
                            <button
                                key={option.id}
                                disabled={selectedId !== null}
                                onClick={() => handleSelect(option.id)}
                                className={cn(
                                    "w-full p-3 rounded-xl border-2 text-left transition-all duration-200 flex justify-between items-start shadow-sm",
                                    buttonClass,
                                    !selectedId && "hover:scale-[1.01] active:scale-[0.99]"
                                )}
                            >
                                <span className="font-medium pr-4 whitespace-pre-line text-left text-sm">
                                    {(option.translation || "No translation").replace(/\\n/g, '\n')}
                                </span>
                                {icon}
                            </button>
                        );
                    })}
                </div>
            </div>

            {showWordDetail && (
                <WordDetailPopup
                    wordId={word.id}
                    onClose={() => setShowWordDetail(false)}
                />
            )}
        </>
    );
};

export default ListeningChoiceMode;
