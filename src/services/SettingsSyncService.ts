import { supabase } from '../lib/supabase';

export interface RemoteReaderSettings {
    fontSize?: number;
    lineHeight?: number;
    theme?: string;
    highlightWords?: boolean;
    highlightColor?: string;
    highlightOpacity?: number;
    highlightUseGradient?: boolean;
    highlightHeight?: number;
    highlightRounding?: string;
    flow?: string;
    enableTapTurn?: boolean;
    pageTransition?: string;
    [key: string]: any;
}

export interface RemoteAppSettings {
    translationProvider?: string;
    fastTranslationProvider?: string;
    ollamaEnabled?: boolean;
    deepseekEnabled?: boolean;
    proxy?: string;
    apiKeys?: Record<string, string>;
    [key: string]: any;
}

export const SettingsSyncService = {
    isSyncing: false,
    /**
     * Fetch settings from Supabase
     */
    getSettings: async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('user_settings')
                .select('app_settings, reader_settings')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
                console.error('Failed to fetch settings:', error);
                return null;
            }

            return data;
        } catch (e) {
            console.error('Settings sync error:', e);
            return null;
        }
    },

    /**
     * Save/Update Reader Settings
     */
    saveReaderSettings: async (userId: string, settings: RemoteReaderSettings) => {
        try {
            const { data: current } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', userId)
                .single();

            const newRecord = {
                user_id: userId,
                app_settings: current?.app_settings || {},
                reader_settings: {
                    ...(current?.reader_settings || {}),
                    ...settings
                },
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('user_settings')
                .upsert(newRecord);

            if (error) console.error('Failed to save reader settings:', error);
        } catch (e) {
            console.error('Save reader settings error:', e);
        }
    },

    /**
     * Save/Update App Settings
     */
    saveAppSettings: async (userId: string, settings: RemoteAppSettings) => {
        try {
            const { data: current } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', userId)
                .single();

            const newRecord = {
                user_id: userId,
                app_settings: {
                    ...(current?.app_settings || {}),
                    ...settings
                },
                reader_settings: current?.reader_settings || {},
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('user_settings')
                .upsert(newRecord);

            if (error) console.error('Failed to save app settings:', error);
        } catch (e) {
            console.error('Save app settings error:', e);
        }
    },

    /**
     * Manual Sync (Bidirectional)
     * Pull Remote -> Merge with Local -> Update Local -> Push Merged to Remote
     */
    sync: async (userId: string) => {
        if (SettingsSyncService.isSyncing) return;
        SettingsSyncService.isSyncing = true;

        try {
            // 1. Fetch Remote
            const { data, error } = await supabase
                .from('user_settings')
                .select('app_settings, reader_settings')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            let mergedAppSettings = {};
            let mergedReaderSettings = {};

            // 2. App Settings
            // @ts-ignore
            if (window.electronAPI) {
                // @ts-ignore
                const localApp = await window.electronAPI.getSettings();
                const remoteApp = data?.app_settings || {};
                mergedAppSettings = { ...localApp, ...remoteApp };

                // Update Local
                // @ts-ignore
                await window.electronAPI.saveSettings(mergedAppSettings);
            }

            // 3. Reader Settings
            const localReaderJson = localStorage.getItem('readerSettings');
            const localReader = localReaderJson ? JSON.parse(localReaderJson) : {};
            const remoteReader = data?.reader_settings || {};

            mergedReaderSettings = { ...localReader, ...remoteReader };
            localStorage.setItem('readerSettings', JSON.stringify(mergedReaderSettings));

            // 4. Push Back Merged State
            const newRecord = {
                user_id: userId,
                app_settings: mergedAppSettings,
                reader_settings: mergedReaderSettings,
                updated_at: new Date().toISOString()
            };

            const { error: upsertError } = await supabase
                .from('user_settings')
                .upsert(newRecord);

            if (upsertError) console.error('Failed to push merged settings:', upsertError);

            console.log('Settings synced (Bidirectional): Remote -> Local -> Remote');
        } catch (e) {
            console.error('Settings sync error:', e);
        } finally {
            SettingsSyncService.isSyncing = false;
        }
    }
};
