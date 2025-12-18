import React, { useState, useEffect } from 'react';
import { X, Sparkles, BrainCircuit, Globe, Copy, Check } from 'lucide-react';
import { TranslationResult, translationService } from '../services/TranslationService';
import './GrammarAnalysisPopup.css';

interface GrammarAnalysisPopupProps {
    text: string;
    context?: string;
    onClose: () => void;
}

const GrammarAnalysisPopup: React.FC<GrammarAnalysisPopupProps> = ({ text, context, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState<TranslationResult | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const analyze = async () => {
            setLoading(true);
            setResult(null); // Reset result

            try {
                // If we are using a slow AI provider, let's get a fast translation first
                // @ts-ignore
                const settings = await window.electronAPI.getSettings();
                const activeProvider = settings?.translationProvider || 'google';

                if (activeProvider === 'deepseek' || activeProvider === 'ollama') {
                    // Start slow AI analysis as main task
                    const aiPromise = translationService.translate(text, 'zh-CN', context);

                    // But also get a fast one from google to show SOMETHING immediately
                    try {
                        const googleProvider = translationService.getProvider('google');
                        if (googleProvider) {
                            const fastRes = await googleProvider.translate(text, 'zh-CN', context);
                            if (isMounted) {
                                // Set initial fast result
                                setResult({
                                    ...fastRes,
                                    grammarAnalysis: undefined // Explicitly no analysis yet
                                });
                            }
                        }
                    } catch (e) {
                        console.warn('Fast translation fallback failed', e);
                    }

                    // Then wait for the heavy lifting to finish
                    const fullRes = await aiPromise;
                    if (isMounted) {
                        setResult(fullRes);
                        setLoading(false);
                    }
                } else {
                    // Standard fast provider
                    const res = await translationService.translate(text, 'zh-CN', context);
                    if (isMounted) {
                        setResult(res);
                        setLoading(false);
                    }
                }
            } catch (error) {
                console.error('Grammar analysis failed:', error);
                if (isMounted) setLoading(false);
            }
        };

        analyze();
        return () => { isMounted = false; };
    }, [text, context]);

    const handleCopy = () => {
        if (!result) return;
        const content = `Text: ${text}\nTranslation: ${result.translation}\nAnalysis: ${result.grammarAnalysis || ''}`;
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="grammar-popup-overlay" onClick={onClose}>
            <div className="grammar-popup-card" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="grammar-popup-header">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                            <BrainCircuit size={18} />
                        </div>
                        <h3 className="font-bold text-gray-900">句子深度解析</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopy}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                            title="复制全部"
                        >
                            {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="grammar-popup-content custom-scrollbar">
                    {/* Original Text */}
                    <div className="content-section">
                        <div className="section-label">原句 (Original Sentence)</div>
                        <div className="text-original">{text}</div>
                    </div>

                    {/* Translation Area */}
                    {(result || !loading) ? (
                        <div className="content-section animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="section-label flex items-center gap-1.5">
                                <Globe size={12} /> 中文翻译 (Translation)
                            </div>
                            {result ? (
                                <div className="text-translation">{result.translation}</div>
                            ) : (
                                <div className="text-gray-400 italic text-sm py-2">分析中...</div>
                            )}
                        </div>
                    ) : null}

                    {/* Deep Analysis Area */}
                    {loading ? (
                        <div className="loading-state">
                            <div className="sparkle-container">
                                <Sparkles className="sparkle-icon animate-pulse" size={24} />
                            </div>
                            <p className="text-xs text-blue-600/80 font-medium">
                                {result ? '正在进行 AI 深度语法解析...' : '正在分析句子结构与语法...'}
                            </p>
                        </div>
                    ) : null}

                    {!loading && result?.grammarAnalysis ? (
                        <div className="content-section animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="section-label flex items-center gap-1.5">
                                <Sparkles size={12} /> 语法分析 (Grammar Analysis)
                            </div>
                            <div className="grammar-analysis-container">
                                <RenderAnalysis analysis={result.grammarAnalysis} />
                            </div>
                        </div>
                    ) : null}

                    {!loading && !result && (
                        <div className="error-state">
                            分析失败，请稍后重试。
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="grammar-popup-footer">
                    <span className="text-[10px] text-gray-400">Powered by {result?.source || 'AI'} Analysis Engine</span>
                    <button onClick={onClose} className="btn-confirm">知道了</button>
                </div>
            </div>
        </div>
    );
};

const GRAMMAR_TERMS_MAP: Record<string, string> = {
    // Sentence Types
    'Simple': '简单句',
    'Compound': '并列句',
    'Complex': '复合句',
    'Compound-Complex': '并列复合句',
    'Declarative': '陈述句',
    'Interrogative': '疑问句',
    'Imperative': '祈使句',
    'Exclamatory': '感叹句',

    // Tenses
    'Past Simple': '一般过去时',
    'Present Simple': '一般现在时',
    'Future Simple': '一般将来时',
    'Past Continuous': '过去进行时',
    'Present Continuous': '现在进行时',
    'Present Perfect': '现在完成时',
    'Past Perfect': '过去完成时',

    // Roles
    'Subject': '主语',
    'Predicate': '谓语',
    'Object': '宾语',
    'Attribute': '定语',
    'Adverbial': '状语',
    'Complement': '补语',
    'Appositive': '同位语',
    'Verb': '动词',
    'Noun': '名词',
    'Adjective': '形容词',
    'Conjunction': '连词',
    'Preposition': '介词',
    'Main Clause': '主句',
    'Subordinate Clause': '从句',
    'Relative Clause': '定语从句',
    'Adverbial Clause': '状语从句',
    'Object Clause': '宾语从句'
};

const translateTerm = (term: string) => {
    if (!term) return term;
    const trimmed = term.trim();
    return GRAMMAR_TERMS_MAP[trimmed] || term;
};

const RenderAnalysis: React.FC<{ analysis: any }> = ({ analysis }) => {
    // If it's already a string, just show it
    if (typeof analysis === 'string' && !analysis.trim().startsWith('{')) {
        return <div className="grammar-analysis-box">{analysis}</div>;
    }

    let data: any;
    try {
        data = typeof analysis === 'string' ? JSON.parse(analysis) : analysis;
    } catch (e) {
        return <div className="grammar-analysis-box">{String(analysis)}</div>;
    }

    // Normalize field names
    const sentenceType = data.sentenceType || data.sentence_type || data.type;
    const mainTense = data.mainTense || data.main_tense || data.tense;
    const structure = data.structure || data.structure_breakdown || data.breakdown;
    const components = data.components || data.detailed_components || data.segments || [];

    return (
        <div className="structured-analysis space-y-4">
            {/* Type and Tense Row */}
            <div className="grid grid-cols-2 gap-3">
                {sentenceType && (
                    <div className="analysis-card">
                        <span className="analysis-card-label">句式类型</span>
                        <span className="analysis-card-value font-bold">{translateTerm(sentenceType)}</span>
                    </div>
                )}
                {mainTense && (
                    <div className="analysis-card">
                        <span className="analysis-card-label">主要时态</span>
                        <span className="analysis-card-value font-bold">{translateTerm(mainTense)}</span>
                    </div>
                )}
            </div>

            {/* Structure Breakdown */}
            {structure && (
                <div className="analysis-card full">
                    <span className="analysis-card-label">结构分解</span>
                    <span className="analysis-card-value text-sm font-medium leading-relaxed">
                        {structure}
                    </span>
                </div>
            )}

            {/* Detailed Components */}
            {components && components.length > 0 && (
                <div className="components-list space-y-2">
                    <span className="analysis-card-label px-1">核心成分解析</span>
                    {components.map((item: any, idx: number) => {
                        const segment = item.segment || item.text || item.word;
                        const role = item.role || item.category || item.part;
                        const explanation = item.explanation || item.meaning || item.desc || item.detail;

                        return (
                            <div key={idx} className="component-item group">
                                <div className="flex items-start gap-3 flex-wrap">
                                    {segment && <div className="component-segment">{segment}</div>}
                                    {role && <div className="component-role">{translateTerm(role)}</div>}
                                </div>
                                {explanation && <div className="component-explanation">{explanation}</div>}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* If everything is empty but analysis is not, show as raw string */}
            {!sentenceType && !mainTense && !structure && (!components || components.length === 0) && (
                <div className="grammar-analysis-box">
                    {typeof analysis === 'object' ? JSON.stringify(analysis, null, 2) : String(analysis)}
                </div>
            )}
        </div>
    );
};

export default GrammarAnalysisPopup;
