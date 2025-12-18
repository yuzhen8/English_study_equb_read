import React from 'react';
import { BookOpen, Library, Dumbbell, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface NavItem {
    icon: React.ElementType;
    label: string;
    path: string;
}

const BottomNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();



    /* 
       Update: Added 'Dictionary' as home/default. 
       'Stats' (BarChart2) might be part of Dictionary or a separate page. 
       Plan said: "首页/书库 -> BookOpen", "词典 -> Library", "锻炼 -> Biceps", "统计 -> BarChart2", "个人 -> User".
       Plan also said 5 items. Let's include all 5 as per plan.
    */

    const navItemsFull: NavItem[] = [
        { icon: BookOpen, label: '书库', path: '/library' },
        { icon: Library, label: '词典', path: '/' }, // Dictionary Dashboard as Home
        { icon: Dumbbell, label: '锻炼', path: '/exercise' },
        { icon: User, label: '我的', path: '/profile' },
    ];

    function isActive(path: string) {
        if (path === '/' && location.pathname === '/') return true;
        if (path !== '/' && location.pathname.startsWith(path)) return true;
        return false;
    }

    return (
        <div className="h-16 border-t border-gray-200 bg-white flex items-center justify-around z-50">
            {navItemsFull.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={twMerge(
                            "flex flex-col items-center justify-center w-full h-full text-xs gap-1 transition-colors",
                            active ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        <Icon size={24} strokeWidth={active ? 2.5 : 2} />
                        <span className={clsx("font-medium", active ? "text-blue-600" : "text-gray-500")}>
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

export default BottomNav;
