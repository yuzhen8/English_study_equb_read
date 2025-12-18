import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ExerciseSettingsProps {
    onClose: () => void;
}

// 设置项类型
export interface SettingsState {
    // 通用设置
    showSettingsOnStart: boolean;   // 每次训练前显示训练设置
    wordCount: number;              // 选择训练的单词数量
    useKeyboardSpelling: boolean;   // 复杂"拼写单词"训练（使用键盘）

    // 发音设置
    autoPlayAudio: boolean;         // 自动播放发音
    playbackSpeed: number;          // 播放速度 0.5-1.5

    // 混合训练组成
    includeFlashcard: boolean;      // 包含闪卡
    includeChoice: boolean;         // 包含多项选择
    includeSpelling: boolean;       // 包含拼写
    includeListeningChoice: boolean;   // 包含听力选择
    includeListeningSpelling: boolean; // 包含听力拼写
    includeFillBlank: boolean;      // 包含选词填空

    // 开发者设置
    enableSRSDebugLog: boolean;     // 启用 SRS 调试日志
}

const defaultSettings: SettingsState = {
    showSettingsOnStart: false,
    wordCount: 6,
    useKeyboardSpelling: false,
    autoPlayAudio: true,
    playbackSpeed: 1.0,
    includeFlashcard: true,
    includeChoice: true,
    includeSpelling: true,
    includeListeningChoice: true,
    includeListeningSpelling: true,
    includeFillBlank: true,
    enableSRSDebugLog: false,
};

// 从localStorage加载设置
export const loadSettings = (): SettingsState => {
    try {
        const saved = localStorage.getItem('exerciseSettings');
        if (saved) {
            return { ...defaultSettings, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.error('Failed to load settings', e);
    }
    return defaultSettings;
};

// 保存设置到localStorage
export const saveSettings = (settings: SettingsState) => {
    try {
        localStorage.setItem('exerciseSettings', JSON.stringify(settings));
    } catch (e) {
        console.error('Failed to save settings', e);
    }
};

// 可折叠的设置分组
interface SettingsSectionProps {
    title: string;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, expanded, onToggle, children }) => {
    return (
        <div className="border-b border-gray-100">
            <button
                onClick={onToggle}
                className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
                <span className="font-medium text-gray-900">{title}</span>
                {expanded ? (
                    <ChevronUp size={20} className="text-gray-400" />
                ) : (
                    <ChevronDown size={20} className="text-gray-400" />
                )}
            </button>
            {expanded && (
                <div className="px-4 pb-4 space-y-4 animate-fade-in">
                    {children}
                </div>
            )}
        </div>
    );
};

// 开关设置项
interface ToggleSettingProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    description?: string;
}

const ToggleSetting: React.FC<ToggleSettingProps> = ({ label, checked, onChange, description }) => {
    return (
        <div className="flex items-center justify-between py-1">
            <div className="flex-1 pr-4">
                <span className="text-gray-800">{label}</span>
                {description && (
                    <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                )}
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={cn(
                    "w-12 h-7 rounded-full transition-colors relative flex-shrink-0",
                    checked ? "bg-emerald-500" : "bg-gray-300"
                )}
            >
                <div
                    className={cn(
                        "absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow-sm",
                        checked ? "translate-x-6" : "translate-x-1"
                    )}
                />
            </button>
        </div>
    );
};

// 滑块设置项
interface SliderSettingProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
    formatValue?: (value: number) => string;
    description?: string;
}

const SliderSetting: React.FC<SliderSettingProps> = ({
    label, value, min, max, step, onChange, formatValue, description
}) => {
    return (
        <div className="py-1">
            <div className="flex items-center justify-between mb-1">
                <div>
                    <span className="text-gray-800">{label}</span>
                    {description && (
                        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                    )}
                </div>
                <span className="text-sm text-gray-600 font-medium bg-gray-100 px-2 py-0.5 rounded">
                    {formatValue ? formatValue(value) : value}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
        </div>
    );
};

