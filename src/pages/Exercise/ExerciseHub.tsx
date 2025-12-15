import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Zap, Layers, Type, MousePointerClick, Trophy, TrendingUp, Award, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { WordStore } from '../../services/WordStore';
import { useNavigate } from 'react-router-dom';

const ExerciseHub: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        dueCount: 0,
        reviewedToday: 0,
        totalWords: 0,
        futureReviews: [] as { name: string; count: number }[]
    });

    useEffect(() => {
        const loadStats = async () => {
            const data = await WordStore.getStats();
            setStats({
                dueCount: data.dueCount,
                reviewedToday: data.reviewedToday,
                totalWords: data.total,
                futureReviews: data.futureReviews || []
            });
        };
        loadStats();
    }, []);

    const handleStartMixed = () => {
        navigate('/exercise/session/mixed');
    };

    const handleStartMode = (mode: string) => {
        navigate(`/exercise/session/${mode}`);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="bg-white px-4 pt-12 pb-4">
                <h1 className="text-2xl font-bold text-gray-900">锻炼</h1>
                <p className="text-gray-500 text-sm mt-1">选择一种模式开始练习</p>
            </div>

            <div className="p-4 space-y-6">
                {/* Hero Card - Mixed Practice */}
                <button
                    onClick={handleStartMixed}
                    className="w-full bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-200 relative overflow-hidden group text-left"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
                        <Trophy size={120} />
                    </div>

                    <div className="relative z-10">
                        <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
                            <Zap size={24} className="text-white fill-current" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">混合练习</h2>
                        <p className="text-blue-100 text-sm mb-4 max-w-[70%]">
                            基于你的遗忘曲线生成的综合复习计划。
                        </p>
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                                <span className="text-lg font-bold">{stats.dueCount}</span>
                                <span className="text-blue-100 text-xs ml-1">待复习</span>
                            </div>
                            <div className="bg-white text-blue-600 px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-blue-50 transition-colors">
                                开始练习
                            </div>
                        </div>
                    </div>
                </button>

                {/* Exercise Statistics */}
                <div className="space-y-4">
                    <h3 className="font-bold text-gray-900 px-1">练习统计</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                        {/* Today's Reviews */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-gray-500 text-xs font-medium">今日复习</span>
                                <Clock size={16} className="text-gray-400" />
                            </div>
                            <div className="text-2xl font-bold text-gray-900">{stats.reviewedToday}</div>
                            <p className="text-xs text-gray-400 mt-1">个单词</p>
                        </div>

                        {/* Total Words */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-gray-500 text-xs font-medium">总单词数</span>
                                <Award size={16} className="text-gray-400" />
                            </div>
                            <div className="text-2xl font-bold text-gray-900">{stats.totalWords}</div>
                            <p className="text-xs text-gray-400 mt-1">个单词</p>
                        </div>
                    </div>

                    {/* Review Forecast Chart */}
                    {stats.futureReviews.length > 0 && (
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-sm font-bold text-gray-900">未来7天复习计划</h4>
                                <TrendingUp size={16} className="text-gray-400" />
                            </div>
                            <ResponsiveContainer width="100%" height={120}>
                                <AreaChart data={stats.futureReviews}>
                                    <defs>
                                        <linearGradient id="colorReviews" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#9ca3af' }}
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: '#fff', 
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            padding: '8px'
                                        }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="count" 
                                        stroke="#3b82f6" 
                                        fillOpacity={1} 
                                        fill="url(#colorReviews)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Mode List */}
                <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 px-1">专项训练</h3>

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
                        subtitle="听音频并拼写单词"
                        count={stats.dueCount}
                        onClick={() => handleStartMode('spelling')}
                    />
                </div>
            </div>
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
