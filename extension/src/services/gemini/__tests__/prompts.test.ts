/**
 * Tests for Gemini Prompt Templates
 */

import {buildParsePrompt, buildRefreshPrompt} from '../prompts';

describe('Gemini Prompts', () => {
    describe('buildParsePrompt', () => {
        it('should include page title', () => {
            const prompt = buildParsePrompt('BMW 320d - Otomoto', 'https://otomoto.pl/123', 'test content');
            expect(prompt).toContain('BMW 320d - Otomoto');
        });

        it('should include page URL', () => {
            const prompt = buildParsePrompt('Title', 'https://otomoto.pl/123', 'test content');
            expect(prompt).toContain('https://otomoto.pl/123');
        });

        it('should include page content', () => {
            const content = 'This is the page content with car details';
            const prompt = buildParsePrompt('Title', 'https://example.com', content);
            expect(prompt).toContain(content);
        });

        it('should truncate long content to 15000 characters', () => {
            const longContent = 'a'.repeat(20000);
            const prompt = buildParsePrompt('Title', 'https://example.com', longContent);
            // Prompt should not contain full 20000 chars
            expect(prompt.length).toBeLessThan(20000 + 2000); // Some overhead for template
        });

        it('should include VIN extraction rules', () => {
            const prompt = buildParsePrompt('Title', 'https://example.com', 'content');
            expect(prompt).toContain('VIN');
            expect(prompt).toContain('17 characters');
        });

        it('should include Polish timezone handling instructions', () => {
            const prompt = buildParsePrompt('Title', 'https://example.com', 'content');
            expect(prompt).toContain('Europe/Warsaw');
            expect(prompt).toContain('+01:00');
        });

        it('should include Polish month names for date parsing', () => {
            const prompt = buildParsePrompt('Title', 'https://example.com', 'content');
            expect(prompt).toContain('stycznia');
            expect(prompt).toContain('grudnia');
        });

        it('should mention origin country extraction', () => {
            const prompt = buildParsePrompt('Title', 'https://example.com', 'content');
            expect(prompt).toContain('originCountry');
            expect(prompt).toContain('IMPORTED FROM');
        });
    });

    describe('buildRefreshPrompt', () => {
        it('should include page title', () => {
            const prompt = buildRefreshPrompt('BMW 320d', 'https://example.com', 'content');
            expect(prompt).toContain('BMW 320d');
        });

        it('should include page URL', () => {
            const prompt = buildRefreshPrompt('Title', 'https://otomoto.pl/offer/123', 'content');
            expect(prompt).toContain('https://otomoto.pl/offer/123');
        });

        it('should include page content', () => {
            const content = 'Price: 150,000 PLN';
            const prompt = buildRefreshPrompt('Title', 'https://example.com', content);
            expect(prompt).toContain(content);
        });

        it('should truncate content to 10000 characters', () => {
            const longContent = 'b'.repeat(15000);
            const prompt = buildRefreshPrompt('Title', 'https://example.com', longContent);
            // Should be truncated
            expect(prompt).toContain('truncated');
        });

        it('should mention price extraction', () => {
            const prompt = buildRefreshPrompt('Title', 'https://example.com', 'content');
            expect(prompt).toContain('price');
        });

        it('should mention availability status', () => {
            const prompt = buildRefreshPrompt('Title', 'https://example.com', 'content');
            expect(prompt).toContain('isAvailable');
        });

        it('should mention sold status', () => {
            const prompt = buildRefreshPrompt('Title', 'https://example.com', 'content');
            expect(prompt).toContain('isSold');
        });

        it('should mention currency extraction', () => {
            const prompt = buildRefreshPrompt('Title', 'https://example.com', 'content');
            expect(prompt).toContain('currency');
            expect(prompt).toContain('PLN');
        });
    });

    describe('buildParsePrompt - Facebook Marketplace specific', () => {
        const fbMarketplaceUrl = 'https://www.facebook.com/marketplace/item/1585121479338508/?ref=product_details';
        const fbCommerceUrl = 'https://www.facebook.com/commerce/listing/1290047786300978/?ref=share';

        it('should include Facebook-specific rules for marketplace item URLs', () => {
            const prompt = buildParsePrompt('2020 Ford Edge | Facebook', fbMarketplaceUrl, 'content');
            expect(prompt).toContain('FACEBOOK MARKETPLACE SPECIFIC RULES');
        });

        it('should include Facebook-specific rules for commerce listing URLs', () => {
            const prompt = buildParsePrompt('2020 Ford Edge | Facebook', fbCommerceUrl, 'content');
            expect(prompt).toContain('FACEBOOK MARKETPLACE SPECIFIC RULES');
        });

        it('should NOT include Facebook rules for non-Facebook URLs', () => {
            const prompt = buildParsePrompt('BMW 320d - Otomoto', 'https://otomoto.pl/123', 'content');
            expect(prompt).not.toContain('FACEBOOK MARKETPLACE SPECIFIC RULES');
            expect(prompt).not.toContain('FACEBOOK GROUP POST SPECIFIC RULES');
        });

        it('should include current timestamp for relative date calculation', () => {
            const prompt = buildParsePrompt('Title', fbMarketplaceUrl, 'content');
            expect(prompt).toContain('Current timestamp is:');
            // Should contain ISO format timestamp
            expect(prompt).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });

        it('should include relative date patterns in Polish', () => {
            const prompt = buildParsePrompt('Title', fbMarketplaceUrl, 'content');
            expect(prompt).toContain('tygodni temu');
            expect(prompt).toContain('dni temu');
            expect(prompt).toContain('min temu');
            expect(prompt).toContain('godz. temu');
        });

        it('should include instructions for two data sources', () => {
            const prompt = buildParsePrompt('Title', fbMarketplaceUrl, 'content');
            expect(prompt).toContain('Informacje o pojeździe');
            expect(prompt).toContain('Opis sprzedawcy');
        });

        it('should include instructions for handling invalid engine capacity', () => {
            const prompt = buildParsePrompt('Title', fbMarketplaceUrl, 'content');
            expect(prompt).toContain('-1.0 L');
            expect(prompt).toContain('extract from seller description');
        });

        it('should include ownership extraction rules', () => {
            const prompt = buildParsePrompt('Title', fbMarketplaceUrl, 'content');
            expect(prompt).toContain('właściciel');
        });

        it('should include drive type extraction rules', () => {
            const prompt = buildParsePrompt('Title', fbMarketplaceUrl, 'content');
            expect(prompt).toContain('4x4');
            expect(prompt).toContain('AWD');
        });
    });

    describe('buildParsePrompt - Facebook Group posts', () => {
        const fbGroupPermalinkUrl = 'https://www.facebook.com/groups/2745745475668729/permalink/4268638163379445/';
        const fbGroupPostsUrl = 'https://www.facebook.com/groups/123456789/posts/987654321/';

        it('should include Facebook Group rules for permalink URLs', () => {
            const prompt = buildParsePrompt('Post Jakub Parda', fbGroupPermalinkUrl, 'content');
            expect(prompt).toContain('FACEBOOK GROUP POST SPECIFIC RULES');
        });

        it('should include Facebook Group rules for posts URLs', () => {
            const prompt = buildParsePrompt('Post User Name', fbGroupPostsUrl, 'content');
            expect(prompt).toContain('FACEBOOK GROUP POST SPECIFIC RULES');
        });

        it('should NOT include Marketplace rules for group posts', () => {
            const prompt = buildParsePrompt('Post Jakub Parda', fbGroupPermalinkUrl, 'content');
            expect(prompt).not.toContain('FACEBOOK MARKETPLACE SPECIFIC RULES');
        });

        it('should include common Facebook rules for group posts', () => {
            const prompt = buildParsePrompt('Post Jakub Parda', fbGroupPermalinkUrl, 'content');
            expect(prompt).toContain('FACEBOOK COMMON RULES');
            expect(prompt).toContain('Current timestamp is:');
        });

        it('should include VIN extraction pattern for group posts', () => {
            const prompt = buildParsePrompt('Post Jakub Parda', fbGroupPermalinkUrl, 'content');
            expect(prompt).toContain('VIN:');
        });

        it('should include Polish price patterns for group posts', () => {
            const prompt = buildParsePrompt('Post Jakub Parda', fbGroupPermalinkUrl, 'content');
            expect(prompt).toContain('Cena:');
        });

        it('should include mileage pattern for group posts', () => {
            const prompt = buildParsePrompt('Post Jakub Parda', fbGroupPermalinkUrl, 'content');
            expect(prompt).toContain('Przebieg:');
        });

        it('should include fuel type patterns for group posts', () => {
            const prompt = buildParsePrompt('Post Jakub Parda', fbGroupPermalinkUrl, 'content');
            expect(prompt).toContain('Rodzaj paliwa:');
            expect(prompt).toContain('Benzyna');
        });

        it('should include transmission patterns for group posts', () => {
            const prompt = buildParsePrompt('Post Jakub Parda', fbGroupPermalinkUrl, 'content');
            expect(prompt).toContain('Skrzynia biegów:');
            expect(prompt).toContain('Automatyczna');
        });

        it('should include seller extraction instructions for group posts', () => {
            const prompt = buildParsePrompt('Post Jakub Parda', fbGroupPermalinkUrl, 'content');
            expect(prompt).toContain('post author');
            expect(prompt).toContain('phone');
        });

        it('should include feature extraction patterns for group posts', () => {
            const prompt = buildParsePrompt('Post Jakub Parda', fbGroupPermalinkUrl, 'content');
            expect(prompt).toContain('skórzane');
            expect(prompt).toContain('Kamera cofania');
        });

        it('should include condition indicators for group posts', () => {
            const prompt = buildParsePrompt('Post Jakub Parda', fbGroupPermalinkUrl, 'content');
            expect(prompt).toContain('bezwypadkowy');
            expect(prompt).toContain('serwisowane');
        });
    });
});

