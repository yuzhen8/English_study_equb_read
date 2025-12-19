import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Zap, Layers, Type, MousePointerClick, Headphones, FileText, Settings2, RefreshCw, Clock, HelpCircle } from 'lucide-react';
import { WordStore } from '../../services/WordStore';
import { useNavigate } from 'react-router-dom';
import ExerciseSettings, { loadSettings } from './ExerciseSettings';
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from 'recharts';

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
    const [nextReviewHours, setNextReviewHours] = useState<number | null>(null);
    const [weekData, setWeekData] = useState<any[]>([]);
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

        if (data.weeklyData) {
            setWeekData(data.weeklyData);
        }

        // 计算今天学习的单词数
        const allWords = await WordStore.getWords();
        const now = Date.now();
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

    // 开始混合练习 (只学习新词)
    const handleStartMixedPractice = () => {
        const settings = loadSettings();
        navigate(`/exercise/session/mixed?scope=new&limit=${settings.wordCount}`);
    };

    // 开始到期复习
    const handleStartDueReview = () => {
        const settings = loadSettings();
        navigate(`/exercise/session/mixed?scope=review&limit=${settings.wordCount}`);
    };

    const newWordsCount = stats.newCount;

    return (
        <div className="bg-transparent flex flex-col h-screen overflow-hidden text-white">
            {/* Header */}
            <div className="bg-transparent px-4 pt-8 pb-4 flex items-center justify-between flex-shrink-0">
                <h1 className="text-3xl font-bold text-white drop-shadow-md">锻炼</h1>
                <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors glass-button"
                >
                    <Settings2 size={22} className="text-white/80" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="p-4 space-y-6">
                    {/* 每日学习统计 */}
                    <div className="glass-card p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-white">训练统计</h3>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 box-shadow-glow"></div>
                                    <span className="text-[10px] text-white/60 font-medium">学习</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400 box-shadow-glow"></div>
                                    <span className="text-[10px] text-white/60 font-medium">复习</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-32 w-full">
                            {weekData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                    <BarChart data={weekData}>
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
                                            dy={10}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            contentStyle={{
                                                backgroundColor: 'rgba(23, 23, 23, 0.8)',
                                                backdropFilter: 'blur(8px)',
                                                border: 'none',
                                                borderRadius: '12px',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                                fontSize: '11px',
                                                color: '#fff'
                                            }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Bar dataKey="learned" stackId="a" fill="#34d399" radius={[2, 2, 0, 0]} barSize={16} />
                                        <Bar dataKey="reviewed" stackId="a" fill="#60a5fa" radius={[4, 4, 0, 0]} barSize={16} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">
                                    暂无数据
                                </div>
                            )}
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-4">
                            <div className="bg-emerald-500/10 rounded-2xl p-3 border border-emerald-500/20">
                                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">今日学习</p>
                                <p className="text-xl font-black text-emerald-300">{weekData[weekData.length - 1]?.learned || 0}</p>
                            </div>
                            <div className="bg-blue-500/10 rounded-2xl p-3 border border-blue-500/20">
                                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">今日复习</p>
                                <p className="text-xl font-black text-blue-300">{weekData[weekData.length - 1]?.reviewed || 0}</p>
                            </div>
                        </div>
                    </div>

                    {/* 间隔学习 */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="font-bold text-white">间隔学习</h3>
                            <button className="text-white/40 hover:text-white transition-colors">
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
                        <button
                            onClick={handleStartDueReview}
                            className="w-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-2xl p-4 flex items-center justify-between text-white shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    <RefreshCw size={20} className="text-white" />
                                </div>
                                <span className="font-bold text-lg">准备复习</span>
                            </div>
                            <span className="font-bold">{stats.dueCount} 个单词</span>
                        </button>

                        {/* 下一次重复时间 */}
                        {nextReviewHours !== null && (
                            <div className="flex items-center gap-2 px-1 text-sm text-gray-400">
                                <Clock size={14} />
                                <span>下一次重复在{nextReviewHours}小时</span>
                            </div>
                        )}
                    </div>

                    {/* 训练模式 */}
                    <div className="space-y-3">
                        <h3 className="font-bold text-white px-1">训练模式</h3>

                        <ExerciseItem
                            icon={Zap}
                            color="bg-gradient-to-br from-blue-500 to-indigo-600"
                            title="混合练习"
                            subtitle="基于遗忘曲线的综合复习"
                            onClick={() => handleStartMode('mixed')}
                        />
                        <ExerciseItem
                            icon={Layers}
                            color="bg-orange-500"
                            title="单词闪卡"
                            subtitle="快速回忆释义"
                            onClick={() => handleStartMode('flashcard')}
                        />
                        <ExerciseItem
                            icon={MousePointerClick}
                            color="bg-purple-500"
                            title="多项选择"
                            subtitle="从选项中找出正确答案"
                            onClick={() => handleStartMode('choice')}
                        />
                        <ExerciseItem
                            icon={Type}
                            color="bg-teal-500"
                            title="拼写构建"
                            subtitle="根据释义拼写单词"
                            onClick={() => handleStartMode('spelling')}
                        />
                        <ExerciseItem
                            icon={Headphones}
                            color="bg-pink-500"
                            title="听力选择"
                            subtitle="根据发音选择正确释义"
                            onClick={() => handleStartMode('listening-choice')}
                        />
                        <ExerciseItem
                            icon={Headphones}
                            color="bg-amber-500"
                            title="听力拼写"
                            subtitle="根据发音拼写单词"
                            onClick={() => handleStartMode('listening-spelling')}
                        />
                        <ExerciseItem
                            icon={FileText}
                            color="bg-cyan-500"
                            title="选词填空"
                            subtitle="根据语境选择正确单词"
                            onClick={() => handleStartMode('fill-blank')}
                        />
                    </div>
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
            className="w-full glass-card hover:bg-white/10 p-4 rounded-2xl flex items-center gap-4 hover:border-white/20 transition-all hover:translate-x-1 active:scale-[0.98]"
        >
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg", color)}>
                <Icon size={24} />
            </div>
            <div className="flex-1 text-left">
                <h4 className="font-bold text-white">{title}</h4>
                <p className="text-xs text-white/50">{subtitle}</p>
            </div>
            {count !== undefined && (
                <div className="bg-white/20 px-2.5 py-1 rounded-full text-xs font-medium text-white/80">
                    {count}
                </div>
            )}
        </button>
    );
};

export default ExerciseHub;
