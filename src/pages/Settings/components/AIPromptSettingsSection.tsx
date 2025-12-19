import React, { useState, useEffect } from 'react';
import { Plus, Save, Trash2, Info, ChevronDown } from 'lucide-react';
import { translationService } from '../../../services/TranslationService';
import { OllamaTranslationProvider } from '../../../services/OllamaTranslationProvider';
import { DeepSeekTranslationProvider } from '../../../services/DeepSeekTranslationProvider';

interface PromptTemplate {
    id: string;
    name: string;
    content: string;
}

/*
const defaultTemplates: PromptTemplate[] = [
    {
        id: 'standard-analysis',
        name: '标准语法分析 (中文)',
        content: `Analyze the following English sentence and provide the analysis in CHINESE (中文):
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
    },
    {
        id: 'minimalist',
        name: '极简翻译',
        content: `Translate the following English text to natural Chinese:
{
  "translation": "中文翻译",
  "grammarAnalysis": "暂无详情"
}
Text: {{text}}`
    }
];
*/

const AIPromptSettingsSection: React.FC = () => {
    const [templates, setTemplates] = useState<PromptTemplate[]>([]);
    const [activeId, setActiveId] = useState<string>('');
    const [editingContent, setEditingContent] = useState<string>('');
    const [status, setStatus] = useState<string>('');
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');

    useEffect(() => {
        // @ts-ignore
        window.electronAPI.getSettings().then((settings: any) => {
            if (settings) {
                const savedTemplates = settings.promptTemplates || [];
                const savedActiveId = settings.activePromptId || (savedTemplates.length > 0 ? savedTemplates[0].id : '');

                setTemplates(savedTemplates);
                setActiveId(savedActiveId);

                const current = savedTemplates.find((t: any) => t.id === savedActiveId) || savedTemplates[0];
                if (current) setEditingContent(current.content);
            }
        });
    }, []);

    const handleSelectTemplate = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setActiveId(id);
        const template = templates.find(t => t.id === id);
        if (template) {
            setEditingContent(template.content);
        }
    };

    const handleSave = async () => {
        const updatedTemplates = templates.map(t =>
            t.id === activeId ? { ...t, content: editingContent } : t
        );
        setTemplates(updatedTemplates);

        try {
            // @ts-ignore
            await window.electronAPI.saveSettings({
                promptTemplates: updatedTemplates,
                activePromptId: activeId,
                activePromptContent: editingContent
            });

            // Update providers
            const ollama = translationService.getProvider('ollama');
            if (ollama instanceof OllamaTranslationProvider) {
                ollama.setPromptTemplate(editingContent);
            }
            const deepseek = translationService.getProvider('deepseek');
            if (deepseek instanceof DeepSeekTranslationProvider) {
                deepseek.setPromptTemplate(editingContent);
            }

            setStatus('模板已保存');
            setTimeout(() => setStatus(''), 3000);
        } catch (err) {
            setStatus('保存失败');
        }
    };

    const handleConfirmNew = async () => {
        if (!newName.trim()) return;

        const newTemplate: PromptTemplate = {
            id: `template-${Date.now()}`,
            name: newName.trim(),
            content: editingContent // Inherit from current or be empty? Current is better for "Duplicate" feel
        };

        const updated = [...templates, newTemplate];
        setTemplates(updated);
        setActiveId(newTemplate.id);
        setIsCreating(false);
        setNewName('');

        try {
            // @ts-ignore
            await window.electronAPI.saveSettings({
                promptTemplates: updated,
                activePromptId: newTemplate.id,
                activePromptContent: editingContent
            });
            setStatus('新模板已创建并保存');
            setTimeout(() => setStatus(''), 3000);
        } catch (err) {
            setStatus('保存失败');
        }
    };

    const handleDelete = async () => {
        if (templates.length <= 1) {
            alert('至少需要保留一个模板');
            return;
        }
        if (!confirm('确定要删除当前模板吗？')) return;

        const updated = templates.filter(t => t.id !== activeId);
        setTemplates(updated);
        const next = updated[0];
        setActiveId(next.id);
        setEditingContent(next.content);

        // Immediately persist delete
        // @ts-ignore
        await window.electronAPI.saveSettings({
            promptTemplates: updated,
            activePromptId: next.id,
            activePromptContent: next.content
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Info size={14} className="text-indigo-400" />
                        解析提示词模板
                    </label>
                    <div className="flex items-center gap-2">
                        {!isCreating ? (
                            <button
                                onClick={() => setIsCreating(true)}
                                className="p-1.5 text-indigo-300 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                            >
                                <Plus size={14} /> 新建
                            </button>
                        ) : (
                            <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2">
                                <input
                                    autoFocus
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="输入名称..."
                                    className="px-2 py-1 bg-white/5 border border-white/20 rounded text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500 placeholder-white/20"
                                    onKeyDown={(e) => e.key === 'Enter' && handleConfirmNew()}
                                />
                                <button onClick={handleConfirmNew} className="text-xs text-indigo-300 font-bold px-1 underline hover:text-indigo-200">确定</button>
                                <button onClick={() => setIsCreating(false)} className="text-xs text-white/40 px-1 hover:text-white/60">取消</button>
                            </div>
                        )}
                        <button
                            onClick={handleDelete}
                            className="p-1.5 text-red-400 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                        >
                            <Trash2 size={14} /> 删除
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <select
                        value={activeId}
                        onChange={handleSelectTemplate}
                        className="w-full p-2.5 bg-black/20 border border-white/10 rounded-xl text-sm font-medium text-white focus:ring-2 focus:ring-indigo-500/50 outline-none appearance-none cursor-pointer pr-10 shadow-inner hover:bg-black/30 transition-colors"
                    >
                        {templates.map(t => (
                            <option key={t.id} value={t.id} className="bg-slate-800 text-white">{t.name}</option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                        <ChevronDown size={14} />
                    </div>
                </div>

                <div className="relative group">
                    <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        rows={6}
                        className="w-full p-3 bg-black/20 border border-white/10 rounded-xl text-[11px] font-mono text-white/90 focus:ring-2 focus:ring-indigo-500/50 focus:bg-black/30 outline-none transition-all resize-none leading-relaxed placeholder-white/20"
                        placeholder="请输入自定义解析提示词..."
                    />
                    <div className="absolute bottom-2 right-2 text-[10px] text-white/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        使用 {'{{text}}'} 作为占位符
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    className="w-full py-2.5 bg-indigo-500/80 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 border border-indigo-400/20"
                >
                    <Save size={16} /> 保存当前模板
                </button>

                {status && (
                    <p className="text-center text-xs text-indigo-600 font-medium animate-pulse">{status}</p>
                )}
            </div>
        </div>
    );
};

export default AIPromptSettingsSection;
