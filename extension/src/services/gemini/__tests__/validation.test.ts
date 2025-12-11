/**
 * Tests for Gemini Response Validation
 */

import {validateParseResponse, validateRefreshResponse} from '../validation';

describe('Gemini Validation', () => {
    describe('validateParseResponse', () => {
        const validResponse = {
            title: 'BMW 320d 2020',
            pricing: {
                currentPrice: 150000,
                currency: 'PLN',
            },
            vehicle: {
                make: 'BMW',
                model: '320d',
            },
        };

        it('should accept valid response', () => {
            expect(() => validateParseResponse(validResponse)).not.toThrow();
        });

        describe('title validation', () => {
            it('should throw for missing title', () => {
                const response = {...validResponse, title: undefined};
                expect(() => validateParseResponse(response as any)).toThrow('missing or has invalid title');
            });

            it('should throw for empty title', () => {
                const response = {...validResponse, title: ''};
                expect(() => validateParseResponse(response)).toThrow('missing or has invalid title');
            });

            it('should throw for whitespace-only title', () => {
                const response = {...validResponse, title: '   '};
                expect(() => validateParseResponse(response)).toThrow('missing or has invalid title');
            });

            it('should throw for non-string title', () => {
                const response = {...validResponse, title: 123};
                expect(() => validateParseResponse(response as any)).toThrow('missing or has invalid title');
            });
        });

        describe('pricing validation', () => {
            it('should throw for missing pricing', () => {
                const response = {...validResponse, pricing: undefined};
                expect(() => validateParseResponse(response as any)).toThrow('missing or has invalid price');
            });

            it('should throw for zero price', () => {
                const response = {
                    ...validResponse,
                    pricing: {currentPrice: 0, currency: 'PLN'},
                };
                expect(() => validateParseResponse(response)).toThrow('missing or has invalid price');
            });

            it('should throw for negative price', () => {
                const response = {
                    ...validResponse,
                    pricing: {currentPrice: -100, currency: 'PLN'},
                };
                expect(() => validateParseResponse(response)).toThrow('missing or has invalid price');
            });

            it('should throw for non-numeric price', () => {
                const response = {
                    ...validResponse,
                    pricing: {currentPrice: '150000', currency: 'PLN'},
                };
                expect(() => validateParseResponse(response as any)).toThrow('missing or has invalid price');
            });

            it('should throw for missing currency', () => {
                const response = {
                    ...validResponse,
                    pricing: {currentPrice: 150000, currency: undefined},
                };
                expect(() => validateParseResponse(response as any)).toThrow('missing or has invalid currency');
            });

            it('should throw for non-string currency', () => {
                const response = {
                    ...validResponse,
                    pricing: {currentPrice: 150000, currency: 123},
                };
                expect(() => validateParseResponse(response as any)).toThrow('missing or has invalid currency');
            });
        });

        describe('vehicle validation', () => {
            it('should throw for missing vehicle', () => {
                const response = {...validResponse, vehicle: undefined};
                expect(() => validateParseResponse(response as any)).toThrow('missing or has invalid vehicle');
            });

            it('should throw for non-object vehicle', () => {
                const response = {...validResponse, vehicle: 'not an object'};
                expect(() => validateParseResponse(response as any)).toThrow('missing or has invalid vehicle');
            });

            it('should accept empty vehicle object', () => {
                const response = {...validResponse, vehicle: {}};
                expect(() => validateParseResponse(response)).not.toThrow();
            });
        });
    });

    describe('validateRefreshResponse', () => {
        const validResponse = {
            price: 150000,
            currency: 'PLN',
            isAvailable: true,
        };

        it('should accept valid response', () => {
            expect(() => validateRefreshResponse(validResponse)).not.toThrow();
        });

        it('should accept zero price (might be free or error)', () => {
            const response = {...validResponse, price: 0};
            expect(() => validateRefreshResponse(response)).not.toThrow();
        });

        it('should throw for missing price', () => {
            const response = {currency: 'PLN', isAvailable: true};
            expect(() => validateRefreshResponse(response as any)).toThrow('missing price');
        });

        it('should throw for non-numeric price', () => {
            const response = {...validResponse, price: '150000'};
            expect(() => validateRefreshResponse(response as any)).toThrow('missing price');
        });

        it('should throw for missing currency', () => {
            const response = {price: 150000, isAvailable: true};
            expect(() => validateRefreshResponse(response as any)).toThrow('missing currency');
        });

        it('should throw for missing isAvailable', () => {
            const response = {price: 150000, currency: 'PLN'};
            expect(() => validateRefreshResponse(response as any)).toThrow('missing availability');
        });

        it('should throw for non-boolean isAvailable', () => {
            const response = {...validResponse, isAvailable: 'true'};
            expect(() => validateRefreshResponse(response as any)).toThrow('missing availability');
        });

        it('should accept isAvailable false', () => {
            const response = {...validResponse, isAvailable: false};
            expect(() => validateRefreshResponse(response)).not.toThrow();
        });
    });
});

