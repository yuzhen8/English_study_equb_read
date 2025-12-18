import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Database, FolderArchive, Upload } from 'lucide-react';
import { BackupService } from '../../services/BackupService';

const DataManagement: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleBackupData = async () => {
        setLoading(true);
        try {
            await BackupService.backupData();
            alert('数据备份成功！');
        } catch (e) {
            console.error(e);
            alert('备份失败: ' + (e instanceof Error ? e.message : String(e)));
        } finally {
            setLoading(false);
        }
    };

    const handleRestoreData = async () => {
        if (!confirm('恢复数据将覆盖或合并现有的学习记录。建议先备份当前数据。\n\n是否继续？')) return;

        setLoading(true);
        try {
            const stats = await BackupService.restoreData();
            if (stats.words > 0 || stats.books > 0) {
                alert(`数据恢复成功！\n\n已恢复:\n- ${stats.words} 个单词\n- ${stats.books} 本书籍进度`);
            }
        } catch (e) {
            console.error(e);
            alert('恢复失败: ' + (e instanceof Error ? e.message : String(e)));
        } finally {
            setLoading(false);
        }
    };

    const handleBackupBooks = async () => {
        setLoading(true);
        try {
            await BackupService.backupBooks();
            alert('书籍导出成功！');
        } catch (e) {
            console.error(e);
            alert('导出失败: ' + (e instanceof Error ? e.message : String(e)));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="bg-white px-4 pt-6 pb-4 shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-gray-600">
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900">数据备份与恢复</h1>
                </div>
            </div>

            <div className="p-4 space-y-6">
                {/* 核心数据区 */}
                <div className="space-y-2">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">学习数据</h2>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 divide-y divide-gray-50">
                        <ActionButton
                            icon={Database}
                            title="备份学习数据"
                            desc="导出单词本、阅读进度、生词本等记录"
                            onClick={handleBackupData}
                            loading={loading}
                        />
                        <ActionButton
                            icon={Upload}
                            title="恢复学习数据"
                            desc="从备份文件导入，合并到当前记录"
                            onClick={handleRestoreData}
                            loading={loading}
                            color="text-indigo-600"
                        />
                    </div>
                </div>

                {/* 文件导出区 */}
                <div className="space-y-2">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">文件管理</h2>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                        <ActionButton
                            icon={FolderArchive}
                            title="导出电子书文件"
                            desc="将所有 EPUB 书籍源文件导出到文件夹"
                            onClick={handleBackupBooks}
                            loading={loading}
                        />
                    </div>
                </div>

                <p className="text-xs text-gray-400 px-2 leading-relaxed">
                    特别说明：<br />
                    1. 恢复数据时，如果记录已存在（如相同的单词或书籍），将会更新为备份中的状态。<br />
                    2. 导出电子书仅导出文件本身，不包含阅读进度（阅读进度请使用“备份学习数据”）。
                </p>
            </div>

            {loading && (
                <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
                    <div className="bg-white p-4 rounded-xl shadow-lg flex items-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent"></div>
                        <span className="text-sm font-medium text-gray-700">处理中...</span>
                    </div>
                </div>
            )}
        </div>
    );
};

interface ActionButtonProps {
    icon: React.ElementType;
    title: string;
    desc: string;
    onClick: () => void;
    loading?: boolean;
    color?: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon: Icon, title, desc, onClick, loading, color = "text-gray-700" }) => (
    <button
        onClick={onClick}
        disabled={loading}
        className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
    >
        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Icon size={24} className={color} />
        </div>
        <div className="flex-1 min-w-0">
            <h3 className={`font-bold text-base mb-1 ${color}`}>{title}</h3>
            <p className="text-xs text-gray-500">{desc}</p>
        </div>
    </button>
);

export default DataManagement;
