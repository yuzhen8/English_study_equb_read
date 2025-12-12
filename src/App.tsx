import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { initTranslationServices } from './services/init';
import './App.css';

import MainLayout from './components/Layout/MainLayout';
import DictionaryDashboard from './pages/Dictionary/DictionaryDashboard';
import ExerciseHub from './pages/Exercise/ExerciseHub';
import LibraryList from './pages/Library/LibraryList';
import Profile from './pages/Profile/Profile';
import ReaderView from './pages/Reader/ReaderView';
import WordList from './pages/Dictionary/WordList';

function App() {
    useEffect(() => {
        initTranslationServices();
    }, []);

    return (
        <Routes>
            <Route path="/" element={<MainLayout />}>
                <Route index element={<DictionaryDashboard />} />
                <Route path="dictionary/list" element={<WordList />} />
                <Route path="library" element={<LibraryList />} />
                <Route path="exercise" element={<ExerciseHub />} />
                <Route path="profile" element={<Profile />} />
                <Route path="stats" element={<div className="p-8 text-center text-gray-500">Statistics (Coming Soon)</div>} />
            </Route>

            {/* Reader is full screen, outside MainLayout */}
            <Route path="/reader/*" element={<ReaderView />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
