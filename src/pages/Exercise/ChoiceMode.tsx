import React, { useState, useEffect } from 'react';
import { Word, WordStore } from '../../services/WordStore';
import { cn } from '../../lib/utils';
import { Check, X } from 'lucide-react';

interface ChoiceModeProps {
    word: Word & { lemma?: string };
    onResult: (quality: number) => void;
}

const ChoiceMode: React.FC<ChoiceModeProps> = ({ word, onResult }) => {
    const [options, setOptions] = useState<Word[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const loadOptions = async () => {
            // Get 3 distractors
            const distractors = await WordStore.getDistractors(word.id, 3);
            // Combine with correct word and shuffle
            const allOptions = [...distractors, word].sort(() => 0.5 - Math.random());
            setOptions(allOptions);
        };
        loadOptions();
        setSelectedId(null);
        setIsProcessing(false);
    }, [word.id]);

    const handleSelect = (id: string) => {
        if (isProcessing || selectedId) return;

        setSelectedId(id);
        setIsProcessing(true);

        const isCorrect = id === word.id;
        const quality = isCorrect ? 5 : 1; // 5 for perfect, 1 for fail

        // Delay to show result feedback
        setTimeout(() => {
            onResult(quality);
        }, 1500); // 1.5s delay to read feedback
    };

    if (options.length === 0) {
        return <div className="text-center py-10">Loading options...</div>;
    }

    return (
        <div className="max-w-md w-full mx-auto space-y-8">
            <div className="text-center py-8">
                <span className="inline-block px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                    Multiple Choice
                </span>
                <h2 className="text-4xl font-bold text-gray-900 mb-2">{word.lemma || word.text}</h2>
                <p className="text-gray-400 text-sm">Select the correct meaning</p>
            </div>

            <div className="space-y-3">
                {options.map((option) => {
                    const isSelected = selectedId === option.id;
                    const isCorrect = option.id === word.id;
                    // Reveal correct answer if selection made
                    const showCorrect = selectedId !== null && isCorrect;
                    const showWrong = isSelected && !isCorrect;

                    let buttonClass = "bg-white border-gray-100 hover:border-purple-200 hover:bg-purple-50 text-gray-700";
                    let icon = null;

                    if (showCorrect) {
                        buttonClass = "bg-green-100 border-green-300 text-green-800 ring-1 ring-green-300";
                        icon = <Check size={20} className="text-green-600" />;
                    } else if (showWrong) {
                        buttonClass = "bg-red-100 border-red-300 text-red-800 ring-1 ring-red-300";
                        icon = <X size={20} className="text-red-600" />;
                    } else if (selectedId && !isCorrect && !isSelected) {
                        // Dim other options when selection made
                        buttonClass = "bg-gray-50 border-transparent text-gray-300";
                    }

                    return (
                        <button
                            key={option.id}
                            disabled={selectedId !== null}
                            onClick={() => handleSelect(option.id)}
                            className={cn(
                                "w-full p-4 rounded-xl border-2 text-left transition-all duration-200 flex justify-between items-center shadow-sm",
                                buttonClass,
                                !selectedId && "hover:scale-[1.02] active:scale-[0.98]"
                            )}
                        >
                            <span className="font-medium truncate pr-4">{option.translation || "No translation"}</span>
                            {icon}
                        </button>
                    );
                })}
            </div>

            {/* Help/Hint Text (Hidden until wrong answer or manual hint request - simplified for now) */}
            {selectedId && selectedId !== word.id && (
                <div className="text-center text-red-500 text-sm animate-pulse">
                    Correct answer: {word.translation}
                </div>
            )}
        </div>
    );
};

export default ChoiceMode;
