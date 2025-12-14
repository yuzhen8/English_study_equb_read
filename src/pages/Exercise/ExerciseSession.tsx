import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const ExerciseSession: React.FC = () => {
    const { mode } = useParams<{ mode: string }>();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white shadow-sm p-4 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold capitalize">{mode} Practice</h1>
            </header>
            <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-gray-500">Session Mode: {mode}. Implementation coming soon.</p>
            </div>
        </div>
    );
};

export default ExerciseSession;
