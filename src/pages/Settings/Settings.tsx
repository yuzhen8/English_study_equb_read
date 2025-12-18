import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Sparkles, Globe, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import OllamaSettingsSection from './components/OllamaSettingsSection';
import DeepSeekSettingsSection from './components/DeepSeekSettingsSection';
import AIPromptSettingsSection from './components/AIPromptSettingsSection';
import { translationService } from '../../services/TranslationService';

const Settings: React.FC = () => {
    const navigate = useNavigate();
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
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Header */}
            <header className="bg-white px-4 py-4 flex items-center gap-4 border-b border-gray-100 sticky top-0 z-10">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="返回"
                >
                    <ArrowLeft size={22} className="text-gray-600" />
                </button>
                <div>
                    <h1 className="text-lg font-bold text-gray-900">设置</h1>
                    <p className="text-xs text-gray-500">管理您的偏好设置与服务连接</p>
                </div>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pb-12">
                <div className="max-w-2xl mx-auto w-full p-4 space-y-4">

                    {/* Unified AI Settings Section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all">
                        <button
                            onClick={() => toggleSection('ai')}
                            className="w-full px-5 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${expandedSections.ai ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'}`}>
                                    <Sparkles size={24} />
                                </div>
                                <div className="text-left">
                                    <span className="font-bold text-gray-900 text-base">AI 深度解析设置</span>
                                    <p className="text-sm text-gray-500 mt-0.5">选择并配置您的 AI 翻译与语法分析引擎</p>
                                </div>
                            </div>
                            <div className={`p-2 rounded-full transition-colors ${expandedSections.ai ? 'bg-gray-100 text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                {expandedSections.ai ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                        </button>

                        {expandedSections.ai && (
                            <div className="px-6 pb-8 space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                                {/* Provider Selection Dropdown */}
                                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 mt-4">
                                    <label className="block text-sm font-bold text-indigo-900 mb-2">当前解析引擎</label>
                                    <div className="relative">
                                        <select
                                            value={activeProvider}
                                            onChange={handleProviderChange}
                                            className="w-full p-3 bg-white border border-indigo-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer pr-10 shadow-sm"
                                        >
                                            <option value="google">Google 翻译 (仅基础翻译)</option>
                                            <option value="deepseek">DeepSeek AI (推荐 - 云端高性能)</option>
                                            <option value="ollama">Ollama (本地离线服务)</option>
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500">
                                            <ChevronDown size={18} />
                                        </div>
                                    </div>
                                    <p className="text-xs text-indigo-600/70 mt-3 flex items-center gap-1.5">
                                        <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                                        选择后的引擎将立即应用于所有句子深度解析任务
                                    </p>
                                </div>

                                {/* Prompt Template Management */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 px-1">
                                        <div className="w-1.5 h-4 bg-purple-600 rounded-full"></div>
                                        <h3 className="font-bold text-gray-900">解析模板管理</h3>
                                    </div>
                                    <div className="p-4 bg-purple-50/30 rounded-2xl border border-purple-100/50">
                                        <AIPromptSettingsSection />
                                    </div>
                                </div>

                                <div className="h-px bg-gray-100"></div>

                                {/* DeepSeek Configuration */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 px-1">
                                        <div className="w-1.5 h-4 bg-indigo-600 rounded-full"></div>
                                        <h3 className="font-bold text-gray-900">DeepSeek 配置</h3>
                                    </div>
                                    <DeepSeekSettingsSection isActive={activeProvider === 'deepseek'} />
                                </div>

                                <div className="h-px bg-gray-100"></div>

                                {/* Ollama Configuration */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 px-1">
                                        <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
                                        <h3 className="font-bold text-gray-900">Ollama 配置</h3>
                                    </div>
                                    <OllamaSettingsSection isActive={activeProvider === 'ollama'} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Network Settings Section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all">
                        <button
                            onClick={() => toggleSection('network')}
                            className="w-full px-5 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${expandedSections.network ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'}`}>
                                    <Globe size={24} />
                                </div>
                                <div className="text-left">
                                    <span className="font-bold text-gray-900 text-base">网络与代理设置</span>
                                    <p className="text-sm text-gray-500 mt-0.5">配置网络连接与 API 代理</p>
                                </div>
                            </div>
                            <div className={`p-2 rounded-full transition-colors ${expandedSections.network ? 'bg-gray-100 text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                {expandedSections.network ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                        </button>

                        {expandedSections.network && (
                            <div className="px-6 pb-8 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 mt-4 space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-blue-900 mb-2">HTTP / HTTPS 代理地址</label>
                                        <input
                                            type="text"
                                            value={proxy}
                                            onChange={(e) => setProxy(e.target.value)}
                                            placeholder="例如: http://127.0.0.1:7890"
                                            className="w-full p-3 bg-white border border-blue-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSaveProxy}
                                        disabled={isSavingProxy}
                                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl font-medium transition-all shadow-sm"
                                    >
                                        {isSavingProxy ? '正在应用...' : '保存并应用代理'}
                                    </button>
                                    <div className="flex items-start gap-2 text-xs text-blue-600/70">
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
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center justify-center text-center space-y-3">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <p className="text-gray-500 font-medium">更多设置项即将推出</p>
                            <p className="text-xs text-gray-400 mt-1">我们将为您提供更丰富的个性化选项</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
