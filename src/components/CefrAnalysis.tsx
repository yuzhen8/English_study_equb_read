/**
 * CEFR Analysis Components
 * 
 * Provides vocabulary difficulty analysis for EPUB books
 */

import React, { useState, useEffect } from 'react';
import { X, BarChart3, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { CefrAnalysisSummary } from '../services/LibraryStore';

// CEFR 等级颜色配置
export const CEFR_COLORS: Record<string, string> = {
    'A1': '#22c55e', // 绿色 - 初级
    'A2': '#84cc16', // 青绿色
    'B1': '#eab308', // 黄色 - 中级
    'B2': '#f97316', // 橙色
    'C1': '#ef4444', // 红色 - 高级
    'C2': '#dc2626', // 深红色
    'Unknown': '#9ca3af', // 灰色 - 未知
};

// 等级描述
const CEFR_DESCRIPTIONS: Record<string, string> = {
    'A1': '入门级 - 基础词汇',
    'A2': '初级 - 常用词汇',
    'B1': '中级 - 进阶词汇',
    'B2': '中高级 - 学术词汇',
    'C1': '高级 - 专业词汇',
    'C2': '精通级 - 罕见词汇',
};

interface CefrAnalysisPopupProps {
    bookTitle: string;
    onClose: () => void;
    // 新分析模式
    extractedText?: string;
    onAnalysisComplete?: (result: CefrAnalysisSummary) => void;
    // 缓存模式
    cachedResult?: CefrAnalysisSummary;
}

export const CefrAnalysisPopup: React.FC<CefrAnalysisPopupProps> = ({
    bookTitle,
    onClose,
    extractedText,
    onAnalysisComplete,
    cachedResult
}) => {
    const [loading, setLoading] = useState(!cachedResult);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<CefrAnalysisSummary | null>(cachedResult || null);

    useEffect(() => {
        // 如果有缓存结果则直接显示，否则执行分析
        if (cachedResult) {
            setResult(cachedResult);
            setLoading(false);
        } else if (extractedText) {
            runAnalysis();
        }
    }, [extractedText, cachedResult]);

    const runAnalysis = async () => {
        if (!extractedText) return;

        setLoading(true);
        setError(null);

        try {
            const response = await window.electronAPI.analyzeCEFR(extractedText);

            if (response.success && response.data) {
                // 转换为 CefrAnalysisSummary 格式
                const summary: CefrAnalysisSummary = {
                    primaryLevel: response.data.primaryLevel,
                    difficultyScore: response.data.difficultyScore,
                    totalWords: response.data.totalWords,
                    uniqueWords: response.data.uniqueWords,
                    analyzedAt: Date.now(),
                    distribution: response.data.distribution,
                    unknownWordsRatio: response.data.unknownWordsRatio,
                    sampleUnknownWords: response.data.sampleUnknownWords,
                    metrics: response.data.metrics
                };
                setResult(summary);
                // 通知父组件分析完成
                onAnalysisComplete?.(summary);
            } else {
                setError(response.error || '分析失败');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '未知错误');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative bg-white rounded-2xl w-full max-w-lg mx-4 shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <BarChart3 size={20} className="text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">
                                {cachedResult ? '词汇难度报告' : '词汇难度分析'}
                            </h3>
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{bookTitle}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Loader2 size={40} className="text-indigo-500 animate-spin mb-4" />
                            <p className="text-gray-600 font-medium">正在分析词汇...</p>
                            <p className="text-gray-400 text-sm mt-1">这可能需要几秒钟</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <AlertCircle size={40} className="text-red-400 mb-4" />
                            <p className="text-gray-600 font-medium">分析失败</p>
                            <p className="text-red-500 text-sm mt-1">{error}</p>
                            <button
                                onClick={runAnalysis}
                                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                            >
                                重试
                            </button>
                        </div>
                    ) : result ? (
                        <div className="space-y-5">
                            {/* 分析时间 (仅缓存模式显示) */}
                            {cachedResult && result.analyzedAt && (
                                <div className="text-xs text-gray-400 text-right">
                                    分析于 {new Date(result.analyzedAt).toLocaleDateString()}
                                </div>
                            )}

                            {/* 总体统计卡片 */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4">
                                    <p className="text-indigo-600 text-xs font-medium">总词数</p>
                                    <p className="text-2xl font-bold text-indigo-700">{result.totalWords.toLocaleString()}</p>
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                                    <p className="text-purple-600 text-xs font-medium">去重词数</p>
                                    <p className="text-2xl font-bold text-purple-700">{result.uniqueWords.toLocaleString()}</p>
                                </div>
                            </div>

                            {/* 主要等级指示 */}
                            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-amber-700 text-xs font-medium">主要难度等级</p>
                                        <p className="text-3xl font-bold text-amber-600 mt-1">{result.primaryLevel}</p>
                                        <p className="text-amber-600 text-xs mt-1">
                                            {CEFR_DESCRIPTIONS[result.primaryLevel] || ''}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-amber-700 text-xs font-medium">难度评分</p>
                                        <p className="text-2xl font-bold text-amber-600">{result.difficultyScore}/6</p>
                                    </div>
                                </div>
                            </div>

                            {/* CEFR 等级分布 */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <h4 className="text-sm font-bold text-gray-700 mb-3">CEFR 等级分布</h4>
                                <div className="space-y-2">
                                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Unknown'].map(level => {
                                        const data = result.distribution[level];
                                        if (!data || data.count === 0) return null;
                                        return (
                                            <div key={level} className="flex items-center gap-3">
                                                <div
                                                    className="w-12 h-6 rounded flex items-center justify-center text-white text-xs font-bold shrink-0"
                                                    style={{ backgroundColor: CEFR_COLORS[level] }}
                                                >
                                                    {level === 'Unknown' ? '?' : level}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-500"
                                                            style={{
                                                                width: `${Math.max(data.percentage, 2)}%`,
                                                                backgroundColor: CEFR_COLORS[level]
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="text-xs text-gray-600 w-24 text-right shrink-0">
                                                    {data.percentage.toFixed(1)}% ({data.uniqueWords}词)
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 未知词示例 */}
                            {result.sampleUnknownWords && result.sampleUnknownWords.length > 0 && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <h4 className="text-sm font-bold text-gray-700 mb-2">
                                        未收录词汇示例 ({result.unknownWordsRatio.toFixed(1)}%)
                                    </h4>
                                    <div className="flex flex-wrap gap-1">
                                        {result.sampleUnknownWords.slice(0, 20).map((word, i) => (
                                            <span
                                                key={i}
                                                className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs"
                                            >
                                                {word}
                                            </span>
                                        ))}
                                        {result.sampleUnknownWords.length > 20 && (
                                            <span className="px-2 py-0.5 text-gray-400 text-xs">
                                                +{result.sampleUnknownWords.length - 20} 更多
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 详细分析指标 (New) */}
                            {result.metrics && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {/* 句法复杂度 */}
                                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3">
                                        <h4 className="text-xs font-bold text-blue-700 mb-2 uppercase tracking-wider">句法分析</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">平均句长</span>
                                                <span className="font-medium text-gray-900">{(result.metrics.avg_sentence_length || 0).toFixed(1)} 词</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">从句密度</span>
                                                <span className="font-medium text-gray-900">{((result.metrics.syntax?.clause_density || 0) * 100).toFixed(0)}%</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">句子嵌套</span>
                                                <span className="font-medium text-gray-900">{(result.metrics.syntax?.avg_tree_depth || 0).toFixed(1)} 层</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 语篇与认知 */}
                                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3">
                                        <h4 className="text-xs font-bold text-indigo-700 mb-2 uppercase tracking-wider">语篇分析</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">抽象词比例</span>
                                                <span className="font-medium text-gray-900">{((result.metrics.discourse?.abstract_noun_ratio || 0) * 100).toFixed(1)}%</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">逻辑连词</span>
                                                <span className="font-medium text-gray-900">{(result.metrics.discourse?.connective_sophistication || 0) > 0.1 ? '丰富' : '基础'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">句子总数</span>
                                                <span className="font-medium text-gray-900">{result.metrics.sentence_count || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}


                            {/* 评级逻辑说明 (New) */}
                            {result.metrics?.lexical_score !== undefined && (
                                <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4">
                                    <h4 className="text-sm font-bold text-orange-800 mb-3 flex items-center gap-2">
                                        <div className="w-1.5 h-4 bg-orange-500 rounded-full"></div>
                                        评级判定逻辑
                                    </h4>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between items-center pb-2 border-b border-orange-200/50">
                                            <span className="text-gray-600">词汇基准分 (Lexical)</span>
                                            <span className="font-mono font-medium text-gray-900">{result.metrics.lexical_score?.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-gray-500">
                                            <span>+ 句法复杂度加成</span>
                                            <span className="font-mono text-green-600">
                                                +{((result.metrics.syntax?.clause_density || 0) * 0.5).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-gray-500 pb-2 border-b border-orange-200/50">
                                            <span>+ 语篇复杂度加成</span>
                                            <span className="font-mono text-green-600">
                                                +{((result.metrics.discourse?.connective_sophistication || 0) * 0.5).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center pt-1">
                                            <span className="font-bold text-orange-900">最终得分</span>
                                            <div className="text-right">
                                                <div className="font-mono font-bold text-xl text-orange-600">
                                                    {result.metrics.adjusted_score?.toFixed(2)}
                                                </div>
                                                <div className="text-[10px] text-gray-400">
                                                    (对应等级: {result.primaryLevel})
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-white/50 rounded p-2 text-[10px] text-gray-500 leading-relaxed mt-2">
                                            <span className="font-semibold">评分标准：</span>
                                            1.0-1.5=A1, 1.5-2.5=A2, 2.5-3.5=B1, 3.5-4.5=B2, 4.5-5.5=C1, &gt;5.5=C2
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </div >
        </div >
    );
};

// CEFR 等级标签 (显示在书籍封面左上角)
interface CefrLevelBadgeProps {
    level: string;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
}

export const CefrLevelBadge: React.FC<CefrLevelBadgeProps> = ({ level, className, onClick }) => (
    <div
        onClick={onClick}
        className={cn(
            "px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-sm transition-transform",
            onClick ? "cursor-pointer hover:scale-105 active:scale-95" : "",
            className
        )}
        style={{ backgroundColor: CEFR_COLORS[level] || CEFR_COLORS['Unknown'] }}
        title={`难度等级: ${level}${onClick ? ' (点击查看报告)' : ''}`}
    >
        {level}
    </div>
);

export default CefrAnalysisPopup;
