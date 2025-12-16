import { dbOperations, STORE_GROUPS } from './db';

export interface WordGroup {
    id: string;
    name: string;
    description?: string;
    wordIds: string[];
    createdAt: number;
    updatedAt: number;
}

export const GroupStore = {
    /**
     * 获取所有群组
     */
    getGroups: async (): Promise<WordGroup[]> => {
        try {
            return await dbOperations.getAll<WordGroup>(STORE_GROUPS);
        } catch (e) {
            console.error('Failed to load groups', e);
            return [];
        }
    },

    /**
     * 获取单个群组
     */
    getGroup: async (id: string): Promise<WordGroup | undefined> => {
        try {
            const groups = await GroupStore.getGroups();
            return groups.find(g => g.id === id);
        } catch (e) {
            console.error('Failed to get group', e);
            return undefined;
        }
    },

    /**
     * 创建新群组
     */
    createGroup: async (name: string, description?: string, wordIds: string[] = []): Promise<WordGroup> => {
        const newGroup: WordGroup = {
            id: crypto.randomUUID(),
            name,
            description,
            wordIds: [...wordIds],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        await dbOperations.add(STORE_GROUPS, newGroup);
        return newGroup;
    },

    /**
     * 更新群组信息（名称、描述）
     */
    updateGroup: async (id: string, updates: Partial<Pick<WordGroup, 'name' | 'description'>>) => {
        const group = await GroupStore.getGroup(id);
        if (!group) return;

        Object.assign(group, updates, { updatedAt: Date.now() });
        await dbOperations.put(STORE_GROUPS, group);
    },

    /**
     * 添加单词到群组
     */
    addWordsToGroup: async (groupId: string, wordIds: string[]): Promise<void> => {
        const group = await GroupStore.getGroup(groupId);
        if (!group) return;

        // 去重添加
        const uniqueWordIds = new Set([...group.wordIds, ...wordIds]);
        group.wordIds = Array.from(uniqueWordIds);
        group.updatedAt = Date.now();

        await dbOperations.put(STORE_GROUPS, group);
    },

    /**
     * 从群组中移除单词
     */
    removeWordsFromGroup: async (groupId: string, wordIds: string[]): Promise<void> => {
        const group = await GroupStore.getGroup(groupId);
        if (!group) return;

        const wordIdsSet = new Set(wordIds);
        group.wordIds = group.wordIds.filter(id => !wordIdsSet.has(id));
        group.updatedAt = Date.now();

        await dbOperations.put(STORE_GROUPS, group);
    },

    /**
     * 删除群组
     */
    deleteGroup: async (id: string): Promise<void> => {
        await dbOperations.delete(STORE_GROUPS, id);
    },

    /**
     * 获取群组统计信息
     */
    getGroupStats: async (groupId: string) => {
        const group = await GroupStore.getGroup(groupId);
        if (!group) return null;

        return {
            totalWords: group.wordIds.length,
            createdAt: group.createdAt,
            updatedAt: group.updatedAt
        };
    }
};
