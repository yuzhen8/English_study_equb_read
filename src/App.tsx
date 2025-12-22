import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { initTranslationServices } from './services/init';
import './App.css';

import MainLayout from './components/Layout/MainLayout';
import DictionaryDashboard from './pages/Dictionary/DictionaryDashboard';
import ExerciseHub from './pages/Exercise/ExerciseHub';
import ExerciseScopeSelector from './pages/Exercise/ExerciseScopeSelector';
import ExerciseSession from './pages/Exercise/ExerciseSession';
import CategoryLibrary from './pages/Library/CategoryLibrary';
import Profile from './pages/Profile/Profile';
import ReaderView from './pages/Reader/ReaderView';
import WordList from './pages/Dictionary/WordList';
import GroupDetail from './pages/Dictionary/GroupDetail';
import Settings from './pages/Settings/Settings';
import DataManagement from './pages/Profile/DataManagement';
import StatisticsPage from './pages/Statistics/StatisticsPage';

import { ThemeProvider, useTheme } from './context/ThemeContext';
import { cn } from './lib/utils';
import TitleBar from './components/Layout/TitleBar';
import { Auth } from './components/Auth';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WordSyncService } from './services/WordSyncService';
import { WordStore } from './services/WordStore';
import { BookSyncService } from './services/BookSyncService';
import { SettingsSyncService } from './services/SettingsSyncService';
import { AlertTriangle, Database, RotateCcw } from 'lucide-react';
import { resetDatabase } from './services/db';

const AppContent = () => {
    const { currentTheme } = useTheme();
    const { user } = useAuth();

    // 自动同步定时器 (每5分钟)
    useEffect(() => {
        if (!user) return;

        const syncAll = async () => {
            console.log('Starting auto-sync...');
            try {
                // Run cleanup once? Or every time? 
                // Running it every time is safe but might be slightly expensive.
                // Let's run it.
                await WordStore.cleanupDuplicates();

                await Promise.all([
                    WordSyncService.sync(user.id),
                    BookSyncService.sync(user.id),
                    SettingsSyncService.sync(user.id)
                ]);
                console.log('Auto-sync completed');
            } catch (error) {
                console.error('Auto-sync failed:', error);
            }
        };

        // Initial Sync
        syncAll();

        const intervalId = setInterval(syncAll, 5 * 60 * 1000); // 5 minutes

        // [NEW] Real-time Word Sync Subscription
        // This decouples WordStore from WordSyncService to avoid circular dependency
        const unsubscribeWords = WordStore.subscribe((word: any, source: 'local' | 'sync' = 'local') => {
            // Only push changes initiated locally by the user. 
            // Ignore changes coming from the sync process itself to avoid loops.
            if (user && source === 'local') {
                WordSyncService.pushWord(user.id, word);
            }
        });

        return () => {
            clearInterval(intervalId);
            unsubscribeWords();
        };
    }, [user]);

    return (
        <div className={cn(
            "flex flex-col h-screen overflow-hidden text-white font-sans relative transition-colors duration-700 ease-in-out",
            currentTheme.colors.background
        )}>
            {/* Ambient Background Glow - Moved from MainLayout to Global */}
            <div className={cn(
                "absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] animate-pulse-glow pointer-events-none transition-colors duration-1000",
                currentTheme.colors.glowPrimary
            )} />
            <div className={cn(
                "absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] animate-pulse-glow delay-1000 pointer-events-none transition-colors duration-1000",
                currentTheme.colors.glowSecondary
            )} />

            <TitleBar />

            <div className="flex-1 relative overflow-hidden z-10">
                <Routes>
                    <Route path="/" element={<MainLayout />}>
                        <Route index element={<CategoryLibrary />} />
                        <Route path="dictionary" element={<DictionaryDashboard />} />
                        <Route path="dictionary/list" element={<WordList />} />
                        <Route path="dictionary/group/:id" element={<GroupDetail />} />
                        <Route path="library" element={<CategoryLibrary />} />
                        <Route path="exercise" element={<ExerciseHub />} />
                        <Route path="exercise/scope/:mode" element={<ExerciseScopeSelector />} />
                        <Route path="exercise/session/:mode" element={<ExerciseSession />} />
                        <Route path="profile" element={<Profile />} />
                        <Route path="profile/data" element={<DataManagement />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="auth" element={<Auth />} />
                        <Route path="statistics" element={<StatisticsPage />} />
                        <Route path="stats" element={<Navigate to="/statistics" replace />} />
                    </Route>

                    {/* Reader is full screen, outside MainLayout */}
                    <Route path="/reader/:bookId" element={<ReaderView />} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </div>

    );
};

// 全局数据库错误处理 Modal
const DbErrorModal = () => {
    const [visible, setVisible] = useState(false);
    const [errorDetails, setErrorDetails] = useState<any>(null);

    useEffect(() => {
        const handleDbError = (event: Event) => {
            const customEvent = event as CustomEvent;
            console.error("Global DB Error Caught:", customEvent.detail);
            setErrorDetails(customEvent.detail);
            setVisible(true);
        };

        window.addEventListener('db-error', handleDbError);
        return () => window.removeEventListener('db-error', handleDbError);
    }, []);

    if (!visible) return null;

    const handleReset = async () => {
        if (confirm('确定要重置数据库吗？这将深度清除应用存储（IndexedDB, LocalStorage, Cache），所有本地数据将丢失。')) {
            try {
                // Try aggressive reset via Main Process first
                // @ts-ignore
                if (window.electronAPI && window.electronAPI.resetAppStorage) {
                    console.log('Attempting aggressive storage reset...');
                    // @ts-ignore
                    const result = await window.electronAPI.resetAppStorage();
                    if (result.success) {
                        alert('重置成功！应用正在重启...');
                        window.location.reload();
                        return;
                    } else {
                        throw new Error(result.error);
                    }
                }

                // Fallback to renderer reset
                await resetDatabase();
                alert('重置成功，应用将重启。');
                window.location.reload();
            } catch (e: any) {
                alert('重置失败: ' + (e.message || String(e)) + '\n请尝试手动删除应用数据文件夹。');
                console.error(e);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                    <Database size={32} className="text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-white text-center mb-2">数据库发生严重错误</h2>
                <p className="text-slate-300 text-center text-sm mb-6">
                    检测到 IndexedDB 内部错误。这通常是由于磁盘空间不足或数据损坏引起的。
                    <br /><br />
                    <span className="font-mono text-xs text-red-400 bg-black/30 p-1 rounded inline-block max-w-full truncate">
                        {errorDetails?.error?.message || 'Unknown Internal Error'}
                    </span>
                </p>

                <div className="space-y-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        <RotateCcw size={18} />
                        尝试重启应用
                    </button>
                    <button
                        onClick={handleReset}
                        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-900/20"
                    >
                        <AlertTriangle size={18} />
                        重置数据库 (清除数据)
                    </button>
                    <button
                        onClick={() => setVisible(false)}
                        className="w-full py-2 text-slate-500 hover:text-slate-400 text-xs text-center"
                    >
                        暂时忽略 (应用可能不可用)
                    </button>
                </div>
            </div>
        </div>
    );
};

function App() {
    useEffect(() => {
        initTranslationServices();
    }, []);

    return (
        <ThemeProvider>
            <AuthProvider>
                <AppContent />
                <DbErrorModal />
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
