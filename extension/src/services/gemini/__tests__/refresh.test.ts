/**
 * Tests for Gemini Refresh Service
 *
 * Tests the refresh logic that extracts price and status from listings.
 */

// Mock dependencies BEFORE imports
jest.mock('../client', () => ({
    createGeminiClient: jest.fn(),
}));

jest.mock('../history', () => ({
    recordSuccess: jest.fn().mockResolvedValue(undefined),
    recordError: jest.fn().mockResolvedValue(undefined),
}));

// Mock schemas module to avoid @google/genai import
jest.mock('../schemas', () => ({
    refreshSchema: {
        type: 'object',
        properties: {
            price: {type: 'number'},
            currency: {type: 'string'},
            status: {type: 'string'},
        },
    },
    fullCarListingSchema: {},
}));

import {refreshListingWithGemini} from '../refresh';
import {createGeminiClient} from '../client';
import {recordError, recordSuccess} from '../history';
import {RateLimitError} from '../errors';
import {ListingStatus} from '@/types';

const mockCreateGeminiClient = createGeminiClient as jest.MockedFunction<typeof createGeminiClient>;
const mockRecordSuccess = recordSuccess as jest.MockedFunction<typeof recordSuccess>;
const mockRecordError = recordError as jest.MockedFunction<typeof recordError>;

