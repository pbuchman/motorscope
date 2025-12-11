/**
 * Tests for Gemini Parse Service
 */

// Mock dependencies BEFORE imports
jest.mock('../client', () => ({
    createGeminiClient: jest.fn(),
}));

jest.mock('../prompts', () => ({
    buildParsePrompt: jest.fn().mockReturnValue('mock prompt'),
}));

jest.mock('../validation', () => ({
    validateParseResponse: jest.fn(),
}));

jest.mock('../mapper', () => ({
    mapToCarListing: jest.fn().mockReturnValue({
        id: 'test-id',
        url: 'https://example.com',
        title: 'Test Car',
    }),
}));

jest.mock('../history', () => ({
    recordSuccess: jest.fn().mockResolvedValue(undefined),
    recordError: jest.fn().mockResolvedValue(undefined),
}));

// Mock schemas module to avoid @google/genai import
jest.mock('../schemas', () => ({
    carListingSchema: {
        type: 'object',
        properties: {
            title: {type: 'string'},
            price: {type: 'number'},
        },
    },
    refreshSchema: {},
    fullCarListingSchema: {},
}));

import {parseCarDataWithGemini} from '../parse';
import {createGeminiClient} from '../client';
import {buildParsePrompt} from '../prompts';
import {validateParseResponse} from '../validation';
import {mapToCarListing} from '../mapper';
import {recordError, recordSuccess} from '../history';

const mockCreateGeminiClient = createGeminiClient as jest.MockedFunction<typeof createGeminiClient>;
const mockBuildParsePrompt = buildParsePrompt as jest.MockedFunction<typeof buildParsePrompt>;
const mockValidateParseResponse = validateParseResponse as jest.MockedFunction<typeof validateParseResponse>;
const mockMapToCarListing = mapToCarListing as jest.MockedFunction<typeof mapToCarListing>;
const mockRecordSuccess = recordSuccess as jest.MockedFunction<typeof recordSuccess>;
const mockRecordError = recordError as jest.MockedFunction<typeof recordError>;

describe('Gemini Parse Service', () => {
    const mockGenerateContent = jest.fn();
    const mockAiClient = {
        models: {
            generateContent: mockGenerateContent,
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateGeminiClient.mockResolvedValue(mockAiClient as any);
        mockGenerateContent.mockResolvedValue({
            text: '{"price": 100000, "currency": "PLN"}',
        });
    });

    describe('parseCarDataWithGemini', () => {
        describe('input validation', () => {
            it('should throw error for invalid URL', async () => {
                await expect(
                    parseCarDataWithGemini('', 'page content', 'Page Title'),
                ).rejects.toThrow('Invalid URL provided');

                await expect(
                    parseCarDataWithGemini(null as any, 'page content', 'Page Title'),
                ).rejects.toThrow('Invalid URL provided');
            });

            it('should throw error for empty page content', async () => {
                await expect(
                    parseCarDataWithGemini('https://example.com', '', 'Page Title'),
                ).rejects.toThrow('Page content is empty or invalid');

                await expect(
                    parseCarDataWithGemini('https://example.com', '   ', 'Page Title'),
                ).rejects.toThrow('Page content is empty or invalid');
            });

            it('should throw error for invalid page content type', async () => {
                await expect(
                    parseCarDataWithGemini('https://example.com', null as any, 'Page Title'),
                ).rejects.toThrow('Page content is empty or invalid');
            });

            it('should throw error for missing page title', async () => {
                await expect(
                    parseCarDataWithGemini('https://example.com', 'content', ''),
                ).rejects.toThrow('Page title is missing or invalid');

                await expect(
                    parseCarDataWithGemini('https://example.com', 'content', null as any),
                ).rejects.toThrow('Page title is missing or invalid');
            });
        });

        describe('successful parsing', () => {
            it('should call Gemini API with correct parameters', async () => {
                await parseCarDataWithGemini(
                    'https://otomoto.pl/listing/123',
                    'BMW M3 2020 100000km',
                    'BMW M3 - Otomoto',
                );

                expect(mockCreateGeminiClient).toHaveBeenCalled();
                expect(mockBuildParsePrompt).toHaveBeenCalledWith(
                    'BMW M3 - Otomoto',
                    'https://otomoto.pl/listing/123',
                    'BMW M3 2020 100000km',
                );
                expect(mockGenerateContent).toHaveBeenCalledWith(
                    expect.objectContaining({
                        model: 'gemini-2.5-flash',
                        contents: 'mock prompt',
                    }),
                );
            });

            it('should validate and map response', async () => {
                const result = await parseCarDataWithGemini(
                    'https://example.com',
                    'Test content',
                    'Test Title',
                );

                expect(mockValidateParseResponse).toHaveBeenCalled();
                expect(mockMapToCarListing).toHaveBeenCalled();
                expect(result).toEqual({
                    id: 'test-id',
                    url: 'https://example.com',
                    title: 'Test Car',
                });
            });

            it('should record success after successful parse', async () => {
                await parseCarDataWithGemini(
                    'https://example.com',
                    'Test content',
                    'Test Title',
                );

                expect(mockRecordSuccess).toHaveBeenCalledWith(
                    'https://example.com',
                    'mock prompt',
                    expect.objectContaining({
                        text: expect.any(String),
                    }),
                );
            });

            it('should pass scraped image URL to mapper', async () => {
                await parseCarDataWithGemini(
                    'https://example.com',
                    'Test content',
                    'Test Title',
                    'https://example.com/image.jpg',
                );

                expect(mockMapToCarListing).toHaveBeenCalledWith(
                    expect.anything(),
                    'https://example.com',
                    'Test Title',
                    'https://example.com/image.jpg',
                );
            });
        });

        describe('error handling', () => {
            it('should record error and rethrow when API call fails', async () => {
                const apiError = new Error('API Error');
                mockGenerateContent.mockRejectedValue(apiError);

                await expect(
                    parseCarDataWithGemini('https://example.com', 'content', 'Title'),
                ).rejects.toThrow('API Error');

                expect(mockRecordError).toHaveBeenCalledWith(
                    'https://example.com',
                    'mock prompt',
                    'API Error',
                );
            });

            it('should throw error when response has no text', async () => {
                mockGenerateContent.mockResolvedValue({text: null});

                await expect(
                    parseCarDataWithGemini('https://example.com', 'content', 'Title'),
                ).rejects.toThrow('No response from AI');

                expect(mockRecordError).toHaveBeenCalledWith(
                    'https://example.com',
                    'mock prompt',
                    'No response from AI',
                );
            });

            it('should throw error when response text is empty', async () => {
                mockGenerateContent.mockResolvedValue({text: ''});

                await expect(
                    parseCarDataWithGemini('https://example.com', 'content', 'Title'),
                ).rejects.toThrow('No response from AI');
            });
        });
    });
});

