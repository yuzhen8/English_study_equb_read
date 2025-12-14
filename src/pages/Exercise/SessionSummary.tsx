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
        <div className="flex flex-col items-center justify-center p-8 space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="relative">
                <div className="absolute inset-0 bg-yellow-200 rounded-full blur-xl opacity-50 animate-pulse" />
                <Trophy size={80} className="text-yellow-500 relative z-10" />
            </div>

            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-gray-900">Session Complete!</h2>
                <p className="text-gray-500">You've made great progress today.</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 w-full max-w-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                        <CheckCircle size={20} className="text-green-600" />
                    </div>
                    <span className="font-medium text-gray-700">Words Reviewed</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">{totalReviewed}</span>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
                <button
                    onClick={() => navigate('/exercise')}
                    className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors"
                >
                    Back to Exercises <ArrowRight size={18} />
                </button>
                <button
                    onClick={() => window.location.reload()}
                    className="w-full bg-white text-gray-700 border border-gray-200 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                >
                    Start Another Session <RotateCcw size={18} />
                </button>
            </div>
        </div>
    );
};

export default SessionSummary;
