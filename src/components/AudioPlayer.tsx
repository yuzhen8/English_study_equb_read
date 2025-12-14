import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Loader } from 'lucide-react';

interface AudioPlayerProps {
    src: string;
    className?: string;
    autoPlay?: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, className = '', autoPlay = false }) => {
    const [playing, setPlaying] = useState(false);
    const [loading, setLoading] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (autoPlay && audioRef.current && src) {
            handlePlay();
        }
    }, [src, autoPlay]);

    // Normalize file:// paths for Electron
    const normalizeSrc = (url: string): string => {
        if (!url) return '';
        // If it's already a file:// URL, use it as is
        if (url.startsWith('file://')) {
            return url;
        }
        // If it's a local file path (Windows: C:\... or Unix: /...)
        if (url.match(/^[A-Za-z]:\\|^\/[^\/]/)) {
            // Convert to file:// URL
            // Windows paths need special handling
            if (url.includes('\\')) {
                return `file:///${url.replace(/\\/g, '/')}`;
            }
            return `file://${url}`;
        }
        // Otherwise, assume it's an HTTP/HTTPS URL
        return url;
    };

    const handlePlay = () => {
        if (!src || !audioRef.current) return;
        
        setLoading(true);
        setPlaying(true);
        
        const normalizedSrc = normalizeSrc(src);
        audioRef.current.src = normalizedSrc;
        
        audioRef.current.play()
            .then(() => {
                setLoading(false);
            })
            .catch(err => {
                console.error("Audio playback error:", err);
                setPlaying(false);
                setLoading(false);
            });
    };

    const handleEnded = () => {
        setPlaying(false);
        setLoading(false);
    };

    const handleError = () => {
        console.error("Audio load error for:", src);
        setPlaying(false);
        setLoading(false);
    };

    if (!src) return null;

    return (
        <div className={`inline-flex items-center ${className}`}>
            <button
                onClick={handlePlay}
                disabled={playing || loading}
                className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${
                    playing || loading ? 'text-blue-500' : 'text-gray-600'
                }`}
                title="播放发音"
            >
                {loading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                ) : (
                    <Volume2 className="w-4 h-4" />
                )}
            </button>
            <audio
                ref={audioRef}
                onEnded={handleEnded}
                onError={handleError}
                onLoadedData={() => setLoading(false)}
                className="hidden"
            />
        </div>
    );
};

export default AudioPlayer;