const ExerciseSettings: React.FC<ExerciseSettingsProps> = ({ onClose }) => {
    const [settings, setSettings] = useState<SettingsState>(loadSettings);
    const [expandedSections, setExpandedSections] = useState({
        general: true,
        audio: false,
        mixed: false,
        developer: false,
    });

    const toggleSection = (section: 'general' | 'audio' | 'mixed' | 'developer') => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        saveSettings(settings);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
                <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                    取消
                </button>
                <h1 className="text-lg font-bold text-gray-900">训练设置</h1>
                <button
                    onClick={handleSave}
                    className="text-blue-600 font-medium hover:text-blue-700 transition-colors"
                >
                    保存
                </button>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* 通用设置 */}
                <SettingsSection
                    title="通用设置"
                    expanded={expandedSections.general}
                    onToggle={() => toggleSection('general')}
                >
                    <ToggleSetting
                        label="显示训练设置"
                        checked={settings.showSettingsOnStart}
                        onChange={(v) => updateSetting('showSettingsOnStart', v)}
                        description="每次训练前显示训练设置"
                    />
                    <SliderSetting
                        label="选择训练的单词数量"
                        value={settings.wordCount}
                        min={1}
                        max={50}
                        step={1}
                        onChange={(v) => updateSetting('wordCount', v)}
                        formatValue={(v) => String(v)}
                    />
                    <ToggleSetting
                        label="复杂「拼写单词」训练"
                        checked={settings.useKeyboardSpelling}
                        onChange={(v) => updateSetting('useKeyboardSpelling', v)}
                        description="你需要用系统键盘拼写单词，而不是选择字母"
                    />
                </SettingsSection>

                {/* 发音设置 */}
                <SettingsSection
                    title="发音设置"
                    expanded={expandedSections.audio}
                    onToggle={() => toggleSection('audio')}
                >
                    <ToggleSetting
                        label="自动播放发音"
                        checked={settings.autoPlayAudio}
                        onChange={(v) => updateSetting('autoPlayAudio', v)}
                        description="进入新单词时自动播放发音"
                    />
                    <SliderSetting
                        label="播放速度"
                        value={settings.playbackSpeed}
                        min={0.5}
                        max={1.5}
                        step={0.1}
                        onChange={(v) => updateSetting('playbackSpeed', v)}
                        formatValue={(v) => `${v.toFixed(1)}x`}
                    />
                </SettingsSection>

                {/* 混合训练组成 */}
                <SettingsSection
                    title="混合训练的组成"
                    expanded={expandedSections.mixed}
                    onToggle={() => toggleSection('mixed')}
                >
                    <ToggleSetting
                        label="单词闪卡"
                        checked={settings.includeFlashcard}
                        onChange={(v) => updateSetting('includeFlashcard', v)}
                    />
                    <ToggleSetting
                        label="多项选择"
                        checked={settings.includeChoice}
                        onChange={(v) => updateSetting('includeChoice', v)}
                    />
                    <ToggleSetting
                        label="拼写构建"
                        checked={settings.includeSpelling}
                        onChange={(v) => updateSetting('includeSpelling', v)}
                    />
                    <ToggleSetting
                        label="听力选择"
                        checked={settings.includeListeningChoice}
                        onChange={(v) => updateSetting('includeListeningChoice', v)}
                    />
                    <ToggleSetting
                        label="听力拼写"
                        checked={settings.includeListeningSpelling}
                        onChange={(v) => updateSetting('includeListeningSpelling', v)}
                    />
                    <ToggleSetting
                        label="选词填空"
                        checked={settings.includeFillBlank}
                        onChange={(v) => updateSetting('includeFillBlank', v)}
                    />
                </SettingsSection>

                {/* 开发者设置 */}
                <SettingsSection
                    title="开发者选项"
                    expanded={expandedSections.developer}
                    onToggle={() => toggleSection('developer')}
                >
                    <ToggleSetting
                        label="SRS 调试日志"
                        checked={settings.enableSRSDebugLog}
                        onChange={(v) => updateSetting('enableSRSDebugLog', v)}
                        description="完成练习后将 SRS 算法变更记录保存到桌面"
                    />
                </SettingsSection>
            </div>

            {/* Footer - Save Button */}
            <div className="p-4 border-t border-gray-100">
                <button
                    onClick={handleSave}
                    className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
                >
                    保存
                </button>
            </div>
        </div>
    );
};

export default ExerciseSettings;

// 导出获取设置的函数供其他组件使用
export const getExerciseSettings = (): SettingsState => loadSettings();
