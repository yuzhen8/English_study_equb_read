import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Sparkles, Globe, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import OllamaSettingsSection from './components/OllamaSettingsSection';
import DeepSeekSettingsSection from './components/DeepSeekSettingsSection';
import AIPromptSettingsSection from './components/AIPromptSettingsSection';
import { translationService } from '../../services/TranslationService';
import { useAuth } from '../../contexts/AuthContext';
import { SettingsSyncService } from '../../services/SettingsSyncService';
import { useTheme } from '../../context/ThemeContext';

const Settings: React.FC = () => {
    const navigate = useNavigate();
    const { currentTheme, setTheme, availableThemes } = useTheme();
    // [NEW] Use Auth
    const { user } = useAuth();

    const [expandedSections, setExpandedSections] = useState({
        ai: false,
        network: false,
        theme: false
    });

    const [activeProvider, setActiveProvider] = useState<string>('google');
    const [proxy, setProxy] = useState<string>('');
    const [isSavingProxy, setIsSavingProxy] = useState(false);

    const [fastProvider, setFastProvider] = useState<string>('google');
    const [baiduAppId, setBaiduAppId] = useState('');
    const [baiduSecret, setBaiduSecret] = useState('');

    useEffect(() => {
        // [MODIFIED] Load local settins first
        // @ts-ignore
        window.electronAPI.getSettings().then(async (settings: any) => {
            let merged = { ...settings };

            // [NEW] If user is logged in, fetch remote settings and merge
            if (user) {
                const remoteData = await SettingsSyncService.getSettings(user.id);
                if (remoteData?.app_settings) {
                    // Remote takes precedence or we merge? 
                    // Usually for settings, we might want remote to win if it's "syncing down".
                    // But if local has changed recently?
                    // For simplicity, let's overlay remote on top of local for initial load
                    // assuming the user wants to see their cloud settings.
                    merged = { ...merged, ...remoteData.app_settings };

                    // Also update local store to match remote? 
                    // Yes, consistency is key.
                    // @ts-ignore
                    await window.electronAPI.saveSettings(merged);
                }
            }

            if (merged?.translationProvider) {
                setActiveProvider(merged.translationProvider);
            }
            if (merged?.proxy) {
                setProxy(merged.proxy);
            }
            if (merged?.fastTranslationProvider) {
                setFastProvider(merged.fastTranslationProvider);
            }
            if (merged?.apiKeys?.baiduAppId) setBaiduAppId(merged.apiKeys.baiduAppId);
            if (merged?.apiKeys?.baiduSecret) setBaiduSecret(merged.apiKeys.baiduSecret);
        });
    }, [user]); // Re-run if user logs in

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const handleProviderChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newProvider = e.target.value;
        setActiveProvider(newProvider);

        const settingsUpdate = {
            translationProvider: newProvider,
            ollamaEnabled: newProvider === 'ollama',
            deepseekEnabled: newProvider === 'deepseek'
        };

        try {
            // @ts-ignore
            await window.electronAPI.saveSettings(settingsUpdate);
            translationService.setActiveProvider(newProvider);

            // [NEW] Sync to Supabase
            if (user) {
                await SettingsSyncService.saveAppSettings(user.id, settingsUpdate);
            }

        } catch (err) {
            console.error('Failed to save provider choice', err);
        }
    };

    const handleFastProviderChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newProvider = e.target.value;
        setFastProvider(newProvider);
        const settingsUpdate = { fastTranslationProvider: newProvider };
        try {
            // @ts-ignore
            await window.electronAPI.saveSettings(settingsUpdate);
            // [NEW] Sync to Supabase
            if (user) {
                await SettingsSyncService.saveAppSettings(user.id, settingsUpdate);
            }
        } catch (err) {
            console.error('Failed to save fast provider', err);
        }
    };

    const saveBaiduConfig = async () => {
        try {
            // @ts-ignore
            const currentSettings = await window.electronAPI.getSettings();
            const newApiKeys = { ...currentSettings.apiKeys, baiduAppId, baiduSecret };
            const settingsUpdate = { apiKeys: newApiKeys };

            // @ts-ignore
            await window.electronAPI.saveSettings(settingsUpdate);
            // [NEW] Sync to Supabase
            if (user) {
                await SettingsSyncService.saveAppSettings(user.id, settingsUpdate);
            }

            alert('百度翻译配置已保存');
        } catch (err) {
            console.error('Failed to save baidu config', err);
            alert('保存失败');
        }
    };

    const handleSaveProxy = async () => {
        setIsSavingProxy(true);
        try {
            const settingsUpdate = { proxy };
            // @ts-ignore
            await window.electronAPI.saveSettings(settingsUpdate);
            // [NEW] Sync to Supabase
            if (user) {
                await SettingsSyncService.saveAppSettings(user.id, settingsUpdate);
            }
            alert('代理设置已保存并生效');
        } catch (err) {
            console.error('Failed to save proxy', err);
            alert('保存代理失败');
        } finally {
            setIsSavingProxy(false);
        }
    };

    return (
        <div className="min-h-screen bg-transparent flex flex-col font-sans text-white">
            {/* Header */}
            <header className="bg-transparent px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors glass-button"
                    aria-label="返回"
                >
                    <ArrowLeft size={22} className="text-white/80" />
                </button>
                <div>
                    <h1 className="text-lg font-bold text-white drop-shadow-md">设置</h1>
                    <p className="text-xs text-white/60">管理您的偏好设置与服务连接</p>
                </div>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pb-12 custom-scrollbar">
                <div className="max-w-2xl mx-auto w-full p-4 space-y-4">

                    {/* Unified AI Settings Section */}
                    <div className="glass-card overflow-hidden transition-all">
                        <button
                            onClick={() => toggleSection('ai')}
                            className="w-full px-5 py-5 flex items-center justify-between hover:bg-white/5 transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${expandedSections.ai ? 'bg-indigo-500/80 text-white shadow-lg shadow-indigo-500/30' : 'bg-indigo-500/20 text-indigo-300 group-hover:bg-indigo-500/30'}`}>
                                    <Sparkles size={24} />
                                </div>
                                <div className="text-left">
                                    <span className="font-bold text-white text-base">AI 深度解析设置</span>
                                    <p className="text-sm text-white/50 mt-0.5">选择并配置您的 AI 翻译与语法分析引擎</p>
                                </div>
                            </div>
                            <div className={`p-2 rounded-full transition-colors ${expandedSections.ai ? 'bg-white/10 text-white' : 'text-white/30 group-hover:text-white/60'}`}>
                                {expandedSections.ai ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                        </button>

                        {expandedSections.ai && (
                            <div className="px-6 pb-8 space-y-8 animate-in fade-in slide-in-from-top-2 duration-300 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {/* Provider Selection Dropdown */}
                                <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-400/20 mt-4">
                                    <label className="block text-sm font-bold text-indigo-200 mb-2">当前解析引擎</label>
                                    <div className="relative">
                                        <select
                                            value={activeProvider}
                                            onChange={handleProviderChange}
                                            className="w-full p-3 bg-black/40 border border-indigo-500/30 rounded-xl text-sm font-medium text-white focus:ring-2 focus:ring-indigo-500 focus:bg-black/60 outline-none appearance-none cursor-pointer pr-10 shadow-inner"
                                        >
                                            <option value="google" className="bg-slate-800 text-white">Google 翻译 (仅基础翻译)</option>
                                            <option value="deepseek" className="bg-slate-800 text-white">DeepSeek AI (推荐 - 云端高性能)</option>
                                            <option value="ollama" className="bg-slate-800 text-white">Ollama (本地离线服务)</option>
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400">
                                            <ChevronDown size={18} />
                                        </div>
                                    </div>
                                    <div className="text-xs text-indigo-300/60 mt-3 flex items-center gap-1.5">
                                        <div className="w-1 h-1 rounded-full bg-indigo-400 box-shadow-glow"></div>
                                        选择后的引擎将立即应用于所有句子深度解析任务
                                    </div>
                                </div>

                                {/* Fast Translation Service Selector */}
                                <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-400/20 mt-4">
                                    <label className="block text-sm font-bold text-blue-200 mb-2">句子翻译服务</label>
                                    <div className="relative">
                                        <select
                                            value={fastProvider}
                                            onChange={handleFastProviderChange}
                                            className="w-full p-3 bg-black/40 border border-blue-500/30 rounded-xl text-sm font-medium text-white focus:ring-2 focus:ring-blue-500 focus:bg-black/60 outline-none appearance-none cursor-pointer pr-10 shadow-inner"
                                        >
                                            <option value="google" className="bg-slate-800 text-white">Google 翻译 (无需配置)</option>
                                            <option value="bing" className="bg-slate-800 text-white">Bing 翻译 (Microsoft Edge)</option>
                                            <option value="baidu" className="bg-slate-800 text-white">百度翻译 (需 AppID)</option>
                                            <option value="ollama" className="bg-slate-800 text-white">Ollama / 禁用快速翻译 (仅使用 AI)</option>
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-blue-400">
                                            <ChevronDown size={18} />
                                        </div>
                                    </div>
                                    <div className="text-xs text-blue-300/60 mt-3 flex items-center gap-1.5">
                                        <div className="w-1 h-1 rounded-full bg-blue-400 box-shadow-glow"></div>
                                        用于在 AI 深度分析完成前提供即时翻译结果
                                    </div>

                                    {/* Baidu Config */}
                                    {fastProvider === 'baidu' && (
                                        <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-1">
                                            <div>
                                                <label className="block text-xs text-blue-200/80 mb-1">App ID</label>
                                                <input
                                                    type="text"
                                                    value={baiduAppId}
                                                    onChange={e => setBaiduAppId(e.target.value)}
                                                    placeholder="百度翻译 App ID"
                                                    className="w-full p-2 bg-black/20 border border-blue-500/20 rounded-lg text-sm text-white focus:border-blue-500/50 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-blue-200/80 mb-1">Secret Key</label>
                                                <input
                                                    type="password"
                                                    value={baiduSecret}
                                                    onChange={e => setBaiduSecret(e.target.value)}
                                                    placeholder="百度翻译密钥"
                                                    className="w-full p-2 bg-black/20 border border-blue-500/20 rounded-lg text-sm text-white focus:border-blue-500/50 outline-none"
                                                />
                                            </div>
                                            <button
                                                onClick={saveBaiduConfig}
                                                className="px-4 py-2 bg-blue-600/80 hover:bg-blue-600 rounded-lg text-xs font-bold text-white transition-colors"
                                            >
                                                保存百度配置
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* DeepSeek Configuration */}
                                {activeProvider === 'deepseek' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center gap-2 px-1">
                                            <div className="w-1.5 h-4 bg-indigo-500 rounded-full box-shadow-glow"></div>
                                            <h3 className="font-bold text-white">DeepSeek 配置</h3>
                                        </div>
                                        <DeepSeekSettingsSection isActive={true} />
                                        <div className="h-px bg-white/10"></div>
                                    </div>
                                )}

                                {/* Ollama Configuration */}
                                {activeProvider === 'ollama' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center gap-2 px-1">
                                            <div className="w-1.5 h-4 bg-blue-500 rounded-full box-shadow-glow"></div>
                                            <h3 className="font-bold text-white">Ollama 配置</h3>
                                        </div>
                                        <OllamaSettingsSection isActive={true} />
                                        <div className="h-px bg-white/10"></div>
                                    </div>
                                )}

                                {/* Prompt Template Management */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 px-1">
                                        <div className="w-1.5 h-4 bg-purple-500 rounded-full box-shadow-glow"></div>
                                        <h3 className="font-bold text-white">解析模板管理</h3>
                                    </div>
                                    <div className="p-4 bg-purple-50/30 rounded-2xl border border-purple-100/50">
                                        <AIPromptSettingsSection />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Theme Settings Section */}
                    <div className="glass-card overflow-hidden transition-all">
                        <button
                            onClick={() => toggleSection('theme')}
                            className="w-full px-5 py-5 flex items-center justify-between hover:bg-white/5 transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${expandedSections.theme ? 'bg-pink-500/80 text-white shadow-lg shadow-pink-500/30' : 'bg-pink-500/20 text-pink-300 group-hover:bg-pink-500/30'}`}>
                                    <Sparkles size={24} />
                                </div>
                                <div className="text-left">
                                    <span className="font-bold text-white text-base">外观主题</span>
                                    <p className="text-sm text-white/50 mt-0.5">个性化您的应用色彩与氛围</p>
                                </div>
                            </div>
                            <div className={`p-2 rounded-full transition-colors ${expandedSections.theme ? 'bg-white/10 text-white' : 'text-white/30 group-hover:text-white/60'}`}>
                                {expandedSections.theme ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                        </button>

                        {expandedSections.theme && (
                            <div className="px-6 pb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {availableThemes.map((theme) => (
                                        <button
                                            key={theme.id}
                                            onClick={() => setTheme(theme.id)}
                                            className={`group relative p-3 rounded-xl border transition-all duration-300 overflow-hidden text-left ${currentTheme.id === theme.id
                                                ? 'bg-white/10 border-white/40 shadow-lg scale-[1.02]'
                                                : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/20'
                                                }`}
                                        >
                                            <div className={`absolute inset-0 opacity-20 transition-opacity group-hover:opacity-30 ${theme.colors.background}`}></div>

                                            <div className="relative z-10 flex flex-col gap-2">
                                                <div className="flex items-center justify-between">
                                                    <div className={`w-8 h-8 rounded-full shadow-inner ${theme.colors.background} border border-white/10 flex items-center justify-center`}>
                                                        <div className={`w-3 h-3 rounded-full ${theme.colors.glowPrimary}`}></div>
                                                    </div>
                                                    {currentTheme.id === theme.id && (
                                                        <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center shadow-sm">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="20 6 9 17 4 12"></polyline>
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <div className="text-sm font-bold text-white">{theme.name}</div>
                                                    <div className="text-[10px] text-white/40 mt-0.5 capitalize">{theme.id}</div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Network Settings Section */}
                    <div className="glass-card overflow-hidden transition-all">
                        <button
                            onClick={() => toggleSection('network')}
                            className="w-full px-5 py-5 flex items-center justify-between hover:bg-white/5 transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${expandedSections.network ? 'bg-blue-500/80 text-white shadow-lg shadow-blue-500/30' : 'bg-blue-500/20 text-blue-300 group-hover:bg-blue-500/30'}`}>
                                    <Globe size={24} />
                                </div>
                                <div className="text-left">
                                    <span className="font-bold text-white text-base">网络与代理设置</span>
                                    <p className="text-sm text-white/50 mt-0.5">配置网络连接与 API 代理</p>
                                </div>
                            </div>
                            <div className={`p-2 rounded-full transition-colors ${expandedSections.network ? 'bg-white/10 text-white' : 'text-white/30 group-hover:text-white/60'}`}>
                                {expandedSections.network ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                        </button>

                        {expandedSections.network && (
                            <div className="px-6 pb-8 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="mt-4 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-white/80 mb-2">HTTP / HTTPS 代理地址</label>
                                        <input
                                            type="text"
                                            value={proxy}
                                            onChange={(e) => setProxy(e.target.value)}
                                            placeholder="例如: http://127.0.0.1:7890"
                                            className="w-full p-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none transition-all shadow-inner placeholder-white/20"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSaveProxy}
                                        disabled={isSavingProxy}
                                        className="w-full py-2.5 bg-blue-600/80 hover:bg-blue-600 disabled:bg-white/10 disabled:text-white/30 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/20 border border-blue-400/20"
                                    >
                                        {isSavingProxy ? '正在应用...' : '保存并应用代理'}
                                    </button>
                                    <div className="flex items-start gap-2 text-xs text-white/40">
                                        <Shield size={14} className="mt-0.5 flex-shrink-0" />
                                        <p>
                                            代理设置将应用于 Google 翻译、DeepSeek API 以及电子书内容下载。
                                            留空则使用系统默认连接。
                                        </p>
                                    </div>

                                    {/* Manual Sync Trigger */}
                                    <div className="pt-4 border-t border-white/10">
                                        <button
                                            onClick={async () => {
                                                if (user) {
                                                    alert('开始手动同步...');
                                                    try {
                                                        const { WordSyncService } = await import('../../services/WordSyncService');
                                                        const { BookSyncService } = await import('../../services/BookSyncService');
                                                        const { SettingsSyncService } = await import('../../services/SettingsSyncService');
                                                        const { WordStore } = await import('../../services/WordStore');

                                                        await WordStore.cleanupDuplicates();
                                                        await Promise.all([
                                                            WordSyncService.sync(user.id),
                                                            BookSyncService.sync(user.id),
                                                            SettingsSyncService.sync(user.id)
                                                        ]);
                                                        alert('同步完成！请检查数据是否更新。');
                                                        // Force helper to reload if needed? Listeners should handle it.
                                                    } catch (e) {
                                                        console.error(e);
                                                        alert('同步失败，请查看控制台日志');
                                                    }
                                                } else {
                                                    alert('请先登录');
                                                }
                                            }}
                                            className="w-full py-2.5 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20 border border-indigo-400/20 flex items-center justify-center gap-2"
                                        >
                                            <Globe size={18} />
                                            <span>立即同步所有数据</span>
                                        </button>
                                        <p className="text-center text-xs text-white/30 mt-2">
                                            手动触发一次完整的数据同步 (单词、进度、设置)
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Future Placeholder */}
                    <div className="glass-card p-8 flex flex-col items-center justify-center text-center space-y-3 border-dashed border-white/10">
                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-white/20">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <p className="text-white/40 font-medium">更多设置项即将推出</p>
                            <p className="text-xs text-white/20 mt-1">我们将为您提供更丰富的个性化选项</p>
                        </div>

                        {/* Danger Zone */}
                        <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 mt-8 mb-8">
                            <h3 className="font-medium text-red-900 mb-4">危险区域</h3>
                            <p className="text-sm text-red-700 mb-4">
                                如果遇到 "Internal Error" 或数据库损坏无法加载数据，可以尝试重置本地数据库。
                                注意：将清除本地所有未同步的数据（如果已同步则安全）。
                            </p>
                            <button
                                onClick={async () => {
                                    if (confirm('确定要重置本地数据库吗？这将清除本地缓存并重新加载应用。\n请确保已尝试过重启应用。')) {
                                        try {
                                            // @ts-ignore
                                            const { resetDatabase } = await import('../../services/db');
                                            await resetDatabase();
                                            alert('重置成功，即将刷新页面...');
                                            window.location.reload();
                                        } catch (e: any) {
                                            alert('重置失败，请尝试在控制台运行 window.resetAppDB()');
                                            console.error(e);
                                        }
                                    }
                                }}
                                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                            >
                                重置本地数据库
                            </button>
                        </div>
                    </div>
                </div>
            </div >
        </div >
    );
};

export default Settings;
