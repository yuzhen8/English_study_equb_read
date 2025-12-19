import React, { useState, useEffect } from 'react';
import { Word, WordStore } from '../../../services/WordStore';
import { cn } from '../../../lib/utils';
import { Check, X, Volume2, BookOpen } from 'lucide-react';
import WordDetailPopup from '../../../components/WordDetailPopup';

interface FillBlankModeProps {
    word: Word & { lemma?: string };
    onResult: (quality: number) => void;
}

/**
 * 选词填空 - 提供原句，对应单词为空，从4个单词选项中选择正确的
 */
const FillBlankMode: React.FC<FillBlankModeProps> = ({ word, onResult }) => {
    const [options, setOptions] = useState<Word[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showWordDetail, setShowWordDetail] = useState(false);
    const [sentenceWithBlank, setSentenceWithBlank] = useState<string>('');

    // 转义正则表达式特殊字符
    const escapeRegExp = (string: string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    useEffect(() => {
        const loadOptions = async () => {
            const distractors = await WordStore.getDistractors(word.id, 3);
            const allOptions = [...distractors, word].sort(() => 0.5 - Math.random());
            setOptions(allOptions);
        };
        loadOptions();
        setSelectedId(null);
        setIsProcessing(false);

        // 处理原句，将单词替换为空白
        // 注意：使用word.text（原词）而不是word.lemma（原型）
        // 因为原句中保存的是实际出现的形式（如 "found"），而不是原型（如 "find"）
        if (word.context) {
            const wordToReplace = word.text; // 使用原词匹配
            const regex = new RegExp(`\\b${escapeRegExp(wordToReplace)}\\b`, 'gi');
            const blanked = word.context.replace(regex, '______');
            setSentenceWithBlank(blanked);
        } else {
            setSentenceWithBlank(`The word is ______.`);
        }
    }, [word.id, word.context, word.text]);

    const playAudio = () => {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word.lemma || word.text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        speechSynthesis.speak(utterance);
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

    const hasValidContext = word.context && word.context.trim().length > 0;

    // 渲染高亮的句子（答案后显示）
    const renderHighlightedSentence = () => {
        const context = word.context || '';
        const parts = context.split(new RegExp(`(\\b${escapeRegExp(word.text)}\\b)`, 'gi'));

        return parts.map((part, index) => {
            const isWord = part.toLowerCase() === word.text.toLowerCase();
            return (
                <span
                    key={index}
                    className={isWord ? "font-bold text-cyan-400 underline underline-offset-4 decoration-cyan-400" : ""}
                >
                    {part}
                </span>
            );
        });
    };

    // 渲染带空白的句子
    const renderBlankSentence = () => {
        const parts = sentenceWithBlank.split('______');
        return parts.map((part, index, arr) => (
            <React.Fragment key={index}>
                {part}
                {index < arr.length - 1 && (
                    <span className="inline-block w-20 h-8 mx-1 border-b-2 border-cyan-400 box-shadow-glow align-bottom" />
                )}
            </React.Fragment>
        ));
    };

    return (
        <>
            <div className="max-w-md w-full mx-auto space-y-6">
                {/* 标题区域 */}
                <div className="text-center py-4">
                    <span className="inline-block px-3 py-1 bg-white/10 text-cyan-300 border border-cyan-500/30 rounded-full text-xs font-bold uppercase tracking-wider mb-4 backdrop-blur-md shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                        Fill in the Blank
                    </span>
                    <p className="text-white/40 text-sm mb-6">选择正确的单词填入空白处</p>
                    {/* 音频和详情按钮 */}
                    <div className="flex items-center justify-center gap-3">
                        <button
                            onClick={playAudio}
                            className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors px-4 py-2 rounded-full hover:bg-white/10 border border-white/5 hover:border-white/20 shadow-sm glass-button"
                        >
                            <Volume2 size={18} />
                            <span className="text-sm font-medium">播放</span>
                        </button>
                        <button
                            onClick={() => setShowWordDetail(true)}
                            className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors px-4 py-2 rounded-full hover:bg-white/10 border border-white/5 hover:border-white/20 shadow-sm glass-button"
                        >
                            <BookOpen size={18} />
                            <span className="text-sm font-medium">详情</span>
                        </button>
                    </div>
                </div>

                {/* 原句显示区域 */}
                <div className="glass-card p-6 border border-white/10 shadow-lg">
                    {hasValidContext ? (
                        <p className="text-xl text-white leading-relaxed text-center font-medium">
                            {selectedId ? renderHighlightedSentence() : renderBlankSentence()}
                        </p>
                    ) : (
                        <div className="text-center text-white/40">
                            <p className="mb-2">该单词没有原句</p>
                            <p className="text-lg text-white/60">请选择正确的单词：<span className="font-bold text-cyan-400">{word.translation}</span></p>
                        </div>
                    )}

                    {/* 翻译提示 */}
                    {selectedId && (
                        <div className="mt-4 pt-4 border-t border-white/10 animate-fade-in">
                            <p className="text-white/60 text-sm whitespace-pre-line text-left">
                                <span className="font-medium text-white">{word.lemma || word.text}：</span>
                                {word.translation.replace(/\\n/g, '\n')}
                            </p>
                            <div className="flex items-center justify-center gap-3 mt-4">
                                <button
                                    onClick={playAudio}
                                    className="inline-flex items-center gap-2 text-cyan-300 hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-white/10 text-sm"
                                >
                                    <Volume2 size={16} />
                                    <span>播放</span>
                                </button>
                                <button
                                    onClick={() => setShowWordDetail(true)}
                                    className="inline-flex items-center gap-2 text-purple-300 hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-white/10 text-sm"
                                >
                                    <BookOpen size={16} />
                                    <span>详情</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 选项列表 - 单词选项 */}
                <div className="grid grid-cols-2 gap-3">
                    {options.map((option) => {
                        const isSelected = selectedId === option.id;
                        const isCorrect = option.id === word.id;
                        const showCorrect = selectedId !== null && isCorrect;
                        const showWrong = isSelected && !isCorrect;

                        let buttonClass = "glass-card bg-white/5 border-white/10 hover:bg-white/10 hover:border-cyan-400/50 text-white shadow-sm hover:shadow-cyan-500/20";
                        let icon = null;

                        if (showCorrect) {
                            buttonClass = "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]";
                            icon = <Check size={18} className="text-emerald-400" />;
                        } else if (showWrong) {
                            buttonClass = "bg-red-500/20 border-red-500/50 text-red-300 ring-1 ring-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]";
                            icon = <X size={18} className="text-red-400" />;
                        } else if (selectedId && !isCorrect && !isSelected) {
                            buttonClass = "bg-white/5 border-transparent text-white/20 opacity-50 cursor-not-allowed";
                        }

                        return (
                            <button
                                key={option.id}
                                disabled={selectedId !== null}
                                onClick={() => handleSelect(option.id)}
                                className={cn(
                                    "p-4 rounded-xl border-2 text-center transition-all duration-200 flex items-center justify-center gap-2 shadow-sm font-medium",
                                    buttonClass,
                                    !selectedId && "hover:scale-[1.02] active:scale-[0.98]"
                                )}
                            >
                                <span>{option.lemma || option.text}</span>
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

export default FillBlankMode;
