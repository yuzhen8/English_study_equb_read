import React, { useState, useEffect } from 'react';
import { translationService } from '../../services/TranslationService';
import { OllamaTranslationProvider } from '../../services/OllamaTranslationProvider';
// No custom UI components, using standard HTML elements

// Define the shape of the settings we care about
interface OllamaConfig {
    ollamaUrl: string;
    ollamaModel: string;
    ollamaPrompt: string;
    ollamaEnabled: boolean;
    ollamaContextEnabled: boolean;
    ollamaThinkEnabled: boolean;
}

const defaultConfig: OllamaConfig = {
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama2',
    ollamaEnabled: false,
    ollamaContextEnabled: true,
    ollamaThinkEnabled: false,
    ollamaPrompt: `You are a helpful English teacher.
Translate the following English text to Chinese.
Provide:
1. Translation
2. Detailed explanation of key words
3. Etymology if interesting
\nText: {{text}}`
};

const OllamaSettings: React.FC = () => {
    const [config, setConfig] = useState<OllamaConfig>(defaultConfig);
    const [status, setStatus] = useState<string>('');

    // Load existing settings from electron store on mount
    useEffect(() => {
        // @ts-ignore – window.electronAPI is injected via preload
        window.electronAPI.getSettings().then((settings: any) => {
            if (settings?.ollamaUrl) {
                setConfig({
                    ollamaUrl: settings.ollamaUrl || defaultConfig.ollamaUrl,
                    ollamaModel: settings.ollamaModel || defaultConfig.ollamaModel,
                    ollamaPrompt: settings.ollamaPrompt || defaultConfig.ollamaPrompt,
                    ollamaEnabled: settings.ollamaEnabled ?? defaultConfig.ollamaEnabled,
                    ollamaContextEnabled: settings.ollamaContextEnabled ?? defaultConfig.ollamaContextEnabled,
                    ollamaThinkEnabled: settings.ollamaThinkEnabled ?? defaultConfig.ollamaThinkEnabled,
                });
            }
        }).catch(() => {
            // ignore errors, keep defaults
        });
    }, []);

    const handleChange = (field: keyof OllamaConfig) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setConfig({ ...config, [field]: e.target.value });
    };

    const handleSave = async () => {
        try {
            // 1. Save to Electron Store (Persistence)
            // @ts-ignore – electronAPI exposed in preload
            await window.electronAPI.saveSettings({
                ollamaUrl: config.ollamaUrl,
                ollamaModel: config.ollamaModel,
                ollamaPrompt: config.ollamaPrompt,
                ollamaEnabled: config.ollamaEnabled,
                ollamaContextEnabled: config.ollamaContextEnabled,
                ollamaThinkEnabled: config.ollamaThinkEnabled,
                // Automatically switch provider based on enable status
                translationProvider: config.ollamaEnabled ? 'ollama' : 'google'
            });

            // 2. Update Runtime Service (Immediate Effect)
            const ollamaProvider = translationService.getProvider('ollama');
            if (ollamaProvider instanceof OllamaTranslationProvider) {
                ollamaProvider.setBaseUrl(config.ollamaUrl);
                ollamaProvider.setModel(config.ollamaModel);
                ollamaProvider.setPromptTemplate(config.ollamaPrompt);
                ollamaProvider.setContextEnabled(config.ollamaContextEnabled);
                ollamaProvider.setThinkEnabled(config.ollamaThinkEnabled);
            }

            if (config.ollamaEnabled) {
                translationService.setActiveProvider('ollama');
            } else {
                // Fallback if disabled
                translationService.setActiveProvider('google');
            }

            setStatus('保存成功 - 设置已应用');
        } catch (err) {
            console.error(err);
            setStatus('保存失败');
        }
    };

    const testConnection = async () => {
        setStatus('正在测试...');
        try {
            const response = await fetch(`${config.ollamaUrl}/api/tags`);
            if (response.ok) {
                setStatus('Ollama 连接成功');
            } else {
                setStatus('Ollama 连接失败');
            }
        } catch (e) {
            setStatus('Ollama 连接异常');
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Ollama 设置</h2>
            <div className="space-y-4">
                <div>
                    <div className="flex items-center mb-4">
                        <input
                            id="ollamaEnabled"
                            type="checkbox"
                            checked={config.ollamaEnabled}
                            onChange={(e) => setConfig({ ...config, ollamaEnabled: e.target.checked })}
                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label className="ml-2 block text-sm font-medium text-gray-900" htmlFor="ollamaEnabled">启用 Ollama 服务 (Enable Ollama)</label>
                    </div>

                    <label className="block text-sm font-medium mb-1" htmlFor="ollamaUrl">服务器地址 (URL)</label>
                    <input id="ollamaUrl" type="text" value={config.ollamaUrl} onChange={handleChange('ollamaUrl')} placeholder="http://localhost:11434" className="w-full p-2 border rounded" />
                </div>

                <div className="flex space-x-4">
                    <div className="flex items-center">
                        <input
                            id="ollamaContextEnabled"
                            type="checkbox"
                            checked={config.ollamaContextEnabled}
                            onChange={(e) => setConfig({ ...config, ollamaContextEnabled: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label className="ml-2 block text-sm text-gray-700" htmlFor="ollamaContextEnabled">启用上下文 (Enable Context)</label>
                    </div>
                    <div className="flex items-center">
                        <input
                            id="ollamaThinkEnabled"
                            type="checkbox"
                            checked={config.ollamaThinkEnabled}
                            onChange={(e) => setConfig({ ...config, ollamaThinkEnabled: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label className="ml-2 block text-sm text-gray-700" htmlFor="ollamaThinkEnabled">Think 模式 (Show Reasoning)</label>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="ollamaModel">模型 ID (Model)</label>
                    <input id="ollamaModel" type="text" value={config.ollamaModel} onChange={handleChange('ollamaModel')} placeholder="llama2" className="w-full p-2 border rounded" />
                    <p className="text-xs text-gray-500 mt-1">例如: llama2, mistral, qwen:7b</p>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="ollamaPrompt">自定义提示词 (Prompt Template)</label>
                    <textarea id="ollamaPrompt" rows={6} value={config.ollamaPrompt} onChange={handleChange('ollamaPrompt')} className="w-full p-2 border rounded font-mono text-sm"></textarea>
                    <p className="text-xs text-gray-500 mt-1">
                        <strong>说明：</strong> 使用 <code>{'{{text}}'}</code> 作为被翻译文本的占位符，<code>{'{{context}}'}</code> 作为上下文占位符。Ollama 将接收此上下文。
                    </p>
                </div>
                <div className="flex space-x-2 mt-4">
                    <button type="button" onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded">保存设置</button>
                    <button type="button" onClick={testConnection} className="px-4 py-2 bg-gray-600 text-white rounded">测试连接</button>
                </div>
                {status && <p className="mt-2 text-sm text-gray-600">{status}</p>}
            </div>
        </div>
    );
};

export default OllamaSettings;
