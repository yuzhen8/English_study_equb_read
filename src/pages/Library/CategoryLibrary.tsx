import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ePub from 'epubjs';
import {
    Plus, Clock, FolderOpen, Pencil, Trash2,
    BookOpen, Menu, X, BarChart3, Info,
    Upload, Library, Check
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
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);

    const [books, setBooks] = useState<Book[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Add resize listener to auto-manage sidebar
    useEffect(() => {
        const handleResize = () => {
            setSidebarOpen(window.innerWidth >= 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
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

    // UI Interaction States
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
    const [editModeBookId, setEditModeBookId] = useState<string | null>(null); // Lifted state for edit mode
    const [isDraggingBook, setIsDraggingBook] = useState(false); // New state for drag feedback


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

    const [importState, setImportState] = useState<'idle' | 'loading' | 'success'>('idle');

    const handleLocalImport = async () => {
        try {
            const filePath = await window.electronAPI.selectFile();
            if (filePath) {
                setImportState('loading');
                const fileResult = await window.electronAPI.readFile(filePath);
                if (fileResult.success && fileResult.data) {
                    await LibraryStore.addBook(filePath, fileResult.data, selectedCategory);
                    await loadBooks();
                    setImportState('success');
                    setTimeout(() => setImportState('idle'), 2000);
                } else {
                    console.error("Failed to read file", fileResult.error);
                    setImportState('idle');
                }
            }
        } catch (error) {
            console.error("Failed to import book", error);
            setImportState('idle');
        }
    };

    const handleDropOnCategory = async (e: React.DragEvent, targetCategoryId: string) => {
        e.preventDefault();
        const bookId = e.dataTransfer.getData('text/plain');
        if (bookId && targetCategoryId !== selectedCategory && targetCategoryId !== SYSTEM_CATEGORY_READING && targetCategoryId !== SYSTEM_CATEGORY_ALL) {
            await CategoryStore.moveBooksToCategory([bookId], targetCategoryId);
            await loadBooks();
        }
    };


    return (
        <div
            className="flex h-full bg-transparent overflow-hidden"
            onClick={() => {
                if (editModeBookId) setEditModeBookId(null);
            }}
        >
            {/* Mobile Sidebar Toggle */}

            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 glass-button"
            >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Mobile Sidebar Backdrop */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "w-60 glass-container flex flex-col transition-transform duration-300 z-40 m-4 ml-2 backdrop-blur-3xl",
                "fixed inset-y-0 left-0 lg:static lg:h-[calc(100%-32px)] lg:mt-4 lg:ml-4",
                sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
                <div className="p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white tracking-wide">我的书库</h2>
                </div>

                {/* System Categories */}
                <div className="p-3 space-y-1">
                    <SidebarItem
                        icon={<FolderOpen size={18} />}
                        label="全部书籍"
                        selected={selectedCategory === SYSTEM_CATEGORY_ALL}
                        onClick={() => setSelectedCategory(SYSTEM_CATEGORY_ALL)}
                    // System categories don't typically accept drops in this simple implementation except basic ones if needed
                    // But dragging to 'All' or 'Reading' might not change category in the same way. 
                    // Let's allow drop on 'All' (maybe no-op or remove from category?) -> stick to 'Custom' for now as per req.
                    // Wait, user might want to move back to 'Uncategorized'? Let's enable for specific logic if needed.
                    // For now only custom categories were requested but let's pass isDragging to all for consistency if we want.
                    // Actually, let's only highlight valid drop targets.
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
                        isDragging={isDraggingBook && selectedCategory !== SYSTEM_CATEGORY_UNCATEGORIZED}
                        onDrop={(e) => handleDropOnCategory(e, SYSTEM_CATEGORY_UNCATEGORIZED)}
                        onDragOver={(e) => e.preventDefault()}
                    />
                </div>

                {/* Divider */}
                <div className="h-px bg-white/10 mx-6 my-2" />

                {/* Custom Categories */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    <p className="text-xs text-white/50 font-medium px-4 py-2 uppercase tracking-wider">我的分类</p>
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
                                isDragging={isDraggingBook && selectedCategory !== cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                onDrop={(e) => handleDropOnCategory(e, cat.id)}
                                onDragOver={(e) => e.preventDefault()}
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
                        className="w-full mt-2 py-2 px-3 border border-dashed border-white/20 rounded-lg text-white/40 text-sm font-medium hover:border-indigo-400 hover:text-indigo-300 hover:bg-white/5 transition-all flex items-center justify-center gap-2 opacity-80 hover:opacity-100"
                    >
                        <Plus size={16} />
                        新建分类...
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden lg:ml-0">
                {/* Header */}
                <div className="z-10 px-8 py-6 shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-1 drop-shadow-md">{getCategoryName(selectedCategory)}</h1>
                            <p className="text-sm text-white/60">{books.length} 本书</p>
                        </div>
                        {selectedCategory !== SYSTEM_CATEGORY_ALL && selectedCategory !== SYSTEM_CATEGORY_READING && (
                            <div className="relative">
                                {/* Import Button Removed in favor of Add Card */}


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
                            <div className="glass-card p-8 rounded-2xl border border-white/10 text-center max-w-sm backdrop-blur-md">
                                <BookOpen size={48} className="mx-auto text-white/20 mb-4" />
                                <h3 className="text-lg font-bold text-white mb-2 tracking-wide">暂无书籍</h3>
                                <p className="text-white/50 text-sm">
                                    {selectedCategory === SYSTEM_CATEGORY_READING
                                        ? '开始阅读一本书后会显示在这里'
                                        : '点击下方按钮添加书籍到此分类'}
                                </p>
                                {selectedCategory !== SYSTEM_CATEGORY_READING && (
                                    <button
                                        onClick={handleLocalImport}
                                        className="mt-6 px-8 py-3 bg-indigo-500/20 hover:bg-indigo-500/30 text-white border border-indigo-500/30 backdrop-blur-md rounded-xl transition-all flex items-center justify-center gap-2 mx-auto font-bold shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.4)] active:scale-95"
                                    >
                                        <Plus size={20} />
                                        添加书籍
                                    </button>
                                )}
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
                                    isEditMode={editModeBookId === book.id}
                                    onLongPress={() => setEditModeBookId(book.id)}
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
                                        setEditModeBookId(null);
                                    }}
                                    onDragStart={() => setIsDraggingBook(true)}
                                    onDragEnd={() => setIsDraggingBook(false)}
                                />

                            ))}
                            {/* Add Book Card */}
                            <div
                                onClick={handleLocalImport}
                                className="glass-card flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-colors border-dashed border-2 border-white/20 aspect-[3/4] rounded-2xl group"
                            >
                                {importState === 'loading' ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                        <span className="text-xs text-white/60">导入中...</span>
                                    </div>
                                ) : importState === 'success' ? (
                                    <div className="flex flex-col items-center gap-2 animate-in zoom-in duration-300">
                                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
                                            <Check size={24} className="text-emerald-500" />
                                        </div>
                                        <span className="text-sm font-medium text-emerald-500">添加成功</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                            <Plus size={24} className="text-white/60" />
                                        </div>
                                        <span className="text-sm font-medium text-white/60">添加书籍</span>
                                    </>
                                )}
                            </div>


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
                        className="w-full px-4 py-2 border border-white/20 bg-white/5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-white/30"
                        autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            onClick={() => setShowCreateModal(false)}
                            className="px-4 py-2 text-white/60 hover:bg-white/10 rounded-lg transition-colors"
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
                        className="w-full px-4 py-2 border border-white/20 bg-white/5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-white/30"
                        autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            onClick={() => setShowRenameModal(false)}
                            className="px-4 py-2 text-white/60 hover:bg-white/10 rounded-lg transition-colors"
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
    isDragging?: boolean;
    onClick: () => void;
    onDrop?: (e: React.DragEvent) => void;
    onDragOver?: (e: React.DragEvent) => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, selected, isDragging, onClick, onDrop, onDragOver }) => (
    <button
        onClick={onClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all text-left mb-1 relative overflow-hidden group border",
            selected
                ? "bg-white/20 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)] border-white/10"
                : "text-white/60 hover:bg-white/10 hover:text-white border-transparent",
            // Drag target visual cue
            isDragging && !selected && "border-dashed border-indigo-400/50 bg-indigo-500/10 text-indigo-200 animate-wiggle"
        )}
    >
        {selected && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 to-purple-400" />
        )}
        <span className={cn("transition-colors", selected ? "text-white" : "text-white/60 group-hover:text-white")}>{icon}</span>
        <span className="truncate flex-1 tracking-wide">{label}</span>
    </button>
);

