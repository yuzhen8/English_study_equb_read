import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Loader } from 'lucide-react';

interface AudioPlayerProps {
    src?: string;  // 音频URL（可选）
    word?: string; // 单词文本（用于TTS回退）
    className?: string;
    autoPlay?: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, word, className = '', autoPlay = false }) => {
    const [playing, setPlaying] = useState(false);
    const [loading, setLoading] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (autoPlay && (src || word)) {
            handlePlay();
        }
    }, [src, word, autoPlay]);

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

    // 使用TTS播放
    const playWithTTS = (text: string) => {
        if ('speechSynthesis' in window) {
            // 取消正在播放的语音
            speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;

            utterance.onstart = () => {
                setLoading(false);
                setPlaying(true);
            };

            utterance.onend = () => {
                setPlaying(false);
            };

            utterance.onerror = () => {
                setPlaying(false);
                setLoading(false);
            };

            speechSynthesis.speak(utterance);
        } else {
            setPlaying(false);
            setLoading(false);
        }
    };

    const handlePlay = () => {
        // 如果有音频URL，优先使用
        if (src && audioRef.current) {
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
                    // 音频播放失败，回退到TTS
                    if (word) {
                        playWithTTS(word);
                    } else {
                        setPlaying(false);
                        setLoading(false);
                    }
                });
        } else if (word) {
            // 没有音频URL，直接使用TTS
            setLoading(true);
            playWithTTS(word);
        }
    };

    const handleEnded = () => {
        setPlaying(false);
        setLoading(false);
    };

    const handleError = () => {
        console.error("Audio load error for:", src);
        // 音频加载失败，回退到TTS
        if (word) {
            playWithTTS(word);
        } else {
            setPlaying(false);
            setLoading(false);
        }
    };

    // 必须有src或word
    if (!src && !word) return null;

    return (
        <div className={`inline-flex items-center ${className}`}>
            <button
                onClick={handlePlay}
                disabled={playing || loading}
                className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${playing || loading ? 'text-blue-500' : 'text-gray-600'
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

