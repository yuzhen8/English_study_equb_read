import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const WordList: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="bg-white px-4 py-4 sticky top-0 z-10 shadow-sm flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft size={24} className="text-gray-600" />
                </button>
                <h1 className="text-xl font-bold text-gray-900">所有单词</h1>
            </div>
            <div className="p-4">
                <p className="text-gray-500 text-center mt-10">单词列表正在开发中...</p>
            </div>
        </div>
    );
};

export default WordList;