describe('Gemini Refresh Service', () => {
    const mockGenerateContent = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default mock for Gemini client
        mockCreateGeminiClient.mockResolvedValue({
            models: {
                generateContent: mockGenerateContent,
            },
        } as any);
    });

    describe('refreshListingWithGemini', () => {
        const testUrl = 'https://otomoto.pl/oferta/bmw-320d-123';
        const testPageText = 'BMW 320d 2020 150000 PLN Available';
        const testPageTitle = 'BMW 320d - Otomoto';

        describe('successful refresh', () => {
            it('should return active status when listing is available', async () => {
                mockGenerateContent.mockResolvedValue({
                    text: JSON.stringify({
                        price: 150000,
                        currency: 'PLN',
                        isAvailable: true,
                        isSold: false,
                    }),
                });

                const result = await refreshListingWithGemini(testUrl, testPageText, testPageTitle);

                expect(result.price).toBe(150000);
                expect(result.currency).toBe('PLN');
                expect(result.status).toBe(ListingStatus.ACTIVE);
            });

            it('should return ENDED status when listing is sold', async () => {
                mockGenerateContent.mockResolvedValue({
                    text: JSON.stringify({
                        price: 140000,
                        currency: 'PLN',
                        isAvailable: false,
                        isSold: true,
                    }),
                });

                const result = await refreshListingWithGemini(testUrl, testPageText, testPageTitle);

                expect(result.status).toBe(ListingStatus.ENDED);
            });

            it('should return ENDED status when listing is unavailable', async () => {
                mockGenerateContent.mockResolvedValue({
                    text: JSON.stringify({
                        price: 0,
                        currency: 'PLN',
                        isAvailable: false,
                        isSold: false,
                    }),
                });

                const result = await refreshListingWithGemini(testUrl, testPageText, testPageTitle);

                expect(result.status).toBe(ListingStatus.ENDED);
            });

            it('should record success in history', async () => {
                mockGenerateContent.mockResolvedValue({
                    text: JSON.stringify({
                        price: 150000,
                        currency: 'EUR',
                        isAvailable: true,
                        isSold: false,
                    }),
                });

                await refreshListingWithGemini(testUrl, testPageText, testPageTitle);

                expect(mockRecordSuccess).toHaveBeenCalledTimes(1);
                expect(mockRecordSuccess).toHaveBeenCalledWith(
                    testUrl,
                    expect.any(String),
                    expect.objectContaining({text: expect.any(String)})
                );
            });

            it('should handle EUR currency', async () => {
                mockGenerateContent.mockResolvedValue({
                    text: JSON.stringify({
                        price: 35000,
                        currency: 'EUR',
                        isAvailable: true,
                        isSold: false,
                    }),
                });

                const result = await refreshListingWithGemini(testUrl, testPageText, testPageTitle);

                expect(result.currency).toBe('EUR');
            });

            it('should default currency to PLN when not provided', async () => {
                mockGenerateContent.mockResolvedValue({
                    text: JSON.stringify({
                        price: 150000,
                        isAvailable: true,
                        isSold: false,
                    }),
                });

                const result = await refreshListingWithGemini(testUrl, testPageText, testPageTitle);

                expect(result.currency).toBe('PLN');
            });

            it('should return 0 price when price is invalid', async () => {
                mockGenerateContent.mockResolvedValue({
                    text: JSON.stringify({
                        price: -100,
                        currency: 'PLN',
                        isAvailable: true,
                        isSold: false,
                    }),
                });

                const result = await refreshListingWithGemini(testUrl, testPageText, testPageTitle);

                expect(result.price).toBe(0);
            });

            it('should handle price as 0 when not a number', async () => {
                mockGenerateContent.mockResolvedValue({
                    text: JSON.stringify({
                        price: 'not a number',
                        currency: 'PLN',
                        isAvailable: true,
                        isSold: false,
                    }),
                });

                const result = await refreshListingWithGemini(testUrl, testPageText, testPageTitle);

                expect(result.price).toBe(0);
            });
        });

        describe('input validation', () => {
            it('should throw error for empty page content', async () => {
                await expect(
                    refreshListingWithGemini(testUrl, '', testPageTitle)
                ).rejects.toThrow('Page content is empty or invalid');
            });

            it('should throw error for whitespace-only page content', async () => {
                await expect(
                    refreshListingWithGemini(testUrl, '   \n\t  ', testPageTitle)
                ).rejects.toThrow('Page content is empty or invalid');
            });

            it('should throw error for null page content', async () => {
                await expect(
                    refreshListingWithGemini(testUrl, null as any, testPageTitle)
                ).rejects.toThrow('Page content is empty or invalid');
            });

            it('should throw error for non-string page content', async () => {
                await expect(
                    refreshListingWithGemini(testUrl, 123 as any, testPageTitle)
                ).rejects.toThrow('Page content is empty or invalid');
            });
        });

        describe('error handling', () => {
            it('should record error in history when API fails', async () => {
                mockGenerateContent.mockRejectedValue(new Error('Network error'));

                await expect(
                    refreshListingWithGemini(testUrl, testPageText, testPageTitle)
                ).rejects.toThrow('Network error');

                expect(mockRecordError).toHaveBeenCalledWith(
                    testUrl,
                    expect.any(String),
                    'Network error'
                );
            });

            it('should throw error when AI returns no text', async () => {
                mockGenerateContent.mockResolvedValue({text: ''});

                await expect(
                    refreshListingWithGemini(testUrl, testPageText, testPageTitle)
                ).rejects.toThrow('No response from AI');
            });

            it('should throw error when AI returns null text', async () => {
                mockGenerateContent.mockResolvedValue({text: null});

                await expect(
                    refreshListingWithGemini(testUrl, testPageText, testPageTitle)
                ).rejects.toThrow('No response from AI');
            });

            it('should throw RateLimitError when rate limited (429)', async () => {
                mockGenerateContent.mockRejectedValue(new Error('Request failed with status 429'));

                await expect(
                    refreshListingWithGemini(testUrl, testPageText, testPageTitle)
                ).rejects.toThrow(RateLimitError);
            });

            it('should throw RateLimitError for quota exceeded errors', async () => {
                mockGenerateContent.mockRejectedValue(new Error('quota exceeded'));

                await expect(
                    refreshListingWithGemini(testUrl, testPageText, testPageTitle)
                ).rejects.toThrow(RateLimitError);
            });

            it('should throw RateLimitError for rate limit errors', async () => {
                mockGenerateContent.mockRejectedValue(new Error('Rate limit reached'));

                await expect(
                    refreshListingWithGemini(testUrl, testPageText, testPageTitle)
                ).rejects.toThrow(RateLimitError);
            });

            it('should throw RateLimitError for resource exhausted errors', async () => {
                mockGenerateContent.mockRejectedValue(new Error('Resource exhausted'));

                await expect(
                    refreshListingWithGemini(testUrl, testPageText, testPageTitle)
                ).rejects.toThrow(RateLimitError);
            });

            it('should not wrap non-rate-limit errors in RateLimitError', async () => {
                mockGenerateContent.mockRejectedValue(new Error('Server error 500'));

                await expect(
                    refreshListingWithGemini(testUrl, testPageText, testPageTitle)
                ).rejects.not.toBeInstanceOf(RateLimitError);
            });

            it('should handle JSON parse errors', async () => {
                mockGenerateContent.mockResolvedValue({text: 'invalid json {'});

                await expect(
                    refreshListingWithGemini(testUrl, testPageText, testPageTitle)
                ).rejects.toThrow();

                expect(mockRecordError).toHaveBeenCalled();
            });
        });
    });
});

