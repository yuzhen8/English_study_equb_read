import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload } from 'lucide-react';

const LibraryList: React.FC = () => {
    const navigate = useNavigate();

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    // Navigate to reader with book data in state
                    // In a real app, we would save to indexedDB/filesystem and pass ID
                    navigate('/reader/temp-book', { state: { bookData: e.target.result } });
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 p-4">
            <div className="pt-12 pb-4">
                <h1 className="text-2xl font-bold text-gray-900">书库</h1>
            </div>

            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center max-w-sm w-full">
                    <div className="bg-blue-50 p-4 rounded-full mb-4">
                        <Upload size={32} className="text-blue-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">导入 EPUB 电子书</h2>
                    <p className="text-gray-500 text-sm mb-6">
                        点击下方按钮选择本地的 .epub 文件开始阅读
                    </p>

                    <label className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-xl cursor-pointer transition-colors w-full flex justify-center">
                        <span>打开文件</span>
                        <input
                            type="file"
                            accept=".epub"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                    </label>
                </div>
            </div>
        </div>
    );
};

export default LibraryList;
