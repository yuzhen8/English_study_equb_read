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

function App() {
    useEffect(() => {
        initTranslationServices();
    }, []);

    return (
        <Routes>
            <Route path="/" element={<MainLayout />}>
                <Route index element={<DictionaryDashboard />} />
                <Route path="dictionary/list" element={<WordList />} />
                <Route path="dictionary/group/:id" element={<GroupDetail />} />
                <Route path="library" element={<CategoryLibrary />} />
                <Route path="exercise" element={<ExerciseHub />} />
                <Route path="exercise/scope/:mode" element={<ExerciseScopeSelector />} />
                <Route path="exercise/session/:mode" element={<ExerciseSession />} />
                <Route path="profile" element={<Profile />} />
                <Route path="settings" element={<Settings />} />
                <Route path="stats" element={<div className="p-8 text-center text-gray-500">Statistics (Coming Soon)</div>} />
            </Route>

            {/* Reader is full screen, outside MainLayout */}
            <Route path="/reader/:bookId" element={<ReaderView />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
