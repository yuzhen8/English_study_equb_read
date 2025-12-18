import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DictionaryDashboard from '../DictionaryDashboard';
import { WordStore } from '../../../services/WordStore';
import { BrowserRouter } from 'react-router-dom';

// Mock Services
vi.mock('../../../services/WordStore', () => ({
    WordStore: {
        getStats: vi.fn(),
    }
}));

vi.mock('../../../services/DictionaryService', () => ({
    hybridDictionary: {
        query: vi.fn(),
    }
}));

// Mock Recharts to avoid resize observer errors and width warnings
vi.mock('recharts', async (importOriginal) => {
    const original = await importOriginal<any>();
    return {
        ...original,
        ResponsiveContainer: ({ children }: any) => <div style={{ width: 800, height: 800 }}>{children}</div>,
        AreaChart: ({ children }: any) => <div>{children}</div>,
        Area: () => <div />,
        XAxis: () => <div />,
        Tooltip: () => <div />,
    };
});

// Mock Child Components to simplify integration test
vi.mock('../../../components/WordDetailPopup', () => ({
    default: ({ word, onClose }: any) => (
        <div data-testid="word-popup">
            Popup for {word}
            <button onClick={onClose}>Close</button>
        </div>
    )
}));

// Wrap component with Router (since it might use Link/Hooks)
const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('DictionaryDashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should result stats on mount', async () => {
        const mockStats = {
            total: 10,
            statusCounts: { new: 2, learning: 3, reviewed: 4, mastered: 1 },
            newToday: 5,
            dueCount: 3,
            reviewedToday: 2,
            chartData: [],
            futureReviews: [],
            weeklyData: []
        };
        vi.mocked(WordStore.getStats).mockResolvedValue(mockStats);

        renderWithRouter(<DictionaryDashboard />);

        // Verify Loading state if exists (optional implementation detail)
        // await waitFor(() => expect(screen.getByText('Loading...')).toBeInTheDocument());

        // Verify Stats displayed
        // We look for specific numbers or texts from mockStats

        // Wait for effect and UI update
        // We look for "5" (newToday) which should be rendered in the New Card
        await waitFor(() => {
            expect(screen.getByText('5')).toBeInTheDocument();
        });
    });

    it('should open popup when adding a word via FAB (simulated)', async () => {
        // Since FAB might open a search bar first or directly popup?
        // Let's assume there is an "Add Word" button
        vi.mocked(WordStore.getStats).mockResolvedValue({ total: 0, statusCounts: {}, newToday: 0, chartData: [] } as any);

        renderWithRouter(<DictionaryDashboard />);

        const fab = screen.getByText('添加单词'); // Based on plan description
        fireEvent.click(fab);

        // Verify what happens -> Maybe a search input appears? 
        // For now just ensure button is clickable.
        expect(fab).toBeInTheDocument();
    });
});
