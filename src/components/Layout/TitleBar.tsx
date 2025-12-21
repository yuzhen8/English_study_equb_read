import React, { useEffect, useState } from 'react';
import { Minus, Square, X, Maximize2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/utils';

const TitleBar: React.FC = () => {
    const { currentTheme } = useTheme();
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        // @ts-ignore
        if (window.electronAPI?.onMaximizedChange) {
            // @ts-ignore
            const cleanup = window.electronAPI.onMaximizedChange((maximized: boolean) => {
                setIsMaximized(maximized);
            });
            return cleanup;
        }
    }, []);

    const handleMinimize = () => {
        // @ts-ignore
        window.electronAPI?.minimize();
    };

    const handleMaximize = () => {
        // @ts-ignore
        window.electronAPI?.maximize();
    };

    const handleClose = () => {
        // @ts-ignore
        window.electronAPI?.close();
    };

    return (
        <div
            className={cn(
                "h-9 flex items-center justify-between px-3 select-none flex-shrink-0 z-50 border-b",
                "backdrop-blur-md transition-colors duration-500",
                currentTheme.id === 'default' ? 'border-white/5 bg-slate-900/30' : 'border-white/10 bg-black/20'
            )}
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
            {/* Logo / Title Area */}
            <div className="flex items-center gap-2 pl-1">
                <div className={cn(
                    "w-3 h-3 rounded-full shadow-glow animate-pulse",
                    currentTheme.colors.accent === 'indigo' ? 'bg-indigo-400' :
                        currentTheme.colors.accent === 'cyan' ? 'bg-cyan-400' :
                            currentTheme.colors.accent === 'emerald' ? 'bg-emerald-400' :
                                currentTheme.colors.accent === 'orange' ? 'bg-orange-400' :
                                    currentTheme.colors.accent === 'fuchsia' ? 'bg-fuchsia-400' : 'bg-white'
                )} />
                <span className="text-xs font-semibold text-white/50 tracking-wider font-mono">ESReader</span>
            </div>

            {/* Window Controls - No Drag Region */}
            <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                <button
                    onClick={handleMinimize}
                    className="p-1.5 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                >
                    <Minus size={14} />
                </button>
                <button
                    onClick={handleMaximize}
                    className="p-1.5 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                >
                    {isMaximized ? <Square size={12} /> : <Maximize2 size={12} />}
                </button>
                <button
                    onClick={handleClose}
                    className="p-1.5 rounded-md hover:bg-red-500/80 text-white/50 hover:text-white transition-colors group"
                >
                    <X size={14} className="group-hover:scale-110 transition-transform" />
                </button>
            </div>
        </div>
    );
};

export default TitleBar;
