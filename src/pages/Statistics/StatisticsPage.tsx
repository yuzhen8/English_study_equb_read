import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ReadingTimeStore } from '../../services/ReadingTimeStore';
import { Calendar, BookOpen, Clock } from 'lucide-react';
import { CategoryStore } from '../../services/CategoryStore';
import { Book } from '../../services/LibraryStore';

const StatisticsPage: React.FC = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState<Record<string, number>>({}); // Date -> Seconds
    const [totalReadingTime, setTotalReadingTime] = useState(0); // Seconds
    const [recentBooks, setRecentBooks] = useState<Book[]>([]); // Assuming we can infer or fetch recently read

    useEffect(() => {
        if (!user) return;
        loadStats();
    }, [user]);

    const loadStats = async () => {
        if (!user) return;
        const dailyStats = await ReadingTimeStore.getDailyStats(user.id);
        setStats(dailyStats);

        const total = Object.values(dailyStats).reduce((a, b) => a + b, 0);
        setTotalReadingTime(total);

        // Ideally we'd have "Recent Books" but ReadingTimeStore doesn't index by "last read" efficiently across all books easily yet.
        // We can fetch from LibraryStore those with recent 'updatedAt' maybe?
        const books = await CategoryStore.getBooksInCategory('all');
        const sorted = books.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 5);
        setRecentBooks(sorted);
    };

    // Helper to format seconds
    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}小时 ${m}分钟`;
        return `${m}分钟`;
    };

    const getLast7Days = () => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(d.toISOString().split('T')[0]);
        }
        return days;
    };

    const last7Days = getLast7Days();
    const maxDaily = Math.max(...last7Days.map(d => stats[d] || 0), 1); // Avoid div/0

    return (
        <div className="flex-1 h-full overflow-y-auto p-8">
            <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-md">阅读统计</h1>
            <p className="text-white/60 mb-8">查看您的每日阅读进度</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* Total Time Card */}
                <div className="glass-card p-6 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                            <Clock size={24} />
                        </div>
                        <div>
                            <div className="text-sm text-white/50">累计阅读时间</div>
                            <div className="text-2xl font-bold text-white">{formatDuration(totalReadingTime)}</div>
                        </div>
                    </div>
                </div>
                {/* Today Time Card */}
                <div className="glass-card p-6 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <div className="text-sm text-white/50">今日阅读</div>
                            <div className="text-2xl font-bold text-white">
                                {formatDuration(stats[new Date().toISOString().split('T')[0]] || 0)}
                            </div>
                        </div>
                    </div>
                </div>
                {/* Books Read Card (Placeholder or count) */}
                <div className="glass-card p-6 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <div className="text-sm text-white/50">最近阅读</div>
                            <div className="text-2xl font-bold text-white">{recentBooks.length} 本</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="glass-card p-6 rounded-2xl border border-white/10 mb-8">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <div className="w-1 h-6 bg-indigo-500 rounded-full" />
                    本周阅读时长
                </h3>
                <div className="flex items-end justify-between h-48 gap-4 px-2">
                    {last7Days.map(date => {
                        const val = stats[date] || 0;
                        const height = (val / maxDaily) * 100;
                        const displayDate = new Date(date).getDate();
                        const isToday = date === new Date().toISOString().split('T')[0];
                        return (
                            <div key={date} className="flex-1 flex flex-col items-center gap-2 group">
                                <div className="text-xs text-white/0 group-hover:text-white/80 transition-colors -mb-6 pb-2 z-10 font-mono">
                                    {Math.round(val / 60)}m
                                </div>
                                <div
                                    className={`w-full rounded-t-lg transition-all duration-500 ease-out hover:brightness-110 relative ${isToday ? 'bg-indigo-500' : 'bg-white/10'
                                        }`}
                                    style={{ height: `${Math.max(height, 5)}%`, opacity: val > 0 ? 1 : 0.3 }}
                                >
                                </div>
                                <div className={`text-xs font-mono mt-2 ${isToday ? 'text-indigo-400 font-bold' : 'text-white/40'}`}>
                                    {displayDate}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default StatisticsPage;
