import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.electronAPI
window.electronAPI = {
    // Config
    getConfig: vi.fn(),
    setConfig: vi.fn(),

    // Dictionary / Init
    loadDictionary: vi.fn(),
    searchLocal: vi.fn(),

    // Audio
    getAudio: vi.fn(),

    // Library / DB (If exposed via IPC, though mostly services use DB directly in main, 
    // but if services are used in Renderer they might need mocks if they rely on IPC)
    // For now, based on exposed interfaces in preload.ts:

    // Add other methods as they appear in preload.ts
    minimizeWindow: vi.fn(),
    maximizeWindow: vi.fn(),
    closeWindow: vi.fn(),
} as any;

// Mock window.fs if used directly, or other globals
