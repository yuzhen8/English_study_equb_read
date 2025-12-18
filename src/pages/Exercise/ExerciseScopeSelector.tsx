import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, Layers, Type, MousePointerClick, Check, Headphones, FileText, HelpCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { WordStore } from '../../services/WordStore';
import { GroupStore, WordGroup } from '../../services/GroupStore';

// 练习模式图标和颜色映射
const modeConfig: Record<string, { icon: React.ElementType; color: string; title: string }> = {
    mixed: { icon: Zap, color: 'text-blue-600', title: '混合练习' },
    flashcard: { icon: Layers, color: 'text-orange-500', title: '单词闪卡' },
    choice: { icon: MousePointerClick, color: 'text-purple-500', title: '多项选择' },
    spelling: { icon: Type, color: 'text-teal-500', title: '拼写构建' },
    'listening-choice': { icon: Headphones, color: 'text-pink-500', title: '听力选择' },
    'listening-spelling': { icon: Headphones, color: 'text-amber-500', title: '听力拼写' },
    'fill-blank': { icon: FileText, color: 'text-cyan-500', title: '选词填空' },
};

// 范围选项类型
interface ScopeOption {
    id: string;
    type: 'preset' | 'group';
    label: string;
    subLabel?: string;
    helpText?: string;  // 帮助提示文本
    count: number;
    groupId?: string;
}

