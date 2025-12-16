import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Zap, Layers, Type, MousePointerClick } from 'lucide-react';
import { WordStore } from '../../services/WordStore';
import { useNavigate } from 'react-router-dom';

const ExerciseHub: React.FC = () => {
    const navigate = useNavigate();
    const [dueCount, setDueCount] = useState(0);

    useEffect(() => {
        const loadStats = async () => {
            const data = await WordStore.getStats();
            setDueCount(data.dueCount);
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
                {/* Mixed Practice - Same size as other items */}
                <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 px-1">推荐练习</h3>
                    <ExerciseItem
                        icon={Zap}
                        color="bg-gradient-to-br from-blue-500 to-indigo-600"
                        title="混合练习"
                        subtitle="基于遗忘曲线的综合复习"
                        count={dueCount}
                        onClick={handleStartMixed}
                    />
                </div>

                {/* Mode List */}
                <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 px-1">专项训练</h3>

                    <ExerciseItem
                        icon={Layers}
                        color="bg-orange-500"
                        title="单词闪卡"
                        subtitle="快速回忆释义"
                        count={dueCount}
                        onClick={() => handleStartMode('flashcard')}
                    />
                    <ExerciseItem
                        icon={MousePointerClick}
                        color="bg-purple-500"
                        title="多项选择"
                        subtitle="从选项中找出正确答案"
                        count={dueCount}
                        onClick={() => handleStartMode('choice')}
                    />
                    <ExerciseItem
                        icon={Type}
                        color="bg-teal-500"
                        title="拼写构建"
                        subtitle="听音频并拼写单词"
                        count={dueCount}
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
