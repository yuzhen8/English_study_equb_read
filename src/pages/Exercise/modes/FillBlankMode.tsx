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
        }, 1500);
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
                    className={isWord ? "font-bold text-cyan-600 underline underline-offset-4" : ""}
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
                    <span className="inline-block w-20 h-8 mx-1 border-b-2 border-cyan-400 align-bottom" />
                )}
            </React.Fragment>
        ));
    };

    return (
        <>
            <div className="max-w-md w-full mx-auto space-y-6">
                {/* 标题区域 */}
                <div className="text-center py-4">
                    <span className="inline-block px-3 py-1 bg-cyan-50 text-cyan-600 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                        Fill in the Blank
                    </span>
                    <p className="text-gray-500 text-sm mb-3">选择正确的单词填入空白处</p>
                    {/* 音频和详情按钮 */}
                    <div className="flex items-center justify-center gap-2">
                        <button
                            onClick={playAudio}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors px-3 py-1.5 rounded-full hover:bg-blue-50 text-sm"
                        >
                            <Volume2 size={16} />
                            <span>播放</span>
                        </button>
                        <button
                            onClick={() => setShowWordDetail(true)}
                            className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 transition-colors px-3 py-1.5 rounded-full hover:bg-purple-50 text-sm"
                        >
                            <BookOpen size={16} />
                            <span>详情</span>
                        </button>
                    </div>
                </div>

                {/* 原句显示区域 */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    {hasValidContext ? (
                        <p className="text-xl text-gray-800 leading-relaxed text-center">
                            {selectedId ? renderHighlightedSentence() : renderBlankSentence()}
                        </p>
                    ) : (
                        <div className="text-center text-gray-400">
                            <p className="mb-2">该单词没有原句</p>
                            <p className="text-lg">请选择正确的单词：<span className="font-bold text-cyan-600">{word.translation}</span></p>
                        </div>
                    )}

                    {/* 翻译提示 */}
                    {selectedId && (
                        <div className="mt-4 pt-4 border-t border-gray-100 animate-fade-in">
                            <p className="text-gray-600 text-sm whitespace-pre-line text-left">
                                <span className="font-medium text-gray-800">{word.lemma || word.text}：</span>
                                {word.translation.replace(/\\n/g, '\n')}
                            </p>
                            <div className="flex items-center justify-center gap-3 mt-3">
                                <button
                                    onClick={playAudio}
                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors px-3 py-1.5 rounded-full hover:bg-blue-50 text-sm"
                                >
                                    <Volume2 size={16} />
                                    <span>播放</span>
                                </button>
                                <button
                                    onClick={() => setShowWordDetail(true)}
                                    className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 transition-colors px-3 py-1.5 rounded-full hover:bg-purple-50 text-sm"
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

                        let buttonClass = "bg-white border-gray-100 hover:border-cyan-300 hover:bg-cyan-50 text-gray-700";
                        let icon = null;

                        if (showCorrect) {
                            buttonClass = "bg-green-100 border-green-300 text-green-800 ring-1 ring-green-300";
                            icon = <Check size={18} className="text-green-600" />;
                        } else if (showWrong) {
                            buttonClass = "bg-red-100 border-red-300 text-red-800 ring-1 ring-red-300";
                            icon = <X size={18} className="text-red-600" />;
                        } else if (selectedId && !isCorrect && !isSelected) {
                            buttonClass = "bg-gray-50 border-transparent text-gray-300";
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