const ExerciseScopeSelector: React.FC = () => {
    const { mode } = useParams<{ mode: string }>();
    const navigate = useNavigate();

    const [scopes, setScopes] = useState<ScopeOption[]>([]);
    const [_groups, setGroups] = useState<WordGroup[]>([]);
    const [selectedScope, setSelectedScope] = useState<string>('today');
    const [loading, setLoading] = useState(true);
    const [showHelpPanel, setShowHelpPanel] = useState(false);  // 全局帮助面板状态
    const [_wordCounts, setWordCounts] = useState<{
        today: number;
        random: number;
        newWords: number;
        learning: number;
        total: number;
    }>({ today: 0, random: 0, newWords: 0, learning: 0, total: 0 });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // 获取所有单词统计
            const allWords = await WordStore.getWords();

            // 今天添加的单词（按天结算，从当天 0:00 开始）
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startOfToday = today.getTime();
            const todayWords = allWords.filter(w => w.addedAt >= startOfToday);

            // 新词（仅未开始学习的单词）
            const newWords = allWords.filter(w => w.status === 'new');

            // 学习中的单词
            const learningWords = allWords.filter(w => w.status === 'learning' || w.status === 'reviewed');

            setWordCounts({
                today: todayWords.length,
                random: allWords.length,
                newWords: newWords.length,
                learning: learningWords.length,
                total: allWords.length
            });

            // 获取群组
            const allGroups = await GroupStore.getGroups();
            setGroups(allGroups);

            // 构建预设范围选项
            const presetScopes: ScopeOption[] = [
                {
                    id: 'today',
                    type: 'preset',
                    label: '今天添加的单词',
                    count: todayWords.length,
                    helpText: '显示过24小时内添加到词典的单词'
                },
                {
                    id: 'random',
                    type: 'preset',
                    label: '随机词汇',
                    count: allWords.length,
                    helpText: '从所有单词中随机选择，包括新词、学习中和已掌握的单词'
                },
                {
                    id: 'newWords',
                    type: 'preset',
                    label: '随机新词',
                    count: newWords.length,
                    helpText: '从未开始学习的单词中随机选择（状态为"新"的单词）'
                },
                {
                    id: 'learning',
                    type: 'preset',
                    label: '随机学习单词',
                    count: learningWords.length,
                    helpText: '从正在学习的单词中随机选择（状态为"学习中"或"已复习"的单词）'
                },
            ];

            // 转换群组为范围选项
            const groupScopes: ScopeOption[] = allGroups.map(g => ({
                id: `group-${g.id}`,
                type: 'group' as const,
                label: g.name,
                subLabel: formatTimeAgo(g.updatedAt),
                count: g.wordIds.length,
                groupId: g.id
            }));

            setScopes([...presetScopes, ...groupScopes]);

            // 默认选择第一个有单词的选项
            const firstWithWords = [...presetScopes, ...groupScopes].find(s => s.count > 0);
            if (firstWithWords) {
                setSelectedScope(firstWithWords.id);
            }
        } catch (error) {
            console.error('Failed to load data', error);
        } finally {
            setLoading(false);
        }
    };

    // 格式化时间显示
    const formatTimeAgo = (timestamp: number): string => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `约 ${minutes} 分钟前`;
        if (hours < 24) return `约 ${hours} 小时前`;
        if (days < 30) return `约 ${days} 天前`;
        return new Date(timestamp).toLocaleDateString('zh-CN');
    };

    // 开始练习
    const handleStart = () => {
        const selectedOption = scopes.find(s => s.id === selectedScope);
        if (!selectedOption || selectedOption.count === 0) return;

        // 构建查询参数
        const params = new URLSearchParams();
        params.set('scope', selectedScope);

        if (selectedOption.type === 'group' && selectedOption.groupId) {
            params.set('groupId', selectedOption.groupId);
        }

        navigate(`/exercise/session/${mode}?${params.toString()}`);
    };

    const currentMode = modeConfig[mode || 'mixed'] || modeConfig.mixed;
    const ModeIcon = currentMode.icon;

    // 获取选中项的单词数量
    const selectedOption = scopes.find(s => s.id === selectedScope);
    const canStart = selectedOption && selectedOption.count > 0;

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // 分离预设选项和群组选项
    const presetOptions = scopes.filter(s => s.type === 'preset');
    const groupOptions = scopes.filter(s => s.type === 'group');

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden">
            {/* Header */}
            <div className="bg-white px-4 h-16 flex items-center sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/exercise')}
                        className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} className="text-gray-700" />
                    </button>
                    <div className="flex items-center gap-2">
                        <ModeIcon size={24} className={currentMode.color} />
                        <h1 className="text-xl font-bold text-gray-900">{currentMode.title}</h1>
                    </div>
                </div>
            </div>

            {/* Scope Options */}
            <div className="flex-1 px-4 py-4 space-y-6">
                {/* 随机范围 */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">随机</h3>
                        <button
                            onClick={() => setShowHelpPanel(!showHelpPanel)}
                            className={cn(
                                "p-1 rounded-full transition-colors",
                                showHelpPanel
                                    ? "text-blue-500 bg-blue-50"
                                    : "text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                            )}
                            title="查看说明"
                        >
                            <HelpCircle size={16} />
                        </button>
                    </div>

                    {/* 帮助面板 */}
                    {showHelpPanel && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 space-y-2">
                            <div><strong>今天添加的单词</strong>：显示今天（0:00 起）添加到词典的单词</div>
                            <div><strong>随机词汇</strong>：从所有单词中随机选择，包括新词、学习中和已掌握的单词</div>
                            <div><strong>随机新词</strong>：从未开始学习的单词中随机选择（状态为"新"的单词）</div>
                            <div><strong>随机学习单词</strong>：从正在学习的单词中随机选择（状态为"学习中"或"已复习"的单词）</div>
                        </div>
                    )}

                    <div className="space-y-2">
                        {presetOptions.map((option) => (
                            <ScopeOptionItem
                                key={option.id}
                                option={option}
                                selected={selectedScope === option.id}
                                onSelect={() => setSelectedScope(option.id)}
                            />
                        ))}
                    </div>
                </div>

                {/* 我的小组 */}
                {groupOptions.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider px-1">我的小组</h3>
                        <div className="space-y-2">
                            {groupOptions.map((option) => (
                                <ScopeOptionItem
                                    key={option.id}
                                    option={option}
                                    selected={selectedScope === option.id}
                                    onSelect={() => setSelectedScope(option.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Start Button - Sticky Footer */}
            <div className="sticky bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <button
                    onClick={handleStart}
                    disabled={!canStart}
                    className={cn(
                        "w-full py-4 rounded-2xl font-bold text-lg transition-all",
                        canStart
                            ? "bg-gray-900 text-white hover:bg-black active:scale-[0.98]"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    )}
                >
                    开始
                </button>
            </div>
        </div>
    );
};

// 范围选项组件
interface ScopeOptionItemProps {
    option: ScopeOption;
    selected: boolean;
    onSelect: () => void;
}

const ScopeOptionItem: React.FC<ScopeOptionItemProps> = ({ option, selected, onSelect }) => {
    return (
        <button
            onClick={onSelect}
            className={cn(
                "w-full p-4 rounded-xl flex items-center gap-3 transition-all text-left",
                selected
                    ? "bg-white border-2 border-green-500 shadow-sm"
                    : "bg-white border border-gray-100 hover:border-gray-200"
            )}
        >
            {/* Selection Indicator */}
            <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0",
                selected
                    ? "border-green-500 bg-green-500"
                    : "border-gray-300"
            )}>
                {selected && (
                    <Check size={12} className="text-white" strokeWidth={3} />
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900">{option.label}</h4>
                {option.subLabel && (
                    <p className="text-xs text-orange-500 mt-0.5">{option.subLabel}</p>
                )}
            </div>

            {/* Count */}
            <span className={cn(
                "text-sm font-medium",
                option.count > 0 ? "text-gray-600" : "text-gray-300"
            )}>
                {option.count}
            </span>
        </button>
    );
};

export default ExerciseScopeSelector;
