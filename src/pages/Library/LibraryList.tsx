import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Trash2, Plus } from 'lucide-react';
import { LibraryStore, Book } from '../../services/LibraryStore';


const LibraryList: React.FC = () => {
    const navigate = useNavigate();
    const [books, setBooks] = useState<Book[]>([]);

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

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm("确定要删除这本书吗？")) {
            await LibraryStore.deleteBook(id);
            await loadBooks();
        }
    };

    const openBook = (book: Book) => {
        // Navigate to reader with book info
        // If we have a path, we pass it. The ReaderView will need to handle reading from path.
        navigate('/reader/' + book.id, {
            state: {
                bookPath: book.path,
                bookTitle: book.title // Optional for UI
            }
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24 p-4">
            <div className="pt-8 pb-6 flex justify-between items-center sticky top-0 bg-gray-50 z-10">
                <h1 className="text-2xl font-bold text-gray-900">书库</h1>
                <button
                    onClick={handleImport}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl cursor-pointer transition-colors shadow-sm"
                >
                    <Plus size={18} />
                    <span className="text-sm font-bold">导入</span>
                </button>
            </div>

            {books.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center max-w-sm w-full">
                        <div className="bg-blue-50 p-4 rounded-full mb-4">
                            <Upload size={32} className="text-blue-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 mb-2">还没有书</h2>
                        <p className="text-gray-500 text-sm mb-6">
                            点击右上角导入 .epub 文件开始阅读
                        </p>

                        <button
                            onClick={handleImport}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-xl cursor-pointer transition-colors w-full flex justify-center"
                        >
                            <span>打开文件</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {books.map((book) => (
                        <div
                            key={book.id}
                            onClick={() => openBook(book)}
                            className="group bg-white rounded-2xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer relative"
                        >
                            <div className="aspect-[2/3] bg-gray-100 rounded-xl mb-3 overflow-hidden relative">
                                {book.cover ? (
                                    <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                                        <span className="text-xs font-bold px-2 text-center">{book.title}</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </div>

                            <h3 className="font-bold text-gray-900 text-sm truncate">{book.title}</h3>
                            <p className="text-gray-500 text-xs truncate mt-0.5">{book.author}</p>

                            {/* Progress bar if needed */}
                            {book.progress ? (
                                <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full"
                                        style={{ width: `${book.progress}%` }}
                                    />
                                </div>
                            ) : null}

                            <button
                                onClick={(e) => handleDelete(e, book.id)}
                                className="absolute top-4 right-4 p-2 bg-white/90 rounded-full text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all shadow-sm"
                                title="删除"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LibraryList;
