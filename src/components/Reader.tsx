import React, { useEffect, useRef, useState } from 'react';
import ePub from 'epubjs';
import './Reader.css';
import { translationService } from '../services/TranslationService';
import WordDetailPopup from './WordDetailPopup';

interface ReaderProps {
    data: ArrayBuffer | string;
}

const Reader: React.FC<ReaderProps> = ({ data }) => {
    const viewerRef = useRef<HTMLDivElement>(null);
    const renditionRef = useRef<any>(null);
    const bookRef = useRef<any>(null);

    const [currentLocation, setCurrentLocation] = useState<string>('');
    const [progress, setProgress] = useState<number>(0);

    // Popup state
    const [showPopup, setShowPopup] = useState(false);
    const [popupData, setPopupData] = useState<{
        text: string;
        translation: string;
        context?: string;
    } | null>(null);
    const [isTranslating, setIsTranslating] = useState(false);

    useEffect(() => {
        if (!viewerRef.current || !data) return;

        // Initialize book
        const book: any = new ePub(data);
        bookRef.current = book;

        // Render book
        const rendition = book.renderTo(viewerRef.current, {
            width: '100%',
            height: '100%',
            flow: 'paginated',
        });
        renditionRef.current = rendition;

        rendition.display();

        rendition.on('selected', (cfiRange: string, contents: any) => {
            const range = contents.range(cfiRange);
            // const rect = range.getBoundingClientRect(); // Unused for now as using modal

            // Simple positioning for now:
            const viewElement = viewerRef.current;
            if (viewElement) {
                // Use range.toString() directly from the synchronous DOM Range object available in 'contents'
                const text = range.toString();

                if (text && text.trim().length > 0) {
                    // Extract sentence context (simple approximation)
                    let context = text.trim();
                    // TODO: Improve context extraction (e.g. Expand selection to sentence)

                    // Translate
                    setIsTranslating(true);
                    // Pass context if available (Reader extracts it)
                    translationService.translate(text.trim(), 'zh-CN', context)
                        .then(result => {
                            setPopupData({
                                text: result.text,
                                translation: result.translation,
                                context: context
                            });
                            setShowPopup(true);
                        })
                        .catch(err => {
                            console.error('Translation error:', err);
                            alert('翻译失败，请检查网络或设置');
                        })
                        .finally(() => {
                            setIsTranslating(false);
                        });
                }
            }
        });

        // Track location changes
        rendition.on('relocated', (location: any) => {
            const percent = book.locations.percentageFromCfi(location.start.cfi);
            setProgress(Math.round(percent * 100));

            // Update current location display
            if (location.start.displayed) {
                setCurrentLocation(`${location.start.displayed.page} / ${location.start.displayed.total}`);
            }
        });

        // Generate locations for progress tracking
        book.ready.then(() => {
            return book.locations.generate(1024);
        });

        // Keyboard navigation
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                rendition.prev();
            } else if (e.key === 'ArrowRight') {
                rendition.next();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            if (book) {
                book.destroy();
            }
        };
    }, [data]);

    const handlePrevPage = () => {
        renditionRef.current?.prev();
    };

    const handleNextPage = () => {
        renditionRef.current?.next();
    };

    return (
        <div className="reader-container">
            <div ref={viewerRef} className="reader-content" />

            {/* Navigation Controls */}
            <button className="nav-btn nav-btn-prev" onClick={handlePrevPage}>
                ←
            </button>
            <button className="nav-btn nav-btn-next" onClick={handleNextPage}>
                →
            </button>

            {/* Progress Bar */}
            <div className="progress-bar-container">
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <div className="progress-text">
                    {progress}%
                    {currentLocation && <span className="ml-2 text-xs text-gray-400">({currentLocation})</span>}
                </div>
            </div>

            {showPopup && popupData && (
                <WordDetailPopup
                    initialData={popupData}
                    onClose={() => setShowPopup(false)}
                />
            )}

            {isTranslating && (
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900 bg-opacity-80 text-white px-6 py-4 rounded-lg shadow-xl z-50 flex items-center space-x-3">
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>正在翻译...</span>
                </div>
            )}
        </div>
    );
};

export default Reader;
