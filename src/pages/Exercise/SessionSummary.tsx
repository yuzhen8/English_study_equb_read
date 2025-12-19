import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, CheckCircle, ArrowRight, RotateCcw } from 'lucide-react';

interface SessionSummaryProps {
    totalReviewed: number;
    // We could add more stats here later like "Correct %" or "XP Gained"
}

const SessionSummary: React.FC<SessionSummaryProps> = ({ totalReviewed }) => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center p-8 space-y-8 animate-in fade-in zoom-in duration-500 min-h-[60vh]">
            <div className="relative">
                <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-xl opacity-50 animate-pulse" />
                <Trophy size={80} className="text-yellow-400 relative z-10 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
            </div>

            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-white">Session Complete!</h2>
                <p className="text-white/60">You've made great progress today.</p>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-white/10 w-full max-w-xs flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="bg-green-500/20 p-2 rounded-lg border border-green-500/30">
                        <CheckCircle size={20} className="text-green-400" />
                    </div>
                    <span className="font-medium text-white/80">Words Reviewed</span>
                </div>
                <span className="text-2xl font-bold text-white drop-shadow-md">{totalReviewed}</span>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
                <button
                    onClick={() => navigate('/exercise')}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] border border-white/20"
                >
                    Back to Exercises <ArrowRight size={18} />
                </button>
                <button
                    onClick={() => window.location.reload()}
                    className="w-full bg-white/10 text-white border border-white/10 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white/20 transition-all backdrop-blur-md"
                >
                    Start Another Session <RotateCcw size={18} />
                </button>
            </div>
        </div>
    );
};

export default SessionSummary;
