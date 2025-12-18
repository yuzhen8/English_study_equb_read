import React, { useEffect, useRef, useState } from 'react';
import ePub from 'epubjs';
import { cn } from '../lib/utils';
import './Reader.css';
import {
    ChevronUp, ChevronDown, Settings, Minus, Plus,
    Sun, Moon, Palette, Highlighter, ChevronRight,
    ChevronLeft, BookOpen, Layers
} from 'lucide-react';

import WordDetailPopup from './WordDetailPopup';
import GrammarAnalysisPopup from './GrammarAnalysisPopup';

import { LibraryStore } from '../services/LibraryStore';
import { WordStore } from '../services/WordStore';

interface ReaderProps {
    data: ArrayBuffer | string;
    bookId?: string;
    bookTitle?: string;
    bookAuthor?: string;
    bookCover?: string;
    onClose?: () => void;
}

// 阅读设置类型
interface ReaderSettings {
    fontSize: number;
    lineHeight: number;
    theme: 'light' | 'dark' | 'sepia';
    highlightWords: boolean;
    highlightColor: string;
    highlightOpacity: number;
    highlightUseGradient: boolean;
    highlightHeight: number; // 0.2 to 1.2
    highlightRounding: 'none' | 'small' | 'medium' | 'large' | 'full';
}

const defaultSettings: ReaderSettings = {
    fontSize: 100,
    lineHeight: 1.6,
    theme: 'light',
    highlightWords: false,
    highlightColor: '#fde047', // yellow-300
    highlightOpacity: 1.0,
    highlightUseGradient: false,
    highlightHeight: 1.0,
    highlightRounding: 'medium'
};

type MenuViewState = 'main' | 'style' | 'highlight';

