import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ePub from 'epubjs';
import {
    Plus, Clock, FolderOpen, Pencil, Trash2,
    ChevronRight, BookOpen, Menu, X, BarChart3, Info,
    ChevronDown, Upload, Library
} from 'lucide-react';
import { Category, CategoryStore, SYSTEM_CATEGORY_ALL, SYSTEM_CATEGORY_READING, SYSTEM_CATEGORY_UNCATEGORIZED } from '../../services/CategoryStore';
import { Book, LibraryStore, CefrAnalysisSummary } from '../../services/LibraryStore';
import { cn } from '../../lib/utils';
import { CefrAnalysisPopup, CefrLevelBadge } from '../../components/CefrAnalysis';

// 分类书库主组件
const CategoryLibrary: React.FC = () => {
    const navigate = useNavigate();
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>(SYSTEM_CATEGORY_ALL);
    const [books, setBooks] = useState<Book[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // 模态框状态
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importMenuOpen, setImportMenuOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [editingBook, setEditingBook] = useState<Book | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [showDeleteBookModal, setShowDeleteBookModal] = useState(false);

    // CEFR 分析状态
    const [showCefrModal, setShowCefrModal] = useState(false);
    const [cefrBook, setCefrBook] = useState<Book | null>(null);
    const [cefrText, setCefrText] = useState<string>('');
    const [extractingText, setExtractingText] = useState(false);

    // 悬停状态
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

    useEffect(() => {
        loadCategories();
    }, []);

    useEffect(() => {
        loadBooks();
    }, [selectedCategory]);

    const loadCategories = async () => {
        const cats = await CategoryStore.getCategories();
        setCategories(cats);
    };

    const loadBooks = async () => {
        const bookList = await CategoryStore.getBooksInCategory(selectedCategory);
        setBooks(bookList.sort((a, b) => b.addedAt - a.addedAt));
    };

    const handleCreateCategory = async () => {
        if (newCategoryName.trim()) {
            await CategoryStore.createCategory(newCategoryName.trim());
            setNewCategoryName('');
            setShowCreateModal(false);
            await loadCategories();
        }
    };

    const handleRenameCategory = async () => {
        if (editingCategory && newCategoryName.trim()) {
            await CategoryStore.renameCategory(editingCategory.id, newCategoryName.trim());
            setNewCategoryName('');
            setShowRenameModal(false);
            setEditingCategory(null);
            await loadCategories();
        }
    };

    const handleDeleteCategory = async () => {
        if (editingCategory) {
            await CategoryStore.deleteCategory(editingCategory.id);
            setShowDeleteModal(false);
            setEditingCategory(null);
            setSelectedCategory(SYSTEM_CATEGORY_ALL);
            await loadCategories();
            await loadBooks();
        }
        await loadBooks();
    }
    const handleDeleteBook = async () => {
        if (editingBook) {
            await LibraryStore.deleteBook(editingBook.id);
            setShowDeleteBookModal(false);
            setEditingBook(null);
            await loadBooks();
        }
    };

    const openBook = (book: Book) => {
        navigate('/reader/' + book.id, {
            state: { bookPath: book.path, bookTitle: book.title }
        });
    };

    const getCategoryName = (catId: string): string => {
        if (catId === SYSTEM_CATEGORY_ALL) return '全部书籍';
        if (catId === SYSTEM_CATEGORY_READING) return '正在阅读';
        if (catId === SYSTEM_CATEGORY_UNCATEGORIZED) return '未分类';
        const cat = categories.find(c => c.id === catId);
        return cat?.name || '未知分类';
    };

    // 提取 EPUB 文本内容
    const extractEpubText = async (book: Book): Promise<string> => {
        try {
            if (!book.path) {
                throw new Error('书籍路径不存在');
            }
            const response = await window.electronAPI.readFile(book.path);
            if (!response.success || !response.data) {
                throw new Error('无法读取文件');
            }

            // @ts-ignore - ePub works with ArrayBuffer
            const epubBook = ePub(response.data);
            await epubBook.ready;

            const spine = epubBook.spine as any;
            let fullText = '';

            for (const item of spine.items) {
                try {
                    const doc = await epubBook.load(item.href);
                    if (doc instanceof Document) {
                        const paragraphs = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
                        paragraphs.forEach(p => {
                            const text = p.textContent?.trim();
                            if (text) fullText += text + ' ';
                        });
                    }
                } catch (e) {
                    console.warn('Failed to load chapter:', item.href);
                }
            }

            return fullText;
        } catch (error) {
            console.error('Extract text error:', error);
            throw error;
        }
    };

    // 开始 CEFR 分析 (新分析)
    const startCefrAnalysis = async (book: Book, e: React.MouseEvent) => {
        e.stopPropagation();
        setCefrBook(book);
        setExtractingText(true);
        setShowCefrModal(true);

        try {
            const text = await extractEpubText(book);
            setCefrText(text);
        } catch (error) {
            console.error('Failed to extract text:', error);
        } finally {
            setExtractingText(false);
        }
    };

    // 显示缓存的 CEFR 结果
    const showCachedCefrResult = (book: Book, e: React.MouseEvent) => {
        e.stopPropagation();
        setCefrBook(book);
        setShowCefrModal(true);
    };

    // 分析完成回调
    const handleAnalysisComplete = async (result: CefrAnalysisSummary) => {
        if (cefrBook) {
            await LibraryStore.updateCefrAnalysis(cefrBook.id, result);
            // 重新加载书籍列表以更新 UI
            await loadBooks();
        }
    };

    const handleLocalImport = async () => {
        try {
            const filePath = await window.electronAPI.selectFile();
            if (filePath) {
                const fileResult = await window.electronAPI.readFile(filePath);
                if (fileResult.success && fileResult.data) {
                    await LibraryStore.addBook(filePath, fileResult.data, selectedCategory);
                    await loadBooks();
                    setImportMenuOpen(false);
                } else {
                    console.error("Failed to read file", fileResult.error);
                }
            }
        } catch (error) {
            console.error("Failed to import book", error);
        }
    };

    return (
        <div className="flex h-full bg-gray-50 overflow-hidden">
            {/* Mobile Sidebar Toggle */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
            >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Sidebar */}
            <aside className={cn(
                "w-56 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 z-40",
                "fixed inset-y-0 left-0 lg:static lg:h-full",
                sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
                {/* Sidebar Header */}
                <div className="p-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">我的书库</h2>
                </div>

                {/* System Categories */}
                <div className="p-2">
                    <SidebarItem
                        icon={<FolderOpen size={18} />}
                        label="全部书籍"
                        selected={selectedCategory === SYSTEM_CATEGORY_ALL}
                        onClick={() => setSelectedCategory(SYSTEM_CATEGORY_ALL)}
                    />
                    <SidebarItem
                        icon={<Clock size={18} />}
                        label="正在阅读"
                        selected={selectedCategory === SYSTEM_CATEGORY_READING}
                        onClick={() => setSelectedCategory(SYSTEM_CATEGORY_READING)}
                    />
                    <SidebarItem
                        icon={<BookOpen size={18} />}
                        label="未分类"
                        selected={selectedCategory === SYSTEM_CATEGORY_UNCATEGORIZED}
                        onClick={() => setSelectedCategory(SYSTEM_CATEGORY_UNCATEGORIZED)}
                    />
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-100 mx-4 my-2" />

                {/* Custom Categories */}
                <div className="flex-1 overflow-y-auto p-2">
                    <p className="text-xs text-gray-400 font-medium px-3 py-2">我的分类</p>
                    {categories.map(cat => (
                        <div
                            key={cat.id}
                            className="relative"
                            onMouseEnter={() => setHoveredCategory(cat.id)}
                            onMouseLeave={() => setHoveredCategory(null)}
                        >
                            <SidebarItem
                                icon={<FolderOpen size={18} />}
                                label={cat.name}
                                selected={selectedCategory === cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                            />
                            {hoveredCategory === cat.id && !cat.isSystem && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingCategory(cat);
                                            setNewCategoryName(cat.name);
                                            setShowRenameModal(true);
                                        }}
                                        className="p-1 hover:bg-gray-100 rounded"
                                    >
                                        <Pencil size={14} className="text-gray-400" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingCategory(cat);
                                            setShowDeleteModal(true);
                                        }}
                                        className="p-1 hover:bg-red-50 rounded"
                                    >
                                        <Trash2 size={14} className="text-red-400" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Add Category Button (Moved Inline) */}
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="w-full mt-2 py-2 px-3 border border-dashed border-gray-300 rounded-lg text-gray-500 text-sm font-medium hover:border-indigo-300 hover:text-indigo-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 opacity-80 hover:opacity-100"
                    >
                        <Plus size={16} />
                        新建分类...
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden lg:ml-0">
                {/* Header */}
                <div className="bg-gray-50 z-10 px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{getCategoryName(selectedCategory)}</h1>
                            <p className="text-sm text-gray-500">{books.length} 本书</p>
                        </div>
                        {selectedCategory !== SYSTEM_CATEGORY_ALL && selectedCategory !== SYSTEM_CATEGORY_READING && (
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setImportMenuOpen(!importMenuOpen);
                                    }}
                                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                    <Plus size={16} />
                                    导入书籍
                                    <ChevronDown size={16} className={cn("transition-transform", importMenuOpen ? "rotate-180" : "")} />
                                </button>

                                {importMenuOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setImportMenuOpen(false)}
                                        />
                                        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-20 overflow-hidden">
                                            <button
                                                onClick={() => {
                                                    handleLocalImport();
                                                    setImportMenuOpen(false);
                                                }}
                                                className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                                                    <Upload size={16} />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">本地导入</div>
                                                    <div className="text-xs text-gray-500">上传本地 EPUB 文件</div>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowImportModal(true);
                                                    setImportMenuOpen(false);
                                                }}
                                                className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors border-t border-gray-50"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                                    <Library size={16} />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">移动书籍</div>
                                                    <div className="text-xs text-gray-500">从其他分类选择书籍</div>
                                                </div>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Book Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    {books.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-sm">
                                <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
                                <h3 className="text-lg font-bold text-gray-900 mb-2">暂无书籍</h3>
                                <p className="text-gray-500 text-sm">
                                    {selectedCategory === SYSTEM_CATEGORY_READING
                                        ? '开始阅读一本书后会显示在这里'
                                        : '点击导入书籍按钮添加书籍到此分类'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                            {books.map(book => (
                                <BookCard
                                    key={book.id}
                                    book={book}
                                    onClick={() => openBook(book)}
                                    showReadingBadge={selectedCategory === SYSTEM_CATEGORY_ALL}
                                    onAnalyze={(e) => {
                                        if (book.cefrAnalysis) {
                                            showCachedCefrResult(book, e);
                                        } else {
                                            startCefrAnalysis(book, e);
                                        }
                                    }}
                                    onDelete={(e) => {
                                        e.stopPropagation();
                                        setEditingBook(book);
                                        setShowDeleteBookModal(true);
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Create Category Modal */}
            {showCreateModal && (
                <Modal title="新建分类" onClose={() => setShowCreateModal(false)}>
                    <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="输入分类名称"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            onClick={() => setShowCreateModal(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleCreateCategory}
                            disabled={!newCategoryName.trim()}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            创建
                        </button>
                    </div>
                </Modal>
            )}

            {/* Rename Category Modal */}
            {showRenameModal && (
                <Modal title="重命名分类" onClose={() => setShowRenameModal(false)}>
                    <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="输入新名称"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            onClick={() => setShowRenameModal(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleRenameCategory}
                            disabled={!newCategoryName.trim()}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            保存
                        </button>
                    </div>
                </Modal>
            )}

            {/* Delete Book Modal */}
            {showDeleteBookModal && editingBook && (
                <Modal title="删除书籍" onClose={() => setShowDeleteBookModal(false)}>
                    <div className="text-gray-600 mb-4">
                        <p>确定要删除书籍 "<strong>{editingBook.title}</strong>" 吗？</p>
                        <p className="text-amber-600 text-sm mt-2">
                            ⚠️ 此操作将永久删除该书籍及其阅读进度。
                        </p>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setShowDeleteBookModal(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleDeleteBook}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            删除
                        </button>
                    </div>
                </Modal>
            )}

            {/* Delete Category Modal */}
            {showDeleteModal && editingCategory && (
                <Modal title="删除分类" onClose={() => setShowDeleteModal(false)}>
                    <div className="text-gray-600 mb-4">
                        <p>确定要删除分类 "<strong>{editingCategory.name}</strong>" 吗？</p>
                        <p className="text-amber-600 text-sm mt-2">
                            ⚠️ 该分类下的书籍将被移动到"未分类"
                        </p>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setShowDeleteModal(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleDeleteCategory}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            删除
                        </button>
                    </div>
                </Modal>
            )}

            {/* Import Books Modal */}
            {showImportModal && (
                <ImportBooksModal
                    categoryId={selectedCategory}
                    categoryName={getCategoryName(selectedCategory)}
                    categories={categories}
                    onClose={() => setShowImportModal(false)}
                    onComplete={() => {
                        setShowImportModal(false);
                        loadBooks();
                    }}
                />
            )}

            {/* CEFR Analysis Modal */}
            {showCefrModal && cefrBook && (
                <CefrAnalysisPopup
                    bookTitle={cefrBook.title}
                    extractedText={extractingText ? '' : cefrText}
                    cachedResult={cefrBook.cefrAnalysis}
                    onAnalysisComplete={handleAnalysisComplete}
                    onClose={() => {
                        setShowCefrModal(false);
                        setCefrBook(null);
                        setCefrText('');
                    }}
                />
            )}
        </div>
    );
};

// 侧边栏项目组件
interface SidebarItemProps {
    icon: React.ReactNode;
    label: string;
    selected: boolean;
    onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, selected, onClick }) => (
    <button
        onClick={onClick}
        className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
            selected
                ? "bg-indigo-50 text-indigo-700"
                : "text-gray-600 hover:bg-gray-50"
        )}
    >
        <span className={selected ? "text-indigo-600" : "text-gray-400"}>{icon}</span>
        <span className="truncate flex-1">{label}</span>
        {selected && <ChevronRight size={14} className="text-indigo-400" />}
    </button>
);

// 书籍卡片组件
interface BookCardProps {
    book: Book;
    onClick: () => void;
    showReadingBadge?: boolean;
    onAnalyze?: (e: React.MouseEvent) => void;
    onDelete?: (e: React.MouseEvent) => void;
}

const BookCard: React.FC<BookCardProps> = ({ book, onClick, showReadingBadge, onAnalyze, onDelete }) => {
    const hasCefrResult = !!book.cefrAnalysis;
    const timerRef = React.useRef<any>(null);
    const isLongPressRef = React.useRef(false);

    const startPress = () => {
        isLongPressRef.current = false;
        timerRef.current = setTimeout(() => {
            isLongPressRef.current = true;
            if (onDelete) {
                // Pass a fake event or null since we trigger manually
                // We create a synthetic-like object if strictly needed, but onDelete accepts (e) => void.
                // We can construct a minimal object or just pass nothing if type allows, but type is (e: React.MouseEvent).
                // Let's cast or adjust. Actually we can just call the handler logic inside CategoryLibrary if we change the signature,
                // but simpler is to mock the stopPropagation part or just pass {} as any.
                // Better: The onDelete in CategoryLibrary calls e.stopPropagation().
                // We should pass a mock event with stopPropagation.
                onDelete({ stopPropagation: () => { } } as React.MouseEvent);
            }
        }, 800);
    };

    const endPress = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        if (isLongPressRef.current) {
            e.stopPropagation();
            return;
        }
        onClick();
    };

    return (
        <div
            onMouseDown={startPress}
            onMouseUp={endPress}
            onMouseLeave={endPress}
            onTouchStart={startPress}
            onTouchEnd={endPress}
            onClick={handleClick}
            className="bg-white rounded-lg p-2 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group select-none"
        >
            <div className="aspect-[2/3] bg-gray-100 rounded-md mb-2 overflow-hidden relative">
                {book.cover ? (
                    <img src={book.cover} alt={book.title} className="w-full h-full object-cover pointer-events-none" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <span className="text-[10px] text-gray-400 text-center px-1 line-clamp-3">{book.title}</span>
                    </div>
                )}
                {/* CEFR 等级标签 - 左上角常驻显示 */}
                {hasCefrResult && book.cefrAnalysis && (
                    <CefrLevelBadge
                        level={book.cefrAnalysis.primaryLevel}
                        className="absolute top-1 left-1"
                    />
                )}
                {/* 阅读中标签 - 如果有 CEFR 标签则移到右上角 */}
                {showReadingBadge && book.status === 'reading' && (
                    <div className={cn(
                        "absolute bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full",
                        hasCefrResult ? "top-1 right-1" : "top-1 left-1"
                    )}>
                        阅读中
                    </div>
                )}
                {/* 悬停时显示分析/查看按钮 */}
                {onAnalyze && (
                    <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={onAnalyze}
                            className={cn(
                                "px-1.5 py-0.5 text-white text-[9px] font-medium rounded transition-colors flex items-center gap-0.5",
                                hasCefrResult
                                    ? "bg-emerald-500/90 hover:bg-emerald-600"
                                    : "bg-indigo-500/90 hover:bg-indigo-600"
                            )}
                            title={hasCefrResult ? "查看分析报告" : "分析词汇难度"}
                        >
                            {hasCefrResult ? (
                                <>
                                    <Info size={10} />
                                    报告
                                </>
                            ) : (
                                <>
                                    <BarChart3 size={10} />
                                    分析
                                </>
                            )}
                        </button>
                    </div>
                )}

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
            </div >
            <h3 className="font-medium text-gray-900 text-xs truncate">{book.title}</h3>
            <p className="text-gray-400 text-[10px] truncate mt-0.5">{book.author}</p>
            {/* 进度条和百分比放在同一行 */}
            <div className="flex items-center gap-1 mt-1">
                <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${book.progress || 0}%` }}
                    />
                </div>
                <span className="text-[9px] text-gray-400 w-6 text-right">{Math.round(book.progress || 0)}%</span>
            </div>
        </div >
    );
};

// 模态框组件
interface ModalProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ title, onClose, children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <div className="relative bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
            {children}
        </div>
    </div>
);

// 导入书籍模态框
interface ImportBooksModalProps {
    categoryId: string;
    categoryName: string;
    categories: Category[];
    onClose: () => void;
    onComplete: () => void;
}

const ImportBooksModal: React.FC<ImportBooksModalProps> = ({
    categoryId, categoryName, categories, onClose, onComplete
}) => {
    const [allBooks, setAllBooks] = useState<Book[]>([]);
    const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadAvailableBooks();
    }, []);

    const loadAvailableBooks = async () => {
        const books = await LibraryStore.getBooks();
        // 过滤掉当前分类的书籍
        const available = books.filter(b => b.categoryId !== categoryId);
        setAllBooks(available);
    };

    const toggleBook = (bookId: string) => {
        const newSelected = new Set(selectedBooks);
        if (newSelected.has(bookId)) {
            newSelected.delete(bookId);
        } else {
            newSelected.add(bookId);
        }
        setSelectedBooks(newSelected);
    };

    const handleImport = async () => {
        if (selectedBooks.size > 0) {
            await CategoryStore.moveBooksToCategory(Array.from(selectedBooks), categoryId);
            onComplete();
        }
    };

    const getCategoryNameForBook = (catId: string | null | undefined): string => {
        if (!catId) return '未分类';
        const cat = categories.find(c => c.id === catId);
        return cat?.name || '未分类';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={onClose} />
            <div className="relative bg-white rounded-2xl w-full max-w-2xl mx-4 shadow-xl max-h-[80vh] flex flex-col">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">导入书籍到 "{categoryName}"</h3>
                    <p className="text-sm text-gray-500 mt-1">选择要添加到此分类的书籍</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {allBooks.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                            没有可导入的书籍
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {allBooks.map(book => (
                                <div
                                    key={book.id}
                                    onClick={() => toggleBook(book.id)}
                                    className={cn(
                                        "p-3 rounded-xl border-2 cursor-pointer transition-all",
                                        selectedBooks.has(book.id)
                                            ? "border-indigo-500 bg-indigo-50"
                                            : "border-gray-100 hover:border-gray-200"
                                    )}
                                >
                                    <div className="aspect-[2/3] bg-gray-100 rounded-lg mb-2 overflow-hidden relative">
                                        {book.cover ? (
                                            <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                                <span className="text-xs text-gray-400 text-center px-1">{book.title}</span>
                                            </div>
                                        )}
                                        {selectedBooks.has(book.id) && (
                                            <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                                                <span className="text-white text-xs">✓</span>
                                            </div>
                                        )}
                                    </div>
                                    <h4 className="font-medium text-gray-900 text-sm truncate">{book.title}</h4>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        来自：{getCategoryNameForBook(book.categoryId)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                        已选择 {selectedBooks.size} 本书
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={selectedBooks.size === 0}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            导入
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CategoryLibrary;
