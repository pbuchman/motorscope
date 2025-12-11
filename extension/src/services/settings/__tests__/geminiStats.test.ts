/**
 * Tests for Gemini Stats Service
 */

// Mock API client
jest.mock('../../../api/client', () => ({
  getRemoteSettings: jest.fn(),
  patchRemoteSettings: jest.fn(),
  getRemoteGeminiHistory: jest.fn(),
  addRemoteGeminiHistory: jest.fn(),
  clearRemoteGeminiHistory: jest.fn(),
}));

import {
  getGeminiStats,
  getGeminiHistory,
  recordGeminiCall,
  clearGeminiLogs,
} from '../geminiStats';

import {
  getRemoteSettings,
  patchRemoteSettings,
  getRemoteGeminiHistory,
  addRemoteGeminiHistory,
  clearRemoteGeminiHistory,
} from '@/api/client';

const mockGetRemoteSettings = getRemoteSettings as jest.MockedFunction<typeof getRemoteSettings>;
const mockPatchRemoteSettings = patchRemoteSettings as jest.MockedFunction<typeof patchRemoteSettings>;
const mockGetRemoteGeminiHistory = getRemoteGeminiHistory as jest.MockedFunction<typeof getRemoteGeminiHistory>;
const mockAddRemoteGeminiHistory = addRemoteGeminiHistory as jest.MockedFunction<typeof addRemoteGeminiHistory>;
const mockClearRemoteGeminiHistory = clearRemoteGeminiHistory as jest.MockedFunction<typeof clearRemoteGeminiHistory>;

describe('Gemini Stats Service', () => {
  const DEFAULT_STATS = {
    allTimeTotalCalls: 0,
    totalCalls: 0,
    successCount: 0,
    errorCount: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGeminiStats', () => {
    it('should return stats from remote settings', async () => {
      const mockStats = {
        allTimeTotalCalls: 100,
        totalCalls: 50,
        successCount: 45,
        errorCount: 5,
      };
      mockGetRemoteSettings.mockResolvedValue({ geminiStats: mockStats } as any);

      const result = await getGeminiStats();

      expect(mockGetRemoteSettings).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });

    it('should return default stats when remote returns null', async () => {
      mockGetRemoteSettings.mockResolvedValue({ geminiStats: null } as any);

      const result = await getGeminiStats();

      expect(result).toEqual(DEFAULT_STATS);
    });

    it('should return default stats on API error', async () => {
      mockGetRemoteSettings.mockRejectedValue(new Error('Network error'));

      const result = await getGeminiStats();

      expect(result).toEqual(DEFAULT_STATS);
    });
  });

  describe('getGeminiHistory', () => {
    it('should return history from API', async () => {
      const mockHistory = [
        { id: '1', url: 'https://example.com', status: 'success', timestamp: '2024-01-01' },
        { id: '2', url: 'https://example2.com', status: 'error', timestamp: '2024-01-02' },
      ];
      mockGetRemoteGeminiHistory.mockResolvedValue(mockHistory as any);

      const result = await getGeminiHistory();

      expect(mockGetRemoteGeminiHistory).toHaveBeenCalledWith(200);
      expect(result).toEqual(mockHistory);
    });

    it('should return empty array on API error', async () => {
      mockGetRemoteGeminiHistory.mockRejectedValue(new Error('Not authenticated'));

      const result = await getGeminiHistory();

      expect(result).toEqual([]);
    });
  });

  describe('recordGeminiCall', () => {
    const mockEntry = {
      id: 'test-id',
      url: 'https://otomoto.pl/listing/123',
      promptPreview: 'Test prompt...',
      status: 'success' as const,
      timestamp: '2024-01-01T12:00:00.000Z',
    };

    beforeEach(() => {
      mockGetRemoteSettings.mockResolvedValue({ geminiStats: DEFAULT_STATS } as any);
      mockPatchRemoteSettings.mockResolvedValue(undefined);
      mockAddRemoteGeminiHistory.mockResolvedValue(undefined);
    });

    it('should increment stats for successful call', async () => {
      await recordGeminiCall(mockEntry);

      expect(mockPatchRemoteSettings).toHaveBeenCalledWith({
        geminiStats: {
          allTimeTotalCalls: 1,
          totalCalls: 1,
          successCount: 1,
          errorCount: 0,
        },
      });
    });

    it('should increment error count for failed call', async () => {
      const errorEntry = { ...mockEntry, status: 'error' as const };

      await recordGeminiCall(errorEntry);

      expect(mockPatchRemoteSettings).toHaveBeenCalledWith({
        geminiStats: {
          allTimeTotalCalls: 1,
          totalCalls: 1,
          successCount: 0,
          errorCount: 1,
        },
      });
    });

    it('should add entry to history', async () => {
      await recordGeminiCall(mockEntry);

      expect(mockAddRemoteGeminiHistory).toHaveBeenCalledWith(mockEntry);
    });

    it('should preserve existing stats', async () => {
      mockGetRemoteSettings.mockResolvedValue({
        geminiStats: {
          allTimeTotalCalls: 10,
          totalCalls: 5,
          successCount: 4,
          errorCount: 1,
        },
      } as any);

      await recordGeminiCall(mockEntry);

      expect(mockPatchRemoteSettings).toHaveBeenCalledWith({
        geminiStats: {
          allTimeTotalCalls: 11,
          totalCalls: 6,
          successCount: 5,
          errorCount: 1,
        },
      });
    });

    it('should silently fail on API error', async () => {
      mockGetRemoteSettings.mockRejectedValue(new Error('API error'));

      // Should not throw
      await expect(recordGeminiCall(mockEntry)).resolves.not.toThrow();
    });
  });

  describe('clearGeminiLogs', () => {
    beforeEach(() => {
      mockGetRemoteSettings.mockResolvedValue({
        geminiStats: {
          allTimeTotalCalls: 100,
          totalCalls: 50,
          successCount: 45,
          errorCount: 5,
        },
      } as any);
      mockPatchRemoteSettings.mockResolvedValue(undefined);
      mockClearRemoteGeminiHistory.mockResolvedValue(undefined);
    });

    it('should reset session stats but preserve allTimeTotalCalls', async () => {
      await clearGeminiLogs();

      expect(mockPatchRemoteSettings).toHaveBeenCalledWith({
        geminiStats: {
          allTimeTotalCalls: 100,
          totalCalls: 0,
          successCount: 0,
          errorCount: 0,
        },
      });
    });

    it('should clear history', async () => {
      await clearGeminiLogs();

      expect(mockClearRemoteGeminiHistory).toHaveBeenCalled();
    });

    it('should throw error on API failure', async () => {
      mockPatchRemoteSettings.mockRejectedValue(new Error('Clear failed'));

      await expect(clearGeminiLogs()).rejects.toThrow('Clear failed');
    });
  });
});

