import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Reader from '../../components/Reader';
import { LibraryStore, Book } from '../../services/LibraryStore';

const ReaderView: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { bookId } = useParams<{ bookId: string }>();

    const { bookData, bookUrl, bookPath } = location.state || {};
    const [data, setData] = useState<ArrayBuffer | string | null>(bookData || bookUrl || null);
    const [bookInfo, setBookInfo] = useState<Book | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            // 如果已有数据则不重新加载
            if (data) {
                // 只加载书籍信息
                if (!bookInfo && bookId) {
                    const books = await LibraryStore.getBooks();
                    const book = books.find(b => b.id === bookId);
                    if (book) setBookInfo(book);
                }
                setLoading(false);
                return;
            }

            // 加载书籍数据
            if (bookId) {
                const books = await LibraryStore.getBooks();
                const book = books.find(b => b.id === bookId);
                if (book) setBookInfo(book);

                const dbData = await LibraryStore.getBookData(bookId);
                if (dbData) {
                    setData(dbData);
                    setLoading(false);
                    return;
                }
            }

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
    }, [bookId]);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-900 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-900 text-white">
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
        <Reader
            data={data}
            bookId={bookId}
            bookTitle={bookInfo?.title}
            bookAuthor={bookInfo?.author}
            bookCover={bookInfo?.cover}
            onClose={() => navigate('/library')}
        />
    );
};

export default ReaderView;
