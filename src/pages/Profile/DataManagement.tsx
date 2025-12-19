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
        <div className="bg-transparent min-h-screen">
            <div className="px-4 pt-6 pb-4 z-10 sticky top-0 bg-transparent">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="text-xl font-bold text-white tracking-tight">数据备份与恢复</h1>
                </div>
            </div>

            <div className="p-4 space-y-8">
                {/* 核心数据区 */}
                <div className="space-y-4">
                    <h2 className="text-xs font-bold text-indigo-300/80 uppercase tracking-widest ml-1">学习数据</h2>
                    <div className="glass-card overflow-hidden shadow-lg border border-white/10 divide-y divide-white/10">
                        <ActionButton
                            icon={Database}
                            title="备份学习数据"
                            desc="导出单词本、阅读进度、生词本等记录"
                            onClick={handleBackupData}
                            loading={loading}
                            color="text-emerald-300"
                            iconBg="bg-emerald-500/20"
                        />
                        <ActionButton
                            icon={Upload}
                            title="恢复学习数据"
                            desc="从备份文件导入，合并到当前记录"
                            onClick={handleRestoreData}
                            loading={loading}
                            color="text-indigo-300"
                            iconBg="bg-indigo-500/20"
                        />
                    </div>
                </div>

                {/* 文件导出区 */}
                <div className="space-y-4">
                    <h2 className="text-xs font-bold text-indigo-300/80 uppercase tracking-widest ml-1">文件管理</h2>
                    <div className="glass-card overflow-hidden shadow-lg border border-white/10">
                        <ActionButton
                            icon={FolderArchive}
                            title="导出电子书文件"
                            desc="将所有 EPUB 书籍源文件导出到文件夹"
                            onClick={handleBackupBooks}
                            loading={loading}
                            color="text-amber-300"
                            iconBg="bg-amber-500/20"
                        />
                    </div>
                </div>

                <p className="text-xs text-white/40 px-2 leading-relaxed tracking-wide">
                    特别说明：<br />
                    1. 恢复数据时，如果记录已存在（如相同的单词或书籍），将会更新为备份中的状态。<br />
                    2. 导出电子书仅导出文件本身，不包含阅读进度（阅读进度请使用“备份学习数据”）。
                </p>
            </div>

            {loading && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="glass-card p-6 rounded-2xl shadow-xl flex items-center gap-4 border border-white/20">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-400 border-t-transparent shadow-[0_0_10px_rgba(129,140,248,0.5)]"></div>
                        <span className="text-sm font-medium text-white/90">处理中...</span>
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
    iconBg?: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon: Icon, title, desc, onClick, loading, color = "text-white", iconBg = "bg-white/10" }) => (
    <button
        onClick={onClick}
        disabled={loading}
        className="w-full flex items-center gap-4 p-5 hover:bg-white/5 transition-colors text-left disabled:opacity-50 group"
    >
        <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
            <Icon size={24} className={color} />
        </div>
        <div className="flex-1 min-w-0">
            <h3 className={`font-bold text-base mb-1 ${color} group-hover:text-white transition-colors`}>{title}</h3>
            <p className="text-xs text-white/40">{desc}</p>
        </div>
    </button>
);

export default DataManagement;
