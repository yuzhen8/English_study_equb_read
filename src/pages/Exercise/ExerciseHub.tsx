import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Zap, Layers, Type, MousePointerClick, Pencil, HelpCircle, RefreshCw, Clock, Headphones, FileText, Settings2 } from 'lucide-react';
import { WordStore } from '../../services/WordStore';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from 'recharts';
import ExerciseSettings, { loadSettings } from './ExerciseSettings';

const ExerciseHub: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        dueCount: 0,
        newCount: 0,
        learningCount: 0,
        reviewedCount: 0,
        masteredCount: 0,
        totalCount: 0
    });
    const [dailyGoal, setDailyGoal] = useState(10);
    const [todayLearned, setTodayLearned] = useState(0);
    const [weekData, setWeekData] = useState<{ day: string; count: number }[]>([]);
    const [nextReviewHours, setNextReviewHours] = useState<number | null>(null);
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        const data = await WordStore.getStats();
        // 映射getStats返回的结构到组件期望的结构
        setStats({
            dueCount: data.dueCount || 0,
            newCount: data.statusCounts?.new || 0,
            learningCount: data.statusCounts?.learning || 0,
            reviewedCount: data.statusCounts?.reviewed || 0,
            masteredCount: data.statusCounts?.mastered || 0,
            totalCount: data.total || 0
        });

        // 计算今天学习的单词数（基于reviewCount > 0的单词）
        const allWords = await WordStore.getWords();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const todayStart = now - (now % oneDay);

        // 今天复习过的单词
        const todayReviewed = allWords.filter(w =>
            w.lastReviewedAt && w.lastReviewedAt >= todayStart
        ).length;
        setTodayLearned(todayReviewed || allWords.filter(w => now - w.addedAt < oneDay).length);

        // 生成最近7天的数据
        const days = ['周三', '周四', '周五', '周六', '周日', '周一', '周二'];
        const today = new Date().getDay();
        const weekStats = days.map((day, index) => {
            // 简化：随机生成模拟数据
            const isToday = index === days.length - 1;
            return {
                day,
                count: isToday ? todayReviewed : Math.floor(Math.random() * 15)
            };
        });
        setWeekData(weekStats);

        // 计算下一次复习时间
        const dueWords = await WordStore.getDueWords();
        if (dueWords.length === 0) {
            // 找最近要到期的单词
            const wordsWithNextReview = allWords.filter(w => w.nextReviewAt);
            if (wordsWithNextReview.length > 0) {
                const nextWord = wordsWithNextReview.sort((a, b) =>
                    (a.nextReviewAt || 0) - (b.nextReviewAt || 0)
                )[0];
                if (nextWord.nextReviewAt) {
                    const hoursUntil = Math.ceil((nextWord.nextReviewAt - now) / (1000 * 60 * 60));
                    setNextReviewHours(hoursUntil > 0 ? hoursUntil : null);
                }
            }
        }
    };

    const handleStartMode = (mode: string) => {
        navigate(`/exercise/scope/${mode}`);
    };

    // 开始混合练习（直接进入，只学习新词）
    const handleStartMixedPractice = () => {
        const settings = loadSettings();
        // 直接进入训练，只选择未学习过的单词（status=new）
        navigate(`/exercise/session/mixed?scope=new&limit=${settings.wordCount}`);
    };

    // 未学习过的单词数量（新词）
    const newWordsCount = stats.newCount;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white px-4 pt-12 pb-4 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">锻炼</h1>
                <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <Settings2 size={22} className="text-gray-500" />
                </button>
            </div>

            <div className="p-4 space-y-6">
                {/* 训练的每日统计 */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4">训练的每日统计</h3>

                    <div className="flex gap-4">
                        {/* 左侧：图表 */}
                        <div className="flex-1">
                            <p className="text-xs text-gray-400 mb-2">平均3个单词</p>
                            <div className="h-24">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={weekData} barCategoryGap="20%">
                                        <XAxis
                                            dataKey="day"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                                        />
                                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                            {weekData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={index === weekData.length - 1 ? '#3b82f6' : '#e5e7eb'}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 右侧：目标和今天 */}
                        <div className="w-24 flex flex-col gap-3">
                            <div className="text-right">
                                <p className="text-xs text-gray-400">每日目标</p>
                                <div className="flex items-center justify-end gap-1">
                                    <span className="text-xl font-bold text-gray-900">{dailyGoal}</span>
                                    <span className="text-xs text-gray-400">单词</span>
                                    <button
                                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                                        onClick={() => {
                                            const newGoal = prompt('设置每日目标单词数:', String(dailyGoal));
                                            if (newGoal) setDailyGoal(parseInt(newGoal) || 10);
                                        }}
                                    >
                                        <Pencil size={12} className="text-gray-400" />
                                    </button>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400">今天</p>
                                <span className="text-2xl font-bold text-gray-900">{todayLearned}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 间隔学习 */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="font-bold text-gray-900">间隔学习</h3>
                        <button className="text-gray-400 hover:text-gray-600">
                            <HelpCircle size={18} />
                        </button>
                    </div>

                    {/* 准备好学习了 - 绿色大卡片 */}
                    <button
                        onClick={handleStartMixedPractice}
                        className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-2xl p-4 flex items-center justify-between text-white shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <Zap size={20} />
                            </div>
                            <span className="font-bold text-lg">准备好学习了</span>
                        </div>
                        <span className="font-bold">{newWordsCount} 个单词</span>
                    </button>

                    {/* 准备复习 */}
                    <div className="bg-white rounded-xl p-4 flex items-center justify-between border border-gray-100">
                        <div className="flex items-center gap-3">
                            <RefreshCw size={18} className="text-gray-400" />
                            <span className="text-gray-600">准备复习</span>
                        </div>
                        <span className="text-gray-400">{stats.dueCount} 个单词</span>
                    </div>

                    {/* 下一次重复时间 */}
                    {nextReviewHours !== null && (
                        <div className="flex items-center gap-2 px-1 text-sm text-gray-400">
                            <Clock size={14} />
                            <span>下一次重复在{nextReviewHours}小时</span>
                        </div>
                    )}
                </div>

                {/* 训练模式 - 混合练习在最上面 */}
                <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 px-1">训练模式</h3>

                    <ExerciseItem
                        icon={Zap}
                        color="bg-gradient-to-br from-blue-500 to-indigo-600"
                        title="混合练习"
                        subtitle="基于遗忘曲线的综合复习"
                        count={stats.dueCount}
                        onClick={() => handleStartMode('mixed')}
                    />
                    <ExerciseItem
                        icon={Layers}
                        color="bg-orange-500"
                        title="单词闪卡"
                        subtitle="快速回忆释义"
                        count={stats.dueCount}
                        onClick={() => handleStartMode('flashcard')}
                    />
                    <ExerciseItem
                        icon={MousePointerClick}
                        color="bg-purple-500"
                        title="多项选择"
                        subtitle="从选项中找出正确答案"
                        count={stats.dueCount}
                        onClick={() => handleStartMode('choice')}
                    />
                    <ExerciseItem
                        icon={Type}
                        color="bg-teal-500"
                        title="拼写构建"
                        subtitle="根据释义拼写单词"
                        count={stats.dueCount}
                        onClick={() => handleStartMode('spelling')}
                    />
                    <ExerciseItem
                        icon={Headphones}
                        color="bg-pink-500"
                        title="听力选择"
                        subtitle="根据发音选择正确释义"
                        count={stats.dueCount}
                        onClick={() => handleStartMode('listening-choice')}
                    />
                    <ExerciseItem
                        icon={Headphones}
                        color="bg-amber-500"
                        title="听力拼写"
                        subtitle="根据发音拼写单词"
                        count={stats.dueCount}
                        onClick={() => handleStartMode('listening-spelling')}
                    />
                    <ExerciseItem
                        icon={FileText}
                        color="bg-cyan-500"
                        title="选词填空"
                        subtitle="根据语境选择正确单词"
                        count={stats.dueCount}
                        onClick={() => handleStartMode('fill-blank')}
                    />
                </div>
            </div>

            {/* Settings Modal */}
            {showSettings && (
                <ExerciseSettings onClose={() => setShowSettings(false)} />
            )}
        </div>
    );
};

interface ExerciseItemProps {
    icon: React.ElementType;
    color: string;
    title: string;
    subtitle: string;
    count?: number;
    onClick?: () => void;
}

const ExerciseItem: React.FC<ExerciseItemProps> = ({ icon: Icon, color, title, subtitle, count, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="w-full bg-white p-4 rounded-2xl flex items-center gap-4 shadow-sm border border-gray-100 hover:border-blue-200 transition-all hover:shadow-md active:scale-[0.98]"
        >
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm", color)}>
                <Icon size={24} />
            </div>
            <div className="flex-1 text-left">
                <h4 className="font-bold text-gray-900">{title}</h4>
                <p className="text-xs text-gray-500">{subtitle}</p>
            </div>
            {count !== undefined && (
                <div className="bg-gray-100 px-2.5 py-1 rounded-full text-xs font-medium text-gray-600">
                    {count}
                </div>
            )}
        </button>
    );
};

export default ExerciseHub;
