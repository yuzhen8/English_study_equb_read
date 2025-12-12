import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Reader from '../../components/Reader';
import { ArrowLeft } from 'lucide-react';

const ReaderView: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    // Retrieve bookData or bookUrl from state
    const { bookData, bookUrl } = location.state || {};
    const data = bookData || bookUrl;

    if (!data) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <h2 className="text-xl font-bold mb-4">No Book Loaded</h2>
                    <p className="text-gray-400 mb-6">Please select a book from the library.</p>
                    <button
                        onClick={() => navigate('/library')}
                        className="bg-blue-600 px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Back to Library
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-screen bg-white">
            <button
                onClick={() => navigate('/library')}
                className="absolute top-4 left-4 z-50 bg-gray-900/50 hover:bg-gray-900 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                title="Back to Library"
            >
                <ArrowLeft size={20} />
            </button>
            <Reader data={data} />
        </div>
    );
};

export default ReaderView;
