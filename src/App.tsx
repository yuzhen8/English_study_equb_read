import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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

import { ThemeProvider, useTheme } from './context/ThemeContext';
import { cn } from './lib/utils';
import TitleBar from './components/Layout/TitleBar';
import { Auth } from './components/Auth';
import { AuthProvider } from './contexts/AuthContext';

const AppContent = () => {
    const { currentTheme } = useTheme();

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
                        <Route path="stats" element={<div className="p-8 text-center text-gray-500">Statistics (Coming Soon)</div>} />
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

function App() {
    useEffect(() => {
        initTranslationServices();
    }, []);

    return (
        <ThemeProvider>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