const Reader: React.FC<ReaderProps> = ({ data, bookId, bookTitle, bookAuthor, bookCover, onClose }) => {
    const viewerRef = useRef<HTMLDivElement>(null);
    const renditionRef = useRef<any>(null);
    const bookRef = useRef<any>(null);
    const progressRef = useRef<number>(0);
    const currentCfiRef = useRef<string | undefined>(undefined);
    const locationsReadyRef = useRef<boolean>(false);

    // Progress State
    const [progress, setProgress] = useState<number>(0);
    const [chapterTitle, setChapterTitle] = useState<string>('');
    const [pageInfo, setPageInfo] = useState({
        chapterCurrent: 1,
        chapterTotal: 1,
        globalCurrent: 1,
        globalTotal: 1
    });

    // Input handling state (Mouse & Touch)
    const inputStartRef = useRef<{ x: number, y: number, time: number } | null>(null);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isLongPressRef = useRef<boolean>(false);
    // Prevent mouse events from firing after touch events
    const lastTouchTimeRef = useRef<number>(0);

    // Book metadata from EPUB (fallback)
    const [epubMetadata, setEpubMetadata] = useState<{ title?: string; author?: string; cover?: string }>({});

    // Popup state
    const [showPopup, setShowPopup] = useState(false);
    const [popupData, setPopupData] = useState<{
        text: string;
        translation: string;
        context?: string;
    } | null>(null);

    const [showGrammarPopup, setShowGrammarPopup] = useState(false);
    const [grammarData, setGrammarData] = useState<{ text: string, context: string } | null>(null);

    // Menu state
    const [showMenu, setShowMenu] = useState(false);
    const [menuView, setMenuView] = useState<MenuViewState>('main');
    const [settings, setSettings] = useState<ReaderSettings>(() => {
        const saved = localStorage.getItem('readerSettings');
        return saved ? JSON.parse(saved) : defaultSettings;
    });

    // Helper: Hex to RGBA
    const hexToRgba = (hex: string, opacity: number) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    // Helper: Generate SVG data URL for highlight
    const getHighlightSvg = (newSettings: ReaderSettings) => {
        const rgba = hexToRgba(newSettings.highlightColor, newSettings.highlightOpacity);
        // 在 100x100 的坐标系中，半径需要大一些才能看出来
        const radiusMap = { none: 0, small: 8, medium: 16, large: 28, full: 50 };
        const r = radiusMap[newSettings.highlightRounding];

        const h = newSettings.highlightHeight * 100;
        const y = 100 - h;

        let background = rgba;
        let defs = '';

        if (newSettings.highlightUseGradient) {
            const rgba2 = hexToRgba(newSettings.highlightColor, newSettings.highlightOpacity * 0.4);
            background = 'url(#grad)';
            defs = `
                <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:${rgba};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:${rgba2};stop-opacity:1" />
                    </linearGradient>
                </defs>
            `;
        }

        // 我们在 100x100 的空间内绘制厚度调整后的矩形。
        // y 和 h 决定位置，且 CSS 不再缩放背景，圆角永不形变。
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                ${defs}
                <rect x="0" y="${y}" width="100" height="${h}" rx="${r}" ry="${r}" fill="${background}" />
            </svg>
        `.trim();

        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    };

    // 应用设置到渲染器
    const applySettings = (newSettings: ReaderSettings) => {
        if (renditionRef.current) {
            renditionRef.current.themes.fontSize(`${newSettings.fontSize}%`);
            renditionRef.current.themes.override('line-height', String(newSettings.lineHeight));

            const themes: Record<string, { body: { background: string; color: string } }> = {
                light: { body: { background: '#ffffff', color: '#1f2937' } },
                dark: { body: { background: '#1f2937', color: '#f3f4f6' } },
                sepia: { body: { background: '#f5f0e6', color: '#5c4b37' } }
            };
            renditionRef.current.themes.register('custom', themes[newSettings.theme]);
            renditionRef.current.themes.select('custom');

            // 注入高亮样式 (SVG 方案)
            const svgUrl = getHighlightSvg(newSettings);

            renditionRef.current.themes.override('.linga-highlight', `
                background-image: url('${svgUrl}') !important;
                background-size: 100% 100% !important;
                background-repeat: no-repeat !important;
                background-position: center !important;
                background-color: transparent !important;
                padding: 0 2px;
                margin: 0 -2px;
                display: inline;
                box-decoration-break: clone;
                -webkit-box-decoration-break: clone;
            `);
        }
    };

    // 更新设置
    const updateSetting = <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        localStorage.setItem('readerSettings', JSON.stringify(newSettings));
        applySettings(newSettings);
    };

    useEffect(() => {
        if (!viewerRef.current || !data) return;

        const book: any = new ePub(data);
        bookRef.current = book;

        const rendition = book.renderTo(viewerRef.current, {
            width: '100%',
            height: '100%',
            flow: 'paginated',
        });
        renditionRef.current = rendition;

        rendition.display();

        book.ready.then(() => {
            applySettings(settings);

            // 从 EPUB 提取元数据作为后备
            const metadata = book.packaging?.metadata;
            if (metadata) {
                setEpubMetadata({
                    title: metadata.title,
                    author: metadata.creator
                });
            }

            // 恢复进度
            if (bookId) {
                LibraryStore.getBooks().then(books => {
                    const savedBook = books.find(b => b.id === bookId);
                    if (savedBook?.lastCfi) {
                        rendition.display(savedBook.lastCfi);
                    }
                });
            }

            // 提取封面
            book.coverUrl().then((url: string) => {
                if (url) {
                    setEpubMetadata(prev => ({ ...prev, cover: url }));
                }
            }).catch(() => { });
        });

        rendition.on('rendered', async (_section: any, view: any) => {
            const doc = view.document;
            if (doc) {
                if (settings.highlightWords) {
                    try {
                        const words = await WordStore.getWords();
                        const wordTexts = words.map(w => w.text.toLowerCase());
                        const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
                        const nodes = [];
                        let node;
                        while (node = walker.nextNode()) nodes.push(node);

                        nodes.forEach(textNode => {
                            const text = textNode.textContent || '';
                            if (!text.trim()) return;
                            const sortedWords = [...wordTexts].sort((a, b) => b.length - a.length);
                            if (sortedWords.length > 0) {
                                const limitedWords = sortedWords.slice(0, 500);
                                const regex = new RegExp(`\\b(${limitedWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
                                if (regex.test(text)) {
                                    const span = doc.createElement('span');
                                    const svgUrl = getHighlightSvg(settings);

                                    const hlStyle = `
                                        background-image: url('${svgUrl}') !important;
                                        background-size: 100% 100% !important;
                                        background-repeat: no-repeat !important;
                                        background-position: center !important;
                                        background-color: transparent !important;
                                        padding: 0 2px;
                                        margin: 0 -2px;
                                        display: inline;
                                        box-decoration-break: clone;
                                        -webkit-box-decoration-break: clone;
                                    `.trim().replace(/\n\s*/g, ' ');

                                    span.innerHTML = text.replace(regex, (match: string) =>
                                        `<span class="linga-highlight" style="${hlStyle}">${match}</span>`
                                    );
                                    textNode.parentNode?.replaceChild(span, textNode);
                                }
                            }
                        });
                    } catch (e) {
                        console.error("Highlighting error:", e);
                    }
                }



                // --- Unified Input Handling (Touch & Mouse) ---

                const startInput = (x: number, y: number, _type: 'touch' | 'mouse') => {
                    inputStartRef.current = { x, y, time: Date.now() };
                    isLongPressRef.current = false;

                    // Start long press timer
                    longPressTimerRef.current = setTimeout(() => {
                        isLongPressRef.current = true;
                        handleLongPress(x, y, doc);
                    }, 600);
                };

                const moveInput = (x: number, y: number) => {
                    if (!inputStartRef.current) return;

                    const diffX = Math.abs(x - inputStartRef.current.x);
                    const diffY = Math.abs(y - inputStartRef.current.y);
                    const totalDist = Math.sqrt(diffX * diffX + diffY * diffY);

                    // If moved significantly (jitter threshold), cancel long press
                    if (totalDist > 10) {
                        if (longPressTimerRef.current) {
                            clearTimeout(longPressTimerRef.current);
                            longPressTimerRef.current = null;
                        }
                    }
                };

                const endInput = (x: number, y: number) => {
                    if (longPressTimerRef.current) {
                        clearTimeout(longPressTimerRef.current);
                        longPressTimerRef.current = null;
                    }

                    if (inputStartRef.current && !isLongPressRef.current) {
                        // Swipe Logic (Inside Iframe)
                        const diffX = x - inputStartRef.current.x;
                        const diffY = y - inputStartRef.current.y;
                        const timeDiff = Date.now() - inputStartRef.current.time;

                        // Only consider swipe if quick enough (< 500ms) and far enough
                        if (timeDiff < 500 && Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
                            // Check for text selection collision:
                            // If user selected text with mouse, we shouldn't turn page
                            const sel = doc.getSelection();
                            const hasSelection = sel && sel.toString().length > 0;

                            if (!hasSelection) {
                                if (diffX > 0) handlePrevPage();
                                else handleNextPage();
                            }
                        } else if (timeDiff < 500 && Math.abs(diffX) < 10 && Math.abs(diffY) < 10) {
                            // Tap Logic
                            let isWordTap = false;
                            // @ts-ignore
                            if (doc.caretRangeFromPoint) {
                                // @ts-ignore
                                const range = doc.caretRangeFromPoint(x, y);
                                if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
                                    const text = range.startContainer.textContent || "";
                                    const offset = range.startOffset;
                                    const char = text[offset] || text[offset - 1] || "";
                                    if (/[\w\d']/.test(char)) isWordTap = true;
                                }
                            }

                            if (!isWordTap) setShowControls(prev => !prev);
                        }
                    }
                    inputStartRef.current = null;
                };

                // Touch Handlers
                const handleTouchStart = (e: TouchEvent) => {
                    if (e.touches.length !== 1) return;
                    lastTouchTimeRef.current = Date.now();
                    const t = e.touches[0];
                    startInput(t.clientX, t.clientY, 'touch');
                };
                const handleTouchMove = (e: TouchEvent) => {
                    const t = e.touches[0];
                    moveInput(t.clientX, t.clientY);
                };
                const handleTouchEnd = (e: TouchEvent) => {
                    lastTouchTimeRef.current = Date.now();
                    const t = e.changedTouches[0];
                    endInput(t.clientX, t.clientY);
                };

                // Mouse Handlers
                const handleMouseDown = (e: MouseEvent) => {
                    // Ignore if recent touch (prevent phantom mouse events on touch devices)
                    if (Date.now() - lastTouchTimeRef.current < 500) return;
                    // Only Left Click
                    if (e.button !== 0) return;
                    startInput(e.clientX, e.clientY, 'mouse');
                };
                const handleMouseMove = (e: MouseEvent) => {
                    if (Date.now() - lastTouchTimeRef.current < 500) return;
                    // Only track if button held (which we know by inputStartRef presence mostly)
                    moveInput(e.clientX, e.clientY);
                };
                const handleMouseUp = (e: MouseEvent) => {
                    if (Date.now() - lastTouchTimeRef.current < 500) return;
                    endInput(e.clientX, e.clientY);
                };

                // Helper to expand range to sentence
                const expandToSentence = (range: Range, textNode: Node) => {
                    const text = textNode.textContent || "";
                    let start = range.startOffset;
                    let end = range.endOffset;

                    // Scan backwards for sentence start
                    while (start > 0) {
                        const char = text[start - 1];
                        if (/[.?!]/.test(char) && !/\b(Mr|Mrs|Ms|Dr|Jr|Sr)\./i.test(text.substring(start - 4, start))) {
                            break;
                        }
                        start--;
                    }
                    // Scan forwards for sentence end
                    while (end < text.length) {
                        const char = text[end];
                        if (/[.?!]/.test(char) && !/\b(Mr|Mrs|Ms|Dr|Jr|Sr)\./i.test(text.substring(end - 3, end + 1))) {
                            end++;
                            break;
                        }
                        end++;
                    }

                    try {
                        range.setStart(textNode, start);
                        range.setEnd(textNode, end);
                    } catch (e) { console.error("Range expansion error", e) }
                    return range;
                };

                const handleLongPress = (x: number, y: number, doc: Document) => {
                    // @ts-ignore - native API
                    if (doc.caretRangeFromPoint) {
                        // @ts-ignore
                        const range = doc.caretRangeFromPoint(x, y);
                        if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
                            const expandedRange = expandToSentence(range, range.startContainer);
                            const selection = doc.getSelection();
                            if (selection) {
                                selection.removeAllRanges();
                                selection.addRange(expandedRange);

                                const text = selection.toString().trim();
                                if (text) {
                                    setGrammarData({ text, context: text }); // Context is the sentence itself
                                    setShowGrammarPopup(true);
                                }
                            }
                        }
                    }
                };



                // Handle Tap specifically if needed, causing word selection
                doc.addEventListener('click', () => {
                    // Check if it was a touch-generated click (optional, but good for differentiation)
                    // Here we just enhance the default selection logic
                    setTimeout(() => {
                        const selection = doc.getSelection();
                        if (selection && selection.isCollapsed) {
                            // User clicked (caret), but didn't select. Let's select the word.
                            // Logic moved from mouseup to here or we augment mouseup?
                            // Existing mouseup logic handles "mouseup -> getSelection -> if text selected -> popup".
                            // If click results in caret only, we want to expand to word.

                            // However, wait... the request says "Tap to identify word".
                            // Existing code relies on `mouseup` and checks `selection.toString()`.
                            // If I tap, the browser usually sets a cursor (collapsed selection).
                            // So `selection.toString()` is empty.

                            // Let's manually select word on click if selection is empty.
                            /*
                            const sel = doc.getSelection();
                            if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
                                const range = sel.getRangeAt(0);
                                if (range.startContainer.nodeType === Node.TEXT_NODE) {
                                    expandToWord(range, range.startContainer);
                                    sel.removeAllRanges();
                                    sel.addRange(range);
                                    // Now the existing mouseup handler (or a new trigger) needs to run?
                                    // The existing mouseup handler runs on mouseup. 
                                    // On touch, we get touchstart -> touchend -> mousedown -> mouseup -> click.
                                    // So mouseup might have already run and found nothing.
                                    // We should probably trigger the popup logic here explicitly.
                                    const text = sel.toString().trim();
                                    if (text) {
                                         // Recalculate context
                                         let context = text;
                                          try {
                                               const container = range.commonAncestorContainer;
                                               const block = (container.nodeType === Node.TEXT_NODE ? container.parentNode : container) as HTMLElement;
                                               if (block && block.textContent) {
                                                   context = block.textContent.substring(0, 200);
                                               }
                                           } catch (e) { }
                                         setPopupData({ text, translation: '', context });
                                         setShowPopup(true);
                                    }
                                }
                            }
                            */
                            // NOTE: Investigating `expandToWord` logic above:
                            // The user wants "Click to identify word".
                            // The existing mouseup handler (lines 272-299) handles selection logic.
                            // But for a simple click (tap), the selection is often collapsed.
                        }
                    }, 10);
                });

                doc.addEventListener('touchstart', handleTouchStart, { passive: true });
                doc.addEventListener('touchmove', handleTouchMove, { passive: true });
                doc.addEventListener('touchend', handleTouchEnd, { passive: true });

                doc.addEventListener('mousedown', handleMouseDown);
                doc.addEventListener('mousemove', handleMouseMove);
                doc.addEventListener('mouseup', handleMouseUp);

                doc.addEventListener('click', (e: MouseEvent) => {
                    // Handle Click for Word Selection (if not selecting range)
                    // We wait for checking selection
                    setTimeout(() => {
                        // Strict Hit Test: Check if we actually clicked on a word
                        // This prevents "snapping" to nearest word when clicking whitespace
                        let isPrecisionHit = false;
                        // @ts-ignore
                        if (doc.caretRangeFromPoint) {
                            // @ts-ignore
                            const hitRange = doc.caretRangeFromPoint(e.clientX, e.clientY);
                            if (hitRange && hitRange.startContainer.nodeType === Node.TEXT_NODE) {
                                const hText = hitRange.startContainer.textContent || "";
                                const offset = hitRange.startOffset;
                                // Check characters around the hit point
                                const char = hText[offset] || "";
                                const charPrev = hText[offset - 1] || "";
                                if (/[\w\d']/.test(char) || /[\w\d']/.test(charPrev)) {
                                    isPrecisionHit = true;
                                }
                            }
                        } else {
                            // Fallback if API missing (unlikely in Electron/Chrome)
                            isPrecisionHit = true;
                        }

                        if (!isPrecisionHit) return;

                        const sel = doc.getSelection();
                        // If nothing selected (caret), select the word under cursor
                        // Note: Only if we aren't already handling a popup
                        if (sel && sel.isCollapsed && sel.rangeCount > 0) {
                            const range = sel.getRangeAt(0);
                            if (range.startContainer.nodeType === Node.TEXT_NODE) {
                                // Logic to select word
                                const textNode = range.startContainer;
                                const text = textNode.textContent || "";
                                if (!text) return;

                                let start = range.startOffset;
                                let end = range.endOffset;

                                // Basic word boundary check
                                // Expand right
                                while (end < text.length) {
                                    // Stop at non-word characters, but allow apostrophes inside words
                                    if (!/[\w\d']/.test(text[end])) break;
                                    end++;
                                }
                                // Expand left
                                while (start > 0) {
                                    if (!/[\w\d']/.test(text[start - 1])) break;
                                    start--;
                                }

                                // Check if we actually found a word
                                const word = text.slice(start, end).trim();
                                if (word.length > 1 && /[\w]/.test(word)) { // Min length check to avoid single punctuation
                                    try {
                                        const newRange = doc.createRange();
                                        newRange.setStart(textNode, start);
                                        newRange.setEnd(textNode, end);
                                        sel.removeAllRanges();
                                        sel.addRange(newRange);

                                        // Trigger popup logic
                                        // We can reuse the logic in mouseup, but mouseup already fired.
                                        // Let's invoke it directly.
                                        let context = word;
                                        try {
                                            const container = newRange.commonAncestorContainer;
                                            const block = (container.nodeType === Node.TEXT_NODE ? container.parentNode : container) as HTMLElement;
                                            if (block && block.textContent) {
                                                context = block.textContent.substring(Math.max(0, start - 50), Math.min(block.textContent.length, end + 50));
                                            }
                                        } catch (e) { }

                                        setPopupData({ text: word, translation: '', context });
                                        setShowPopup(true);
                                    } catch (err) {
                                        console.error("Selection error", err);
                                    }
                                }
                            }
                        }
                    }, 150); // Small delay to let browser handle default usage
                });

                doc.addEventListener('mouseup', () => {
                    setTimeout(() => {
                        const selection = doc.getSelection();
                        if (selection && selection.rangeCount > 0) {
                            const text = selection.toString().trim();
                            if (text.length > 0) {
                                let context = text;
                                try {
                                    const range = selection.getRangeAt(0);
                                    const container = range.commonAncestorContainer;
                                    const block = (container.nodeType === Node.TEXT_NODE ? container.parentNode : container) as HTMLElement;
                                    if (block && block.textContent) {
                                        context = block.textContent.substring(0, 200);
                                    }
                                } catch (e) { }

                                const isSentence = text.trim().split(/\s+/).length > 2;
                                if (isSentence) {
                                    setGrammarData({ text, context });
                                    setShowGrammarPopup(true);
                                } else {
                                    setPopupData({ text, translation: '', context });
                                    setShowPopup(true);
                                }
                            }
                        }
                    }, 50);
                });
            }
        });

        rendition.on('relocated', (location: any) => {
            if (locationsReadyRef.current) {
                const percent = book.locations.percentageFromCfi(location.start.cfi);
                if (!isNaN(percent)) {
                    const newProgress = Math.round(percent * 100);
                    setProgress(newProgress);
                    progressRef.current = newProgress;
                    currentCfiRef.current = location.start.cfi;
                    if (bookId && newProgress >= 0) {
                        LibraryStore.updateProgress(bookId, newProgress, location.start.cfi);
                    }
                }
            }
            const chapterItem = book.navigation.get(location.start.href);
            setChapterTitle(chapterItem ? (chapterItem.label || '') : '');
            if (book.locations.length() > 0) {
                const currentPage = book.locations.locationFromCfi(location.start.cfi);
                const totalPages = book.locations.total;
                setPageInfo(prev => ({
                    ...prev,
                    globalCurrent: currentPage + 1,
                    globalTotal: totalPages
                }));
            }
        });

        book.ready.then(() => book.locations.generate(1024)).then(() => {
            locationsReadyRef.current = true;
            const loc = rendition.currentLocation();
            if (loc) rendition.reportLocation();
        });

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') rendition.prev();
            else if (e.key === 'ArrowRight') rendition.next();
            else if (e.key === 'Escape') setShowMenu(false);
        };
        document.addEventListener('keydown', handleKeyDown);

        const currentBookId = bookId;
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            if (currentBookId && progressRef.current >= 0) {
                LibraryStore.updateProgress(currentBookId, progressRef.current, currentCfiRef.current);
            }
            locationsReadyRef.current = false;
            if (book) book.destroy();
        };
    }, [data, bookId]);

    const handlePrevPage = () => renditionRef.current?.prev();
    const handleNextPage = () => renditionRef.current?.next();

    const bgColors = { light: 'bg-white', dark: 'bg-gray-800', sepia: 'bg-[#f5f0e6]' };

    // --- 渲染菜单视图 ---
    const renderMenuView = () => {
        if (menuView === 'main') {
            return (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-200">
                    <div className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                        {(bookCover || epubMetadata.cover) && (
                            <img
                                src={bookCover || epubMetadata.cover}
                                alt={bookTitle || epubMetadata.title}
                                className="w-16 h-24 object-cover rounded-lg shadow-md flex-shrink-0"
                            />
                        )}
                        <div className="flex-1 min-w-0">
                            <h2 className="font-bold text-gray-900 text-lg truncate leading-snug">
                                {bookTitle || epubMetadata.title || '未知书籍'}
                            </h2>
                            <p className="text-gray-500 text-sm mt-1 truncate">
                                {bookAuthor || epubMetadata.author || '未知作者'}
                            </p>
                            <button
                                onClick={() => { setShowMenu(false); onClose?.(); }}
                                className="mt-3 bg-red-50 text-red-500 hover:bg-red-100 px-4 py-1.5 rounded-full text-xs font-bold transition-colors border border-red-100"
                            >
                                关闭书籍
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                        {/* 阅读风格入口 */}
                        <button
                            onClick={() => setMenuView('style')}
                            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center">
                                    <Settings size={20} />
                                </div>
                                <div className="text-left">
                                    <span className="block font-bold text-gray-900">阅读风格</span>
                                    <span className="block text-[10px] text-gray-400">字体、行高、阅读模式</span>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-gray-300" />
                        </button>

                        <div className="h-px bg-gray-50" />

                        {/* 词库单词高亮入口 */}
                        <button
                            onClick={() => setMenuView('highlight')}
                            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
                                    <Highlighter size={20} />
                                </div>
                                <div className="text-left">
                                    <span className="block font-bold text-gray-900">词库高亮</span>
                                    <span className="block text-[10px] text-gray-400">设置自动高亮的颜色、高度、透明度</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {!settings.highlightWords && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">已关</span>}
                                <ChevronRight size={18} className="text-gray-300" />
                            </div>
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-3">
                            <BookOpen size={14} className="text-gray-400" />
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">阅读进度</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={progress}
                            onChange={(e) => {
                                const val = parseInt(e.target.value) / 100;
                                const cfi = bookRef.current?.locations.cfiFromPercentage(val);
                                if (cfi) renditionRef.current?.display(cfi);
                            }}
                            className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400 mt-2 font-medium">
                            <span className="bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">0%</span>
                            <span className="text-indigo-600 font-bold">{progress}%</span>
                            <span className="bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">100%</span>
                        </div>
                    </div>
                </div>
            );
        }

        if (menuView === 'style') {
            return (
                <div className="space-y-4 animate-in slide-in-from-left-4 duration-200">
                    <div className="flex items-center justify-between mb-2">
                        <button
                            onClick={() => setMenuView('main')}
                            className="flex items-center gap-1.5 text-gray-500 hover:text-indigo-600 font-bold text-sm transition-colors"
                        >
                            <ChevronLeft size={18} /> 返回主菜单
                        </button>
                        <span className="text-sm font-bold text-gray-900">阅读风格定制</span>
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-6">
                        {/* 字体大小 */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-gray-700">字体大小</span>
                                <span className="text-xs font-mono bg-gray-50 px-2 py-1 rounded-md border border-gray-100">{settings.fontSize}%</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => updateSetting('fontSize', Math.max(80, settings.fontSize - 10))}
                                    className="flex-1 h-11 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors border border-gray-100 active:scale-95"
                                >
                                    <Minus size={18} className="text-gray-400" />
                                </button>
                                <button
                                    onClick={() => updateSetting('fontSize', Math.min(180, settings.fontSize + 10))}
                                    className="flex-1 h-11 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors border border-gray-100 active:scale-95"
                                >
                                    <Plus size={18} className="text-gray-400" />
                                </button>
                            </div>
                        </div>

                        {/* 行高 */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-gray-700">阅读行距</span>
                                <span className="text-xs font-mono bg-gray-50 px-2 py-1 rounded-md border border-gray-100">{settings.lineHeight.toFixed(1)}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => updateSetting('lineHeight', Math.max(1.2, settings.lineHeight - 0.1))}
                                    className="flex-1 h-11 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors border border-gray-100 active:scale-95"
                                >
                                    <Minus size={18} className="text-gray-400" />
                                </button>
                                <button
                                    onClick={() => updateSetting('lineHeight', Math.min(2.5, settings.lineHeight + 0.1))}
                                    className="flex-1 h-11 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors border border-gray-100 active:scale-95"
                                >
                                    <Plus size={18} className="text-gray-400" />
                                </button>
                            </div>
                        </div>

                        {/* 主题选择 */}
                        <div className="space-y-3">
                            <span className="text-sm font-bold text-gray-700">色彩空间</span>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'light', icon: Sun, label: '透亮', bg: 'bg-white', text: 'text-gray-600', active: 'border-indigo-500 bg-indigo-50' },
                                    { id: 'dark', icon: Moon, label: '深邃', bg: 'bg-gray-900', text: 'text-gray-300', active: 'border-indigo-500 bg-gray-800' },
                                    { id: 'sepia', icon: Palette, label: '护眼', bg: 'bg-[#f5f0e6]', text: 'text-[#5c4b37]', active: 'border-amber-500 bg-amber-50' }
                                ].map(the => (
                                    <button
                                        key={the.id}
                                        onClick={() => updateSetting('theme', the.id as any)}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all active:scale-95 ${settings.theme === the.id ? the.active : 'border-gray-100 hover:border-gray-200'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-full shadow-sm flex items-center justify-center ${the.bg} ${the.id !== 'light' ? '' : 'border border-gray-100'}`}>
                                            <the.icon size={18} className={settings.theme === the.id ? 'text-inherit' : 'text-gray-400'} />
                                        </div>
                                        <span className={`text-[11px] font-bold ${settings.theme === the.id ? 'text-inherit' : 'text-gray-400'}`}>{the.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (menuView === 'highlight') {
            return (
                <div className="space-y-4 animate-in slide-in-from-left-4 duration-200">
                    <div className="flex items-center justify-between mb-2">
                        <button
                            onClick={() => setMenuView('main')}
                            className="flex items-center gap-1.5 text-gray-500 hover:text-emerald-600 font-bold text-sm transition-colors"
                        >
                            <ChevronLeft size={18} /> 返回主菜单
                        </button>
                        <span className="text-sm font-bold text-gray-900">词库高亮配置</span>
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-6">
                        {/* 总开关 */}
                        <div className="flex items-center justify-between p-3 bg-emerald-50/30 rounded-xl border border-emerald-100/50">
                            <div className="flex items-center gap-2">
                                <Highlighter size={18} className="text-emerald-500" />
                                <span className="text-sm font-bold text-gray-700">启用划词高亮</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.highlightWords}
                                    onChange={(e) => updateSetting('highlightWords', e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                        </div>

                        {settings.highlightWords && (
                            <>
                                {/* 预设颜色 */}
                                <div className="space-y-3">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">高亮色彩</span>
                                    <div className="flex flex-wrap gap-2">
                                        {['#fde047', '#86efac', '#93c5fd', '#fca5a5', '#d8b4fe', '#fdba74'].map(color => (
                                            <button
                                                key={color}
                                                onClick={() => updateSetting('highlightColor', color)}
                                                className={`w-10 h-10 rounded-xl border-2 transition-all active:scale-95 flex items-center justify-center ${settings.highlightColor === color ? 'border-emerald-500 scale-105 shadow-md' : 'border-gray-100 hover:border-gray-200'}`}
                                                style={{ backgroundColor: color }}
                                            >
                                                {settings.highlightColor === color && <div className="w-2 h-2 bg-white rounded-full shadow-sm" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 高度调节 */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-gray-700">高亮高度</span>
                                        <span className="text-xs font-mono bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md">{Math.round(settings.highlightHeight * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="20"
                                        max="100"
                                        step="10"
                                        value={settings.highlightHeight * 100}
                                        onChange={(e) => updateSetting('highlightHeight', parseInt(e.target.value) / 100)}
                                        className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                    />
                                    <div className="flex justify-between text-[10px] text-gray-400">
                                        <span>下划线风</span>
                                        <span>全覆盖风</span>
                                    </div>
                                </div>

                                {/* 圆角风格 */}
                                <div className="space-y-3">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">圆角风格</span>
                                    <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                                        {(['none', 'small', 'medium', 'large', 'full'] as const).map(style => (
                                            <button
                                                key={style}
                                                onClick={() => updateSetting('highlightRounding', style)}
                                                className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${settings.highlightRounding === style ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                            >
                                                {style === 'none' ? '直角' :
                                                    style === 'small' ? '小' :
                                                        style === 'medium' ? '中' :
                                                            style === 'large' ? '大' : '全圆'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 透明度调节 */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-gray-700">色块透明度</span>
                                        <span className="text-xs font-mono bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md">{Math.round(settings.highlightOpacity * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="10"
                                        max="100"
                                        step="5"
                                        value={settings.highlightOpacity * 100}
                                        onChange={(e) => updateSetting('highlightOpacity', parseInt(e.target.value) / 100)}
                                        className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                    />
                                    <p className="text-[10px] text-gray-400 italic">* 透明度仅影响背景色，不影响文字清晰度</p>
                                </div>

                                {/* 渐变色开关 */}
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                    <div className="flex items-center gap-2">
                                        <Layers size={16} className="text-gray-400" />
                                        <span className="text-sm text-gray-700">启用渐变渲染</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer scale-90">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={settings.highlightUseGradient}
                                            onChange={(e) => updateSetting('highlightUseGradient', e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                    </label>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            );
        }
    };

    const [showControls, setShowControls] = useState(true);

    // Container Swipe Handling (Fallback/Margins) checks same logic?
    // Since we moved logic to iframe, we might removing this or keep it for margins.
    // Keeping it for margins (outside iframe) is good.
    const containerStartRef = useRef<{ x: number, y: number } | null>(null);

    const onContainerInputStart = (e: React.TouchEvent | React.MouseEvent) => {
        const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
        containerStartRef.current = { x, y };
    };

    const onContainerInputEnd = (e: React.TouchEvent | React.MouseEvent) => {
        if (!containerStartRef.current) return;
        const x = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
        const y = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;

        const diffX = x - containerStartRef.current.x;
        const diffY = y - containerStartRef.current.y;

        if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > 0) handlePrevPage();
            else handleNextPage();
        }
        containerStartRef.current = null;
    };

    return (
        <div
            className={`reader-container relative w-full h-screen overflow-hidden ${bgColors[settings.theme]}`}
            onTouchStart={onContainerInputStart}
            onTouchEnd={onContainerInputEnd}
            onMouseDown={onContainerInputStart}
            onMouseUp={onContainerInputEnd}
        >
            <div ref={viewerRef} className="reader-content absolute top-0 left-0 right-0 bottom-16" />

            {/* 点击层 - 分区域交互 */}
            {/* 1. 左侧翻页 (极窄 3%) */}
            <div className="absolute inset-y-0 left-0 w-[3%] z-20 cursor-pointer hover:bg-black/5 transition-colors" onClick={handlePrevPage} title="上一页" />

            {/* 2. 右侧翻页 (极窄 3%) */}
            <div className="absolute inset-y-0 right-0 w-[3%] z-20 cursor-pointer hover:bg-black/5 transition-colors" onClick={handleNextPage} title="下一页" />

            {/* 3. 中间切换 UI (已移除，改为由 iframe 内部点击事件触发，以支持文字交互) */}
            {/* <div className="absolute inset-y-0 left-[3%] right-[3%] z-10 cursor-default" onClick={() => setShowControls(!showControls)} /> */}

            {/* 悬浮型退出按钮 (仅在 showControls 为 true 时显示) */}
            <div className={cn(
                "absolute top-6 left-6 z-30 transition-all duration-500 ease-out transform",
                showControls ? "translate-y-0 opacity-100 scale-100" : "-translate-y-4 opacity-0 scale-90 pointer-events-none"
            )}>
                <button
                    onClick={() => onClose?.()}
                    className="flex items-center justify-center w-10 h-10 bg-white/40 backdrop-blur-md border border-white/20 text-gray-600 rounded-full shadow-lg hover:bg-white/60 hover:text-gray-900 hover:scale-105 active:scale-95 transition-all group"
                    title="退出阅读"
                >
                    <ChevronLeft size={24} className="group-hover:-translate-x-0.5 transition-transform" />
                </button>
            </div>

            {/* 底部控件 (进度与菜单) */}
            <div className={cn(
                "absolute bottom-4 left-0 right-0 z-30 px-4 flex items-center justify-center transition-all duration-500 ease-out transform",
                showControls ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none"
            )}>
                <div className="flex items-center gap-3 text-gray-400 text-[10px] bg-white/50 backdrop-blur-sm px-3 py-1 rounded-full pointer-events-auto border border-white/20">
                    <span className="max-w-[100px] truncate">{chapterTitle || '正在阅读...'}</span>
                    <span className="text-gray-300">|</span>
                    <span className="font-medium">{pageInfo.globalCurrent}/{pageInfo.globalTotal}</span>
                    <span className="text-gray-300">|</span>
                    <span className="font-bold">{progress}%</span>
                    <button
                        onClick={() => { setShowMenu(!showMenu); setMenuView('main'); }}
                        className="ml-1 text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1 bg-gray-100/50 px-2 py-0.5 rounded-md"
                    >
                        <span className="font-bold">菜单</span>
                        {showMenu ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                    </button>
                </div>
            </div>

            {/* 菜单面板 */}
            {showMenu && (
                <div className="fixed inset-0 z-50 flex flex-col">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setShowMenu(false)} />
                    <div className="relative mt-auto bg-gray-50 rounded-t-[40px] p-6 pb-10 shadow-2xl max-h-[85vh] overflow-y-auto">
                        {/* 顶部指示条 */}
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 flex-shrink-0" onClick={() => setShowMenu(false)} />
                        {renderMenuView()}
                    </div>
                </div>
            )}

            {showPopup && popupData && (
                <WordDetailPopup initialData={popupData} onClose={() => setShowPopup(false)} />
            )}

            {showGrammarPopup && grammarData && (
                <GrammarAnalysisPopup
                    text={grammarData.text}
                    context={grammarData.context}
                    onClose={() => setShowGrammarPopup(false)}
                />
            )}
        </div>
    );
};

export default Reader;
