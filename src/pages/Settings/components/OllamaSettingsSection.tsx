import React, { useState, useEffect } from 'react';
import { Bot, Link, ExternalLink } from 'lucide-react';
import { translationService } from '../../../services/TranslationService';
import { OllamaTranslationProvider } from '../../../services/OllamaTranslationProvider';

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
    ollamaModel: 'llama3',
    ollamaEnabled: false,
    ollamaContextEnabled: true,
    ollamaThinkEnabled: false,
    ollamaPrompt: `Analyze the following English sentence and provide the analysis in CHINESE (中文):
1. translation: 给出地道的中文翻译。
2. grammarAnalysis: 一个结构化的语法分析对象，包含：
   - sentenceType: 句法类型（如：简单句、并列句、复合句）
   - mainTense: 主要时态（如：一般过去时、现在进行时）
   - structure: 高层结构描述（如：主语 + 谓语 + 宾语）
   - components: 一个包含核心词汇/短语解析的数组，每个元素包含 segment (片段), role (语法角色), explanation (中文详细解释)。

请严格按照以下 JSON 格式返回结果（所有分析描述请使用中文）：
{
  "translation": "...",
  "grammarAnalysis": {
    "sentenceType": "...",
    "mainTense": "...",
    "structure": "...",
    "components": [
      {"segment": "...", "role": "...", "explanation": "..."}
    ]
  }
}

待分析文本: {{text}}`
};

interface OllamaSettingsSectionProps {
    isActive: boolean;
}

const OllamaSettingsSection: React.FC<OllamaSettingsSectionProps> = ({ isActive }) => {
    const [config, setConfig] = useState<OllamaConfig>(defaultConfig);
    const [status, setStatus] = useState<string>('');

    useEffect(() => {
        // @ts-ignore
        window.electronAPI.getSettings().then((settings: any) => {
            if (settings) {
                setConfig({
                    ollamaUrl: settings.ollamaUrl || defaultConfig.ollamaUrl,
                    ollamaModel: settings.ollamaModel || defaultConfig.ollamaModel,
                    ollamaPrompt: settings.ollamaPrompt || defaultConfig.ollamaPrompt,
                    ollamaEnabled: settings.ollamaEnabled ?? defaultConfig.ollamaEnabled,
                    ollamaContextEnabled: settings.ollamaContextEnabled ?? defaultConfig.ollamaContextEnabled,
                    ollamaThinkEnabled: settings.ollamaThinkEnabled ?? defaultConfig.ollamaThinkEnabled,
                });
            }
        }).catch(() => { });
    }, []);

    const handleChange = (field: keyof OllamaConfig) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setConfig({ ...config, [field]: e.target.value });
    };

    const handleSave = async () => {
        try {
            // @ts-ignore
            await window.electronAPI.saveSettings({
                ollamaUrl: config.ollamaUrl,
                ollamaModel: config.ollamaModel,
                ollamaPrompt: config.ollamaPrompt,
                ollamaContextEnabled: config.ollamaContextEnabled,
                ollamaThinkEnabled: config.ollamaThinkEnabled,
            });

            const ollamaProvider = translationService.getProvider('ollama');
            if (ollamaProvider instanceof OllamaTranslationProvider) {
                ollamaProvider.setBaseUrl(config.ollamaUrl);
                ollamaProvider.setModel(config.ollamaModel);
                ollamaProvider.setPromptTemplate(config.ollamaPrompt);
                ollamaProvider.setContextEnabled(config.ollamaContextEnabled);
                ollamaProvider.setThinkEnabled(config.ollamaThinkEnabled);
            }

            setStatus('保存成功');
            setTimeout(() => setStatus(''), 3000);
        } catch (err) {
            console.error(err);
            setStatus('保存失败');
        }
    };

    const testConnection = async () => {
        setStatus('正在尝试连接 Ollama...');
        try {
            // @ts-ignore
            const response = await window.electronAPI.aiFetch({
                url: `${config.ollamaUrl}/api/tags`
            });
            if (response.ok) {
                const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
                const models = data.models || [];
                if (models.length > 0) {
                    setStatus(`连接成功! 发现 ${models.length} 个模型`);
                } else {
                    setStatus('已连接，但未发现可用模型');
                }
            } else {
                setStatus('连接失败: Ollama 服务未响应');
            }
        } catch (e) {
            setStatus('连接失败: 请确保 Ollama 已启动并配置 OLLAMA_HOST=0.0.0.0');
        }
    };

    return (
        <div className="space-y-4">
            <div className={isActive ? 'opacity-100' : 'opacity-50 pointer-events-none'}>
                <label className="block text-sm font-medium mb-1 text-white/80" htmlFor="ollamaUrl">Ollama 服务地址</label>
                <div className="relative">
                    <input
                        id="ollamaUrl"
                        type="text"
                        value={config.ollamaUrl}
                        onChange={handleChange('ollamaUrl')}
                        placeholder="http://localhost:11434"
                        className="w-full p-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none transition-all pl-10 placeholder-white/20"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                        <Link size={16} />
                    </div>
                </div>
            </div>

            <div className={`flex space-x-6 ${isActive ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <div className="flex items-center">
                    <input
                        id="ollamaContextEnabled"
                        type="checkbox"
                        checked={config.ollamaContextEnabled}
                        onChange={(e) => setConfig({ ...config, ollamaContextEnabled: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-white/20 rounded focus:ring-blue-500 bg-white/5"
                    />
                    <label className="ml-2 block text-xs font-medium text-white/70 cursor-pointer" htmlFor="ollamaContextEnabled">
                        启用上下文语境
                    </label>
                </div>
                <div className="flex items-center">
                    <input
                        id="ollamaThinkEnabled"
                        type="checkbox"
                        checked={config.ollamaThinkEnabled}
                        onChange={(e) => setConfig({ ...config, ollamaThinkEnabled: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-white/20 rounded focus:ring-blue-500 bg-white/5"
                    />
                    <label className="ml-2 block text-xs font-medium text-white/70 cursor-pointer" htmlFor="ollamaThinkEnabled">
                        显示思考过程
                    </label>
                </div>
            </div>

            <div className={`grid grid-cols-2 gap-4 ${isActive ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <div>
                    <label className="block text-sm font-medium mb-1 text-white/80" htmlFor="ollamaModel">模型名称</label>
                    <div className="relative">
                        <input
                            id="ollamaModel"
                            type="text"
                            value={config.ollamaModel}
                            onChange={handleChange('ollamaModel')}
                            placeholder="llama3"
                            className="w-full p-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none transition-all pl-10 placeholder-white/20"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                            <Bot size={16} />
                        </div>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-white/80">外部访问</label>
                    <a
                        href="https://github.com/ollama/ollama/blob/main/docs/faq.md#how-can-i-allow-additional-origins"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/70 hover:bg-white/10 transition-colors group"
                    >
                        <span>配置指南</span>
                        <ExternalLink size={14} className="text-white/40 group-hover:text-white/70" />
                    </a>
                </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
                <button
                    type="button"
                    onClick={handleSave}
                    className="flex-1 py-2.5 bg-blue-600/80 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/20 border border-blue-400/20"
                >
                    保存配置
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

export default OllamaSettingsSection;
