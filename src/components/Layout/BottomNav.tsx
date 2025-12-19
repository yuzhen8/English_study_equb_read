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
        { icon: BookOpen, label: '书库', path: '/' }, // Library as Home
        { icon: Library, label: '词典', path: '/dictionary' },
        { icon: Dumbbell, label: '锻炼', path: '/exercise' },
        { icon: User, label: '我的', path: '/profile' },
    ];

    function isActive(path: string) {
        if (path === '/' && location.pathname === '/') return true;
        if (path !== '/' && location.pathname.startsWith(path)) return true;
        return false;
    }

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 h-16 px-2 glass-container flex items-center gap-1 shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 transition-all duration-300 backdrop-blur-2xl bg-black/40 border-white/10">
            {navItemsFull.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={twMerge(
                            "relative flex flex-col items-center justify-center w-16 h-12 rounded-full transition-all duration-300",
                            active ? "text-white -translate-y-1" : "text-white/40 hover:text-white hover:bg-white/5"
                        )}
                    >
                        {/* Active Indicator Background */}
                        {active && (
                            <div className="absolute inset-0 bg-white/10 rounded-full -z-10 animate-fade-in shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
                        )}

                        <Icon
                            size={24}
                            strokeWidth={active ? 2.5 : 2}
                            className={clsx("transition-transform duration-300 drop-shadow-md", active && "scale-110")}
                        />
                        <span className={clsx("text-[10px] font-medium mt-0.5 transition-colors", active ? "text-white" : "text-white/40")}>
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

export default BottomNav;
