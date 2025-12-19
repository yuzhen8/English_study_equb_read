import React, { useState, useEffect } from 'react';
import { translationService } from '../../../services/TranslationService';
import { DeepSeekTranslationProvider } from '../../../services/DeepSeekTranslationProvider';

interface DeepSeekConfig {
    deepseekApiKey: string;
    deepseekModel: string;
    deepseekEnabled: boolean;
}

const defaultConfig: DeepSeekConfig = {
    deepseekApiKey: '',
    deepseekModel: 'deepseek-chat',
    deepseekEnabled: false,
};

interface DeepSeekSettingsSectionProps {
    isActive: boolean;
}

const DeepSeekSettingsSection: React.FC<DeepSeekSettingsSectionProps> = ({ isActive }) => {
    const [config, setConfig] = useState<DeepSeekConfig>(defaultConfig);
    const [status, setStatus] = useState<string>('');

    useEffect(() => {
        // @ts-ignore
        window.electronAPI.getSettings().then((settings: any) => {
            if (settings) {
                const newConfig = {
                    deepseekApiKey: settings.apiKeys?.deepseek || '',
                    deepseekModel: settings.deepseekModel || 'deepseek-chat',
                    deepseekEnabled: settings.deepseekEnabled || false,
                };
                setConfig(newConfig);
            }
        }).catch(() => { });
    }, []);

    const handleChange = (field: keyof DeepSeekConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfig({ ...config, [field]: e.target.value });
    };

    const handleSave = async () => {
        try {
            // @ts-ignore
            await window.electronAPI.saveSettings({
                apiKeys: {
                    deepseek: config.deepseekApiKey
                },
                deepseekModel: config.deepseekModel,
            });

            const dsProvider = translationService.getProvider('deepseek');
            if (dsProvider instanceof DeepSeekTranslationProvider) {
                dsProvider.setApiKey(config.deepseekApiKey);
                dsProvider.setModel(config.deepseekModel);
            }

            setStatus('保存成功');
            setTimeout(() => setStatus(''), 3000);
        } catch (err) {
            console.error(err);
            setStatus('保存失败');
        }
    };

    const testConnection = async () => {
        if (!config.deepseekApiKey) {
            setStatus('请输入 API Key');
            return;
        }
        setStatus('正在尝试连接...');
        try {
            // @ts-ignore
            const response = await window.electronAPI.aiFetch({
                url: 'https://api.deepseek.com/v1/models',
                headers: {
                    'Authorization': `Bearer ${config.deepseekApiKey}`
                }
            });
            if (response.ok) {
                setStatus('连接成功');
            } else {
                const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
                setStatus(`连接失败: ${data.error?.message || response.statusText}`);
            }
        } catch (e) {
            setStatus('网络异常，请检查网络或代理设置');
        }
    };

    return (
        <div className="space-y-4">
            <div className={isActive ? 'opacity-100' : 'opacity-50 pointer-events-none'}>
                <label className="block text-sm font-medium mb-1 text-white/80" htmlFor="deepseekApiKey">API Key</label>
                <input
                    id="deepseekApiKey"
                    type="password"
                    value={config.deepseekApiKey}
                    onChange={handleChange('deepseekApiKey')}
                    placeholder="sk-..."
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none transition-all placeholder-white/20"
                />
            </div>

            <div className={isActive ? 'opacity-100' : 'opacity-50 pointer-events-none'}>
                <label className="block text-sm font-medium mb-1 text-white/80" htmlFor="deepseekModel">模型选择</label>
                <select
                    id="deepseekModel"
                    value={config.deepseekModel}
                    onChange={(e) => setConfig({ ...config, deepseekModel: e.target.value })}
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
                >
                    <option value="deepseek-chat" className="bg-slate-800">deepseek-chat (V3)</option>
                    <option value="deepseek-reasoner" className="bg-slate-800">deepseek-reasoner (R1)</option>
                </select>
                <p className="text-xs text-white/40 mt-1.5">R1 模型提供更强的推理与语法分析能力</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
                <button
                    type="button"
                    onClick={() => handleSave()}
                    className="flex-1 py-2.5 bg-blue-600/80 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/20 border border-blue-400/20"
                >
                    保存 API 设置
                </button>
                <button
                    type="button"
                    onClick={testConnection}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white rounded-xl font-medium transition-colors border border-white/10"
                >
                    测试连接
                </button>
            </div>

            {status && (
                <div className={`text-sm text-center p-2 rounded-lg backdrop-blur-sm border ${status.includes('成功') ? 'bg-green-500/10 text-green-300 border-green-500/20' : 'bg-blue-500/10 text-blue-300 border-blue-500/20'}`}>
                    {status}
                </div>
            )}
        </div>
    );
};

export default DeepSeekSettingsSection;
