import React, { useEffect, useRef, useState } from 'react';
import ePub from 'epubjs';
import './Reader.css';
import { translationService, TranslationResult } from '../services/TranslationService';
import TranslationPopup from './TranslationPopup';

interface ReaderProps {
    data: ArrayBuffer | string;
}

const Reader: React.FC<ReaderProps> = ({ data }) => {
    const viewerRef = useRef<HTMLDivElement>(null);
    const renditionRef = useRef<any>(null);
    const bookRef = useRef<any>(null);

    const [currentLocation, setCurrentLocation] = useState<string>('');
    const [progress, setProgress] = useState<number>(0);
    const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
    const [popupPosition, setPopupPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

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
            const rect = range.getBoundingClientRect();

            // Calculate absolute position relative to the window
            // Note: Since the iframe is inside the window, we might need to adjust
            // But usually range.getBoundingClientRect returns relative to viewport if in normal flow,
            // or relative to iframe viewport. 
            // ePub.js populates contents.window / contents.document

            // Simple positioning for now:
            const viewElement = viewerRef.current;
            if (viewElement) {
                // We need to account for the iframe position if we can get it, 
                // but usually the event comes from the iframe.
                // Let's rely on event coordinates or simple range rect logic + offset
                // However, getting screen coordinates from iframe selection is tricky.

                // Use range.toString() directly from the synchronous DOM Range object available in 'contents'
                const text = range.toString();

                if (text && text.trim().length > 0) {
                    // Translate
                    translationService.translate(text.trim())
                        .then(result => {
                            setTranslationResult(result);
                            // Position popup near the selection
                            // We need to convert iframe coordinates to main window coordinates
                            const iframe = viewElement.querySelector('iframe');
                            const iframeRect = iframe?.getBoundingClientRect();

                            if (iframeRect) {
                                setPopupPosition({
                                    x: rect.left + iframeRect.left,
                                    y: rect.bottom + iframeRect.top + 10 // 10px padding
                                });
                            }
                        })
                        .catch(err => console.error('Translation error:', err));
                }
            }
            // Clear selection after getting text? Maybe not, allow user to adjust?
            // Usually we keep selection.
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



    const handleClosePopup = () => {
        setTranslationResult(null);
    };

    const handleAddToVocabulary = (word: string, translation: string) => {
        console.log(`Add to vocabulary: ${word} - ${translation}`);
        // TODO: Implement actual database storage
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
                <div className="progress-text">{progress}%</div>
            </div>

            <TranslationPopup
                result={translationResult}
                position={popupPosition}
                onClose={handleClosePopup}
                onAddToVocabulary={handleAddToVocabulary}
            />
        </div>
    );
};

export default Reader;
