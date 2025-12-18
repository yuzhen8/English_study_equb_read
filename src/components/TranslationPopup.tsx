import React, { useState } from 'react';
import { TranslationResult } from '../services/TranslationService';
import './TranslationPopup.css';

interface TranslationPopupProps {
    result: TranslationResult | null;
    position: { x: number; y: number };
    onClose: () => void;
    onAddToVocabulary?: (word: string, translation: string) => void;
}

const TranslationPopup: React.FC<TranslationPopupProps> = ({
    result,
    position,
    onClose,
    onAddToVocabulary,
}) => {
    const [isAdding, setIsAdding] = useState(false);

    if (!result) return null;

    const handleAddToVocabulary = async () => {
        if (onAddToVocabulary) {
            setIsAdding(true);
            await onAddToVocabulary(result.text, result.translation);
            setIsAdding(false);
        }
    };

    return (
        <div
            className="translation-popup"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
            }}
        >
            <div className="translation-popup-header">
                <span className="translation-source">{result.source}</span>
                <button className="translation-close" onClick={onClose}>
                    ×
                </button>
            </div>

            <div className="translation-content">
                <div className="translation-original">
                    <strong>{result.text}</strong>
                </div>

                {result.pronunciation && (
                    <div className="translation-pronunciation">
                        [{result.pronunciation}]
                    </div>
                )}

                <div className="translation-result">
                    {result.translation}
                </div>

                {result.definitions && result.definitions.length > 0 && (
                    <div className="translation-definitions">
                        <strong>释义:</strong>
                        <ul>
                            {result.definitions.map((def, idx) => (
                                <li key={idx}>{def}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {result.examples && result.examples.length > 0 && (
                    <div className="translation-examples">
                        <strong>例句:</strong>
                        <ul>
                            {result.examples.map((ex, idx) => (
                                <li key={idx}>{ex}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {result.grammarAnalysis && (
                    <div className="translation-grammar">
                        <strong>语法分析:</strong>
                        <div className="grammar-content">
                            {result.grammarAnalysis}
                        </div>
                    </div>
                )}
            </div>

            <div className="translation-actions">
                <button
                    className="btn-add-vocabulary"
                    onClick={handleAddToVocabulary}
                    disabled={isAdding}
                >
                    {isAdding ? '添加中...' : '添加到生词本'}
                </button>
            </div>
        </div>
    );
};

export default TranslationPopup;
