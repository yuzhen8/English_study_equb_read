import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Plus, MoreHorizontal, ChevronRight, FolderPlus } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

import { WordStore } from '../../services/WordStore';
import { GroupStore, WordGroup } from '../../services/GroupStore';
import WordDetailPopup from '../../components/WordDetailPopup';
import CreateGroupDialog from '../../components/Dictionary/CreateGroupDialog';

const DictionaryDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'my-words' | 'groups'>('my-words');
    const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'year'>('week');
    const [showWordPopup, setShowWordPopup] = useState(false);
    const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
    const [groups, setGroups] = useState<WordGroup[]>([]);
    const [stats, setStats] = useState({
        total: 0,
        statusCounts: { new: 0, learning: 0, reviewed: 0, mastered: 0 },
        newToday: 0,
        chartData: [] as { name: string; words: number }[]
    });

    // 加载统计数据
    useEffect(() => {
        const loadStats = async () => {
            const data = await WordStore.getStats();
            setStats(data);
        };
        loadStats();
    }, []);

    // 加载群组数据
    useEffect(() => {
        if (activeTab === 'groups') {
            loadGroups();
        }
    }, [activeTab]);

    const loadGroups = async () => {
        const allGroups = await GroupStore.getGroups();
        // 按更新时间排序，最新的在前
        allGroups.sort((a, b) => b.updatedAt - a.updatedAt);
        setGroups(allGroups);
    };

    // 创建群组
    const handleCreateGroup = async (name: string, description?: string) => {
        await GroupStore.createGroup(name, description);
        loadGroups();
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

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white px-4 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-gray-900">词典</h1>
                    <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                        <MoreHorizontal size={20} />
                    </button>
                </div>

                <div className="flex space-x-6 border-b border-gray-100">
                    <button
                        onClick={() => setActiveTab('my-words')}
                        className={cn(
                            "pb-2 text-sm font-medium transition-colors relative",
                            activeTab === 'my-words' ? "text-blue-600" : "text-gray-500"
                        )}
                    >
                        我的单词
                        {activeTab === 'my-words' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('groups')}
                        className={cn(
                            "pb-2 text-sm font-medium transition-colors relative",
                            activeTab === 'groups' ? "text-blue-600" : "text-gray-500"
                        )}
                    >
                        群组
                        {activeTab === 'groups' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
                        )}
                    </button>
                </div>
            </div>

            {/* All Words Bar */}
            <div className="px-4 mt-2 mb-2">
                <button
                    className="w-full bg-white rounded-xl p-4 flex justify-between items-center shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
                    onClick={() => navigate('/dictionary/list')}
                >
                    <span className="font-bold text-gray-900">所有单词</span>
                    <div className="flex items-center gap-2">
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">{stats.total}</span>
                        <ChevronRight size={20} className="text-gray-400" />
                    </div>
                </button>
            </div>

            {/* 内容区域 - 根据 activeTab 切换 */}
            {activeTab === 'groups' ? (
                /* 群组视图 */
                <div className="px-4 py-2">
                    {groups.length === 0 ? (
                        /* 空状态 */
                        <div className="py-16 text-center">
                            <div className="text-gray-400 mb-4">
                                <FolderPlus size={64} className="mx-auto" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">还没有群组</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                创建群组来组织和管理您的单词
                            </p>
                            <button
                                onClick={() => setShowCreateGroupDialog(true)}
                                className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors"
                            >
                                <Plus size={18} />
                                创建第一个群组
                            </button>
                        </div>
                    ) : (
                        /* 群组列表 */
                        <div className="space-y-2">
                            {groups.map((group) => (
                                <button
                                    key={group.id}
                                    onClick={() => navigate(`/dictionary/group/${group.id}`)}
                                    className="w-full bg-white rounded-xl p-4 flex justify-between items-center shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors text-left"
                                >
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-gray-900 truncate">{group.name}</h3>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {formatTimeAgo(group.updatedAt)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        <span className="text-gray-600 font-medium">{group.wordIds.length}</span>
                                        <ChevronRight size={20} className="text-gray-400" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* 正常的统计内容 */
                <>
                    <div className="p-4 space-y-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* New Words Card */}
                            <div className="bg-blue-600 rounded-2xl p-4 text-white flex flex-col justify-between shadow-lg shadow-blue-200">
                                <div className="flex justify-between items-start">
                                    <span className="text-blue-100 text-sm font-medium">新的</span>
                                    <div className="bg-white/20 p-1.5 rounded-lg">
                                        <Plus size={16} className="text-white" />
                                    </div>
                                </div>
                                <div>
                                    <span className="text-4xl font-bold">{stats.newToday}</span>
                                    <p className="text-blue-100 text-xs mt-1">+2 比昨天</p>
                                </div>
                            </div>

                            {/* Progress Stats */}
                            <div className="flex flex-col gap-3">
                                <div className="bg-white rounded-2xl p-3 flex-1 flex flex-col justify-center shadow-sm border border-gray-100">
                                    <span className="text-gray-400 text-xs mb-1">进行中</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl font-bold text-gray-900">{stats.statusCounts.learning + stats.statusCounts.reviewed}</span>
                                        <span className="text-xs text-orange-500 font-medium">待复习</span>
                                    </div>
                                </div>
                                <div className="bg-white rounded-2xl p-3 flex-1 flex flex-col justify-center shadow-sm border border-gray-100">
                                    <span className="text-gray-400 text-xs mb-1">已学习</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl font-bold text-gray-900">{stats.total}</span>
                                        <span className="text-xs text-green-500 font-medium">个单词</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Chart Section */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-900">学习曲线</h3>
                                <div className="flex bg-gray-100 rounded-lg p-0.5">
                                    {(['week', 'month', 'year'] as const).map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setTimeFilter(t)}
                                            className={cn(
                                                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                                timeFilter === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                                            )}
                                        >
                                            {t === 'week' ? '周' : t === 'month' ? '月' : '年'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stats.chartData}>
                                        <defs>
                                            <linearGradient id="colorWords" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12, fill: '#9ca3af' }}
                                            dy={10}
                                        />
                                        <Tooltip />
                                        <Area
                                            type="monotone"
                                            dataKey="words"
                                            stroke="#2563eb"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorWords)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* FAB - 根据当前标签页动态显示 */}
            {activeTab === 'groups' ? (
                <button
                    onClick={() => setShowCreateGroupDialog(true)}
                    className="fixed bottom-24 right-4 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 hover:bg-black transition-colors z-20"
                >
                    <Plus size={20} />
                    <span className="font-bold">创建群组</span>
                </button>
            ) : (
                <button
                    onClick={() => setShowWordPopup(true)}
                    className="fixed bottom-24 right-4 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 hover:bg-black transition-colors z-20"
                >
                    <Plus size={20} />
                    <span className="font-bold">添加单词</span>
                </button>
            )}

            {/* Word Detail Popup */}
            {showWordPopup && (
                <WordDetailPopup
                    onClose={() => setShowWordPopup(false)}
                />
            )}

            {/* Create Group Dialog */}
            {showCreateGroupDialog && (
                <CreateGroupDialog
                    onClose={() => setShowCreateGroupDialog(false)}
                    onCreate={handleCreateGroup}
                />
            )}
        </div>
    );
};

export default DictionaryDashboard;
