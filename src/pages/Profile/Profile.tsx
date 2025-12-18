import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, Bell, Shield } from 'lucide-react';

const Profile: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-gray-50">
            <div className="bg-white px-4 pt-12 pb-6 mb-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                        <User size={32} className="text-gray-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Guest User</h1>
                        <p className="text-sm text-gray-500">Local Account</p>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-4">
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                    <MenuItem
                        icon={Settings}
                        label="设置"
                        onClick={() => navigate('/settings')}
                    />
                    <MenuItem icon={Bell} label="通知" />
                    <MenuItem icon={Shield} label="隐私" border={false} />
                </div>
            </div>
        </div>
    );
};

const MenuItem: React.FC<{ icon: React.ElementType, label: string, border?: boolean, onClick?: () => void }> = ({ icon: Icon, label, border = true, onClick }) => (
    <button
        className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left ${border ? 'border-b border-gray-100' : ''}`}
        onClick={onClick}
    >
        <Icon size={20} className="text-gray-400" />
        <span className="font-medium text-gray-700 flex-1">{label}</span>
    </button>
);

export default Profile;
