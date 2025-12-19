import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Sparkles, Globe, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import OllamaSettingsSection from './components/OllamaSettingsSection';
import DeepSeekSettingsSection from './components/DeepSeekSettingsSection';
import AIPromptSettingsSection from './components/AIPromptSettingsSection';
import { translationService } from '../../services/TranslationService';
import { useTheme } from '../../context/ThemeContext';

const Settings: React.FC = () => {
    const navigate = useNavigate();
    const { currentTheme, setTheme, availableThemes } = useTheme();
    const [expandedSections, setExpandedSections] = useState({
        ai: true,
        network: false
    });

    const [activeProvider, setActiveProvider] = useState<string>('google');
    const [proxy, setProxy] = useState<string>('');
    const [isSavingProxy, setIsSavingProxy] = useState(false);

    useEffect(() => {
        // @ts-ignore
        window.electronAPI.getSettings().then((settings: any) => {
            if (settings?.translationProvider) {
                setActiveProvider(settings.translationProvider);
            }
            if (settings?.proxy) {
                setProxy(settings.proxy);
            }
        });
    }, []);

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const handleProviderChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newProvider = e.target.value;
        setActiveProvider(newProvider);

        try {
            // @ts-ignore
            await window.electronAPI.saveSettings({
                translationProvider: newProvider,
                ollamaEnabled: newProvider === 'ollama',
                deepseekEnabled: newProvider === 'deepseek'
            });

            translationService.setActiveProvider(newProvider);
        } catch (err) {
            console.error('Failed to save provider choice', err);
        }
    };

    const handleSaveProxy = async () => {
        setIsSavingProxy(true);
        try {
            // @ts-ignore
            await window.electronAPI.saveSettings({ proxy });
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
                            <div className="px-6 pb-8 space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
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
                                    <p className="text-xs text-indigo-300/60 mt-3 flex items-center gap-1.5">
                                        <div className="w-1 h-1 rounded-full bg-indigo-400 box-shadow-glow"></div>
                                        选择后的引擎将立即应用于所有句子深度解析任务
                                    </p>
                                </div>

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

                                <div className="h-px bg-white/10"></div>

                                {/* DeepSeek Configuration */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 px-1">
                                        <div className="w-1.5 h-4 bg-indigo-500 rounded-full box-shadow-glow"></div>
                                        <h3 className="font-bold text-white">DeepSeek 配置</h3>
                                    </div>
                                    <DeepSeekSettingsSection isActive={activeProvider === 'deepseek'} />
                                </div>

                                <div className="h-px bg-white/10"></div>

                                {/* Ollama Configuration */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 px-1">
                                        <div className="w-1.5 h-4 bg-blue-500 rounded-full box-shadow-glow"></div>
                                        <h3 className="font-bold text-white">Ollama 配置</h3>
                                    </div>
                                    <OllamaSettingsSection isActive={activeProvider === 'ollama'} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Theme Settings Section */}
                    <div className="glass-card overflow-hidden transition-all">
                        <div className="px-5 py-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-pink-500/20 text-pink-300 shadow-lg shadow-pink-500/10">
                                <Sparkles size={24} />
                            </div>
                            <div className="text-left">
                                <span className="font-bold text-white text-base">外观主题</span>
                                <p className="text-sm text-white/50 mt-0.5">个性化您的应用色彩与氛围</p>
                            </div>
                        </div>

                        <div className="px-5 pb-6">
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
                    </div>
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
                            <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-400/20 mt-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-blue-200 mb-2">HTTP / HTTPS 代理地址</label>
                                    <input
                                        type="text"
                                        value={proxy}
                                        onChange={(e) => setProxy(e.target.value)}
                                        placeholder="例如: http://127.0.0.1:7890"
                                        className="w-full p-3 bg-black/40 border border-blue-500/30 rounded-xl text-sm font-mono text-white focus:ring-2 focus:ring-blue-500 focus:bg-black/60 outline-none shadow-inner placeholer-white/20"
                                    />
                                </div>
                                <button
                                    onClick={handleSaveProxy}
                                    disabled={isSavingProxy}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-600/20"
                                >
                                    {isSavingProxy ? '正在应用...' : '保存并应用代理'}
                                </button>
                                <div className="flex items-start gap-2 text-xs text-blue-300/70">
                                    <Shield size={14} className="mt-0.5 flex-shrink-0" />
                                    <p>
                                        代理设置将应用于 Google 翻译、DeepSeek API 以及电子书内容下载。
                                        留空则使用系统默认连接。
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
                </div>
            </div>
        </div>
    );
};

export default Settings;
