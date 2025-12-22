import React, { useEffect, useState } from 'react';
import { X, Clock, Calendar, BookOpen } from 'lucide-react';
import { ReadingTimeStore, ReadingSession } from '../services/ReadingTimeStore';

interface BookStatsPopupProps {
    bookId: string;
    bookTitle: string;
    onClose: () => void;
}

const BookStatsPopup: React.FC<BookStatsPopupProps> = ({ bookId, bookTitle, onClose }) => {
    const [totalDuration, setTotalDuration] = useState(0);
    const [sessions, setSessions] = useState<ReadingSession[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const s = await ReadingTimeStore.getSessionsByBook(bookId);
                // Sort by date desc
                s.sort((a, b) => b.startTime - a.startTime);
                setSessions(s);
                const total = s.reduce((acc, curr) => acc + curr.duration, 0);
                setTotalDuration(total);
            } catch (e) {
                console.error("Failed to load book stats", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [bookId]);

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    // Group sessions by day for a mini-chart or list?
    // Let's just show "Last Read" and "Total Time" and maybe "Days Read".
    const daysRead = new Set(sessions.map(s => s.date)).size;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className="w-full max-w-md bg-gray-900/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                    <h3 className="text-lg font-bold text-white truncate pr-4">{bookTitle}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-8 h-8 border-2 border-white/20 border-t-indigo-500 rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center text-center">
                                    <Clock className="mb-2 text-indigo-400" size={24} />
                                    <div className="text-2xl font-bold text-white mb-1">{formatDuration(totalDuration)}</div>
                                    <div className="text-xs text-white/50 uppercase tracking-widest">Total Time</div>
                                </div>
                                <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center text-center">
                                    <Calendar className="mb-2 text-emerald-400" size={24} />
                                    <div className="text-2xl font-bold text-white mb-1">{daysRead}</div>
                                    <div className="text-xs text-white/50 uppercase tracking-widest">Days Read</div>
                                </div>
                            </div>

                            {/* Recent Sessions List */}
                            <div>
                                <h4 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                                    <BookOpen size={16} />
                                    Recent Sessions
                                </h4>
                                <div className="space-y-2">
                                    {sessions.slice(0, 5).map(session => (
                                        <div key={session.id} className="flex items-center justify-between text-sm p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                            <div className="text-white/80">
                                                {new Date(session.startTime).toLocaleDateString()}
                                                <span className="text-white/40 ml-2 text-xs">
                                                    {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className="text-indigo-300 font-mono">
                                                {formatDuration(session.duration)}
                                            </div>
                                        </div>
                                    ))}
                                    {sessions.length === 0 && (
                                        <div className="text-center text-white/30 py-4 text-xs">
                                            No reading records yet.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookStatsPopup;
