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
                <label className="block text-sm font-medium mb-1 text-gray-700" htmlFor="deepseekApiKey">API Key</label>
                <input
                    id="deepseekApiKey"
                    type="password"
                    value={config.deepseekApiKey}
                    onChange={handleChange('deepseekApiKey')}
                    placeholder="sk-..."
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
            </div>

            <div className={isActive ? 'opacity-100' : 'opacity-50 pointer-events-none'}>
                <label className="block text-sm font-medium mb-1 text-gray-700" htmlFor="deepseekModel">模型选择</label>
                <select
                    id="deepseekModel"
                    value={config.deepseekModel}
                    onChange={(e) => setConfig({ ...config, deepseekModel: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all appearance-none"
                >
                    <option value="deepseek-chat">deepseek-chat (V3)</option>
                    <option value="deepseek-reasoner">deepseek-reasoner (R1)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1.5">R1 模型提供更强的推理与语法分析能力</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
                <button
                    type="button"
                    onClick={() => handleSave()}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm"
                >
                    保存 API 设置
                </button>
                <button
                    type="button"
                    onClick={testConnection}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-medium transition-colors"
                >
                    测试连接
                </button>
            </div>

            {status && (
                <div className={`text-sm text-center p-2 rounded-lg ${status.includes('成功') ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                    {status}
                </div>
            )}
        </div>
    );
};

export default DeepSeekSettingsSection;
