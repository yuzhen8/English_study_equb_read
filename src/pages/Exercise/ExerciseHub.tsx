import React from 'react';
import { cn } from '../../lib/utils';
import { Zap, Layers, Type, MousePointerClick, Trophy } from 'lucide-react';

const ExerciseHub: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="bg-white px-4 pt-12 pb-4">
                <h1 className="text-2xl font-bold text-gray-900">锻炼</h1>
                <p className="text-gray-500 text-sm mt-1">选择一种模式开始练习</p>
            </div>

            <div className="p-4 space-y-6">
                {/* Hero Card - Mixed Practice */}
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-200 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
                        <Trophy size={120} />
                    </div>

                    <div className="relative z-10">
                        <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
                            <Zap size={24} className="text-white fill-current" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">混合练习</h2>
                        <p className="text-blue-100 text-sm mb-6 max-w-[70%]">
                            基于你的遗忘曲线生成的综合复习计划。
                        </p>
                        <button className="bg-white text-blue-600 px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-blue-50 transition-colors">
                            开始练习
                        </button>
                    </div>
                </div>

                {/* Mode List */}
                <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 px-1">专项训练</h3>

                    <ExerciseItem
                        icon={Layers}
                        color="bg-orange-500"
                        title="单词闪卡"
                        subtitle="快速回忆释义"
                        count={42}
                    />
                    <ExerciseItem
                        icon={MousePointerClick}
                        color="bg-purple-500"
                        title="多项选择"
                        subtitle="从选项中找出正确答案"
                        count={15}
                    />
                    <ExerciseItem
                        icon={Type}
                        color="bg-teal-500"
                        title="拼写构建"
                        subtitle="补充缺失的字母"
                        count={28}
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
}

const ExerciseItem: React.FC<ExerciseItemProps> = ({ icon: Icon, color, title, subtitle, count }) => {
    return (
        <button className="w-full bg-white p-4 rounded-2xl flex items-center gap-4 shadow-sm border border-gray-100 hover:border-blue-200 transition-all hover:shadow-md active:scale-[0.98]">
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
