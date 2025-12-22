import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, Database, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { WordSyncService } from '../../services/WordSyncService';
import { BookSyncService } from '../../services/BookSyncService';
import { SettingsSyncService } from '../../services/SettingsSyncService';

const Profile: React.FC = () => {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const [syncing, setSyncing] = React.useState(false);

    const handleSync = async () => {
        if (!user) return;
        setSyncing(true);
        try {
            await Promise.all([
                WordSyncService.sync(user.id),
                BookSyncService.sync(user.id),
                SettingsSyncService.sync(user.id)
            ]);
            // Optionally refresh page or show success
            console.log('Sync successful');
        } catch (e) {
            console.error('Sync failed', e);
        } finally {
            setSyncing(false);
        }
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-transparent text-white">
            <div className="bg-transparent px-4 pt-12 pb-6 mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 glass-container rounded-full flex items-center justify-center border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                        <User size={32} className="text-white" />
                    </div>
                    <div className="flex-1">
                        {user ? (
                            <>
                                <h1 className="text-xl font-bold text-white tracking-wide">{user.email?.split('@')[0]}</h1>
                                <p className="text-sm text-white/60">{user.email}</p>
                            </>
                        ) : (
                            <>
                                <h1 className="text-xl font-bold text-white tracking-wide">Guest User</h1>
                                <button
                                    onClick={() => navigate('/auth')}
                                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors mt-1"
                                >
                                    登录 / 注册
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {user && (
                    <div className="glass-card overflow-hidden">
                        <MenuItem
                            icon={RefreshCw}
                            label={syncing ? "同步中..." : "立即同步"}
                            onClick={handleSync}
                            border={true}
                        />
                        <MenuItem
                            icon={LogOut}
                            label="退出登录"
                            onClick={handleLogout}
                            border={false}
                        />
                    </div>
                )}

                <div className="glass-card overflow-hidden">
                    <MenuItem
                        icon={Settings}
                        label="设置"
                        onClick={() => navigate('/settings')}
                        border={user ? true : false}
                    />
                    {!user && (
                        <MenuItem
                            icon={Database}
                            label="备份与恢复"
                            onClick={() => navigate('/profile/data')}
                            border={false}
                        />
                    )}
                    {user && (
                        <MenuItem
                            icon={Database}
                            label="备份与恢复"
                            onClick={() => navigate('/profile/data')}
                            border={false}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

const MenuItem: React.FC<{ icon: React.ElementType, label: string, border?: boolean, onClick?: () => void }> = ({ icon: Icon, label, border = true, onClick }) => (
    <button
        className={`w-full flex items-center gap-3 p-4 hover:bg-white/10 transition-colors text-left ${border ? 'border-b border-white/5' : ''}`}
        onClick={onClick}
    >
        <Icon size={20} className="text-white/60" />
        <span className="font-medium text-white flex-1">{label}</span>
    </button>
);

export default Profile;
