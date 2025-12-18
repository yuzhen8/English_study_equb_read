import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreVertical, BookOpen, FolderOpen } from 'lucide-react';
import { LibraryStore, Book } from '../../services/LibraryStore';
import { cn } from '../../lib/utils';

// 阅读状态类型
type ReadingStatus = 'reading' | 'finished' | 'all';

const LibraryList: React.FC = () => {
    const navigate = useNavigate();
    const [books, setBooks] = useState<Book[]>([]);
    const [activeStatus, setActiveStatus] = useState<ReadingStatus>('reading');
    const [menuOpen, setMenuOpen] = useState<string | null>(null);

    useEffect(() => {
        loadBooks();
    }, []);

    const loadBooks = async () => {
        const list = await LibraryStore.getBooks();
        // Sort by added time desc
        setBooks(list.sort((a, b) => b.addedAt - a.addedAt));
    };

    const handleImport = async () => {
        try {
            const filePath = await window.electronAPI.selectFile();
            if (filePath) {
                const fileResult = await window.electronAPI.readFile(filePath);
                if (fileResult.success && fileResult.data) {
                    await LibraryStore.addBook(filePath, fileResult.data);
                    await loadBooks();
                } else {
                    console.error("Failed to read file", fileResult.error);
                    alert("读取文件失败");
                }
            }
        } catch (error) {
            console.error("Failed to import book", error);
            alert("导入失败");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("确定要删除这本书吗？")) {
            await LibraryStore.deleteBook(id);
            await loadBooks();
        }
        setMenuOpen(null);
    };

    const openBook = (book: Book) => {
        navigate('/reader/' + book.id, {
            state: {
                bookPath: book.path,
                bookTitle: book.title
            }
        });
    };

    // 筛选书籍
    const filteredBooks = books.filter(book => {
        if (activeStatus === 'all') return true;
        if (activeStatus === 'reading') {
            return !book.progress || book.progress < 100;
        }
        if (activeStatus === 'finished') {
            return book.progress && book.progress >= 100;
        }
        return true;
    });

    // 估算阅读时间 (简单估算：假设每本书约 250 页，阅读速度约 20 页/小时)
    const estimateReadingTime = (book: Book): string => {
        const totalPages = book.totalPages || 100;
        const hours = Math.ceil(totalPages / 20);
        return `阅读所需${hours} 小时`;
    };

    // 格式化进度显示
    const formatProgress = (book: Book): string => {
        const current = book.currentPage || 0;
        const total = book.totalPages || 100;
        return `${current} / ${total}`;
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="sticky top-0 bg-gray-50 z-10 px-4 pt-8 pb-4">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-gray-900">我的书籍</h1>
                        <button
                            onClick={() => navigate('/library/categories')}
                            className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                        >
                            <FolderOpen size={16} />
                            分类管理
                        </button>
                    </div>
                    <button
                        onClick={handleImport}
                        className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg cursor-pointer transition-colors text-sm"
                    >
                        <Plus size={16} />
                        <span className="font-medium">导入</span>
                    </button>
                </div>

                {/* Status Tabs */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveStatus('reading')}
                        className={cn(
                            "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                            activeStatus === 'reading'
                                ? "bg-gray-900 text-white"
                                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                        )}
                    >
                        进行中
                    </button>
                    <button
                        onClick={() => setActiveStatus('finished')}
                        className={cn(
                            "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                            activeStatus === 'finished'
                                ? "bg-gray-900 text-white"
                                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                        )}
                    >
                        已完成
                    </button>
                </div>
            </div>

            {/* Book List */}
            <div className="px-4">
                {filteredBooks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center max-w-sm w-full">
                            <div className="bg-gray-100 p-4 rounded-full mb-4">
                                <BookOpen size={32} className="text-gray-400" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 mb-2">
                                {activeStatus === 'finished' ? '还没有完成的书' : '还没有书'}
                            </h2>
                            <p className="text-gray-500 text-sm mb-6">
                                {activeStatus === 'finished'
                                    ? '完成阅读后书籍会显示在这里'
                                    : '点击导入按钮添加 .epub 文件'}
                            </p>
                            {activeStatus !== 'finished' && (
                                <button
                                    onClick={handleImport}
                                    className="bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 px-6 rounded-xl cursor-pointer transition-colors"
                                >
                                    导入书籍
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredBooks.map((book) => (
                            <div
                                key={book.id}
                                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex gap-4"
                            >
                                {/* Book Cover */}
                                <div
                                    className="w-20 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
                                    onClick={() => openBook(book)}
                                >
                                    {book.cover ? (
                                        <img
                                            src={book.cover}
                                            alt={book.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                            <span className="text-xs text-gray-400 text-center px-1 line-clamp-3">
                                                {book.title}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Book Info */}
                                <div className="flex-1 min-w-0 flex flex-col">
                                    {/* Title & Author */}
                                    <h3
                                        className="font-bold text-gray-900 text-base leading-tight line-clamp-2 cursor-pointer hover:text-gray-700"
                                        onClick={() => openBook(book)}
                                    >
                                        {book.title}
                                    </h3>
                                    <p className="text-gray-500 text-sm mt-0.5 truncate">
                                        {book.author}
                                    </p>

                                    {/* Reading Time */}
                                    <p className="text-gray-400 text-xs mt-1">
                                        {estimateReadingTime(book)}
                                    </p>

                                    {/* Progress Bar & Page Count */}
                                    <div className="flex items-center gap-2 mt-auto pt-2">
                                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-amber-400 rounded-full transition-all"
                                                style={{ width: `${book.progress || 0}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-gray-400 flex-shrink-0">
                                            {formatProgress(book)}
                                        </span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 mt-3">
                                        <button
                                            onClick={() => openBook(book)}
                                            className="px-6 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
                                        >
                                            阅读
                                        </button>
                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setMenuOpen(menuOpen === book.id ? null : book.id);
                                                }}
                                                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                                            >
                                                <MoreVertical size={18} className="text-gray-400" />
                                            </button>

                                            {/* Dropdown Menu */}
                                            {menuOpen === book.id && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => setMenuOpen(null)}
                                                    />
                                                    <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20 min-w-[100px]">
                                                        <button
                                                            onClick={() => handleDelete(book.id)}
                                                            className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 transition-colors"
                                                        >
                                                            删除
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LibraryList;
