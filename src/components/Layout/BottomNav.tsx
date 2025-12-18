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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 h-16 px-2 bg-white/90 backdrop-blur-lg rounded-full flex items-center gap-1 shadow-2xl border border-white/50 z-50 transition-all duration-300">
            {navItemsFull.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={twMerge(
                            "relative flex flex-col items-center justify-center w-16 h-12 rounded-full transition-all duration-300",
                            active ? "text-blue-600 -translate-y-1" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                        )}
                    >
                        {/* Active Indicator Background */}
                        {active && (
                            <div className="absolute inset-0 bg-blue-50 rounded-full -z-10 animate-fade-in" />
                        )}

                        <Icon
                            size={24}
                            strokeWidth={active ? 2.5 : 2}
                            className={clsx("transition-transform duration-300", active && "scale-110")}
                        />
                        <span className={clsx("text-[10px] font-medium mt-0.5 transition-colors", active ? "text-blue-600" : "text-slate-500")}>
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

export default BottomNav;