// 书籍卡片组件
interface BookCardProps {
    book: Book;
    onClick: () => void;
    showReadingBadge?: boolean;
    isEditMode: boolean;
    onLongPress: () => void;
    onAnalyze?: (e: React.MouseEvent) => void;
    onDelete?: (e: React.MouseEvent) => void;
    onDragStart?: () => void;
    onDragEnd?: () => void;
}

const BookCard: React.FC<BookCardProps> = ({ book, onClick, showReadingBadge, isEditMode, onLongPress, onAnalyze, onDelete, onDragStart, onDragEnd }) => {
    const hasCefrResult = !!book.cefrAnalysis;
    const timerRef = React.useRef<any>(null);
    const isLongPressRef = React.useRef(false);

    const startPress = () => {
        isLongPressRef.current = false;
        timerRef.current = setTimeout(() => {
            isLongPressRef.current = true;
            if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback
            onLongPress();
        }, 500); // 500ms for long press
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
        if (isEditMode) {
            // In edit mode, clicking the card body shouldn't necessarily do anything or maybe cancel?
            // Since we have global cancel, we let propagation happen or stop it?
            // If we stop propagation, global click won't fire.
            // If we want clicking the *same* card to cancel, we should let it propagate to the global handler.
            // So actually, just don't stop propagation here if we want global handler to catch it.
            // But 'onClick' prop handles navigation, we must prevent navigation.
            e.stopPropagation();
            // Maybe explicitly call cancel? Or just do nothing and let user click elsewhere?
            // User requirement: "Clicking blank space should cancel".
            // If I click the card itself while in edit mode, should it open? Probably not.
            return;
        }
        onClick();
    };

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('text/plain', book.id);
        e.dataTransfer.effectAllowed = 'move';
        if (onDragStart) onDragStart();
    };

    const handleDragEnd = () => {
        if (onDragEnd) onDragEnd();
    };

    return (
        <div
            onMouseDown={startPress}
            onMouseUp={endPress}
            onMouseLeave={endPress}
            onTouchStart={startPress}
            onTouchEnd={endPress}
            onClick={handleClick}
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className={cn(
                "glass-card hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative group p-3 border border-white/5 transition-all",
                isEditMode && "ring-2 ring-red-500/50 scale-95 animate-wiggle"
            )}
        >
            <div className="aspect-[2/3] bg-black/20 rounded-lg mb-3 overflow-hidden relative shadow-inner">
                {book.cover ? (
                    <img src={book.cover} alt={book.title} className="w-full h-full object-cover pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/5">
                        <span className="text-xs text-white/40 text-center px-2 line-clamp-3 font-medium">{book.title}</span>
                    </div>
                )}
                {/* CEFR 等级标签 - 左上角常驻显示 */}
                {hasCefrResult && book.cefrAnalysis && (
                    <CefrLevelBadge
                        level={book.cefrAnalysis.primaryLevel}
                        className="absolute top-1 left-1 z-10"
                        onClick={onAnalyze}
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
                    <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
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

                {/* Confirm Delete Button (Trash Can) - Top Right */}
                {isEditMode && onDelete && (
                    <div className="absolute top-2 right-2 z-30 animate-in zoom-in duration-200">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(e);
                            }}
                            className="w-8 h-8 rounded-full bg-red-500 text-white shadow-lg flex items-center justify-center hover:bg-red-600 hover:scale-110 transition-all border border-white/20"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
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
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative glass-card bg-black/40 p-6 w-full max-w-md mx-4 shadow-2xl border border-white/20">
            <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
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
