/**
 * Tests for Gemini Client Factory
 */

// Mock the settings module
jest.mock('../../settings', () => ({
    getGeminiApiKey: jest.fn(),
}));

// Mock GoogleGenAI constructor
jest.mock('@google/genai', () => ({
    GoogleGenAI: jest.fn().mockImplementation((config) => ({
        apiKey: config.apiKey,
        models: {
            generateContent: jest.fn(),
        },
    })),
}));

import {createGeminiClient} from '../client';
import {getGeminiApiKey} from '../../settings';
import {GoogleGenAI} from '@google/genai';

const mockGetGeminiApiKey = getGeminiApiKey as jest.MockedFunction<typeof getGeminiApiKey>;
const MockGoogleGenAI = GoogleGenAI as jest.MockedClass<typeof GoogleGenAI>;

describe('Gemini Client', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createGeminiClient', () => {
        it('should create client when API key is provided', async () => {
            mockGetGeminiApiKey.mockResolvedValue('test-api-key-123');

            const client = await createGeminiClient();

            expect(mockGetGeminiApiKey).toHaveBeenCalled();
            expect(MockGoogleGenAI).toHaveBeenCalledWith({apiKey: 'test-api-key-123'});
            expect(client).toBeDefined();
        });

        it('should throw error when API key is missing', async () => {
            mockGetGeminiApiKey.mockResolvedValue(null);

            await expect(createGeminiClient()).rejects.toThrow(
                'API Key is missing. Please configure your GEMINI_API_KEY in settings.',
            );
        });

        it('should throw error when API key is empty string', async () => {
            mockGetGeminiApiKey.mockResolvedValue('');

            await expect(createGeminiClient()).rejects.toThrow(
                'API Key is missing. Please configure your GEMINI_API_KEY in settings.',
            );
        });

        it('should throw error when API key is undefined', async () => {
            mockGetGeminiApiKey.mockResolvedValue(undefined as any);

            await expect(createGeminiClient()).rejects.toThrow(
                'API Key is missing. Please configure your GEMINI_API_KEY in settings.',
            );
        });

        it('should pass API key correctly to GoogleGenAI constructor', async () => {
            const apiKey = 'my-secret-api-key';
            mockGetGeminiApiKey.mockResolvedValue(apiKey);

            await createGeminiClient();

            expect(MockGoogleGenAI).toHaveBeenCalledTimes(1);
            expect(MockGoogleGenAI).toHaveBeenCalledWith({apiKey});
        });
    });
});

