import { useNavigate } from 'react-router-dom';
import { User, Settings, Database } from 'lucide-react';

const Profile: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-transparent text-white">
            <div className="bg-transparent px-4 pt-12 pb-6 mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 glass-container rounded-full flex items-center justify-center border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                        <User size={32} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-wide">Guest User</h1>
                        <p className="text-sm text-white/60">Local Account</p>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-4">
                <div className="glass-card overflow-hidden">
                    <MenuItem
                        icon={Settings}
                        label="设置"
                        onClick={() => navigate('/settings')}
                        border={false}
                    />
                </div>

                <div className="glass-card overflow-hidden">
                    {/* Data Management Submenu */}
                    <MenuItem
                        icon={Database}
                        label="备份与恢复"
                        onClick={() => navigate('/profile/data')}
                        border={false}
                    />
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
