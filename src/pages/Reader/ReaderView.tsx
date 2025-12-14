import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Reader from '../../components/Reader';
import { ArrowLeft } from 'lucide-react';
import { LibraryStore } from '../../services/LibraryStore';

const ReaderView: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { bookId } = useParams<{ bookId: string }>();

    // Retrieve bookData or bookUrl from state
    const { bookData, bookUrl, bookPath } = location.state || {};
    const [data, setData] = useState<ArrayBuffer | string | null>(bookData || bookUrl || null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            if (data) return;
            setLoading(true);

            // 1. Try loading from DB if bookId is present (it should be in URL)
            if (bookId) {
                const dbData = await LibraryStore.getBookData(bookId);
                if (dbData) { // Check if we got valid array buffer
                    setData(dbData);
                    setLoading(false);
                    return;
                }
            }

            // 2. Fallback to file path if provided (e.g. from Library state)
            if (bookPath) {
                const result = await window.electronAPI.readFile(bookPath);
                if (result.success && result.data) {
                    setData(result.data);
                } else {
                    console.error("Failed to read book file:", result.error);
                }
            }
            setLoading(false);
        };
        load();
    }, [bookId, bookPath, data]);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

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
            {/* Verify data is not null before passing, though check above handles it */}
            <Reader data={data} />
        </div>
    );
};

export default ReaderView;
