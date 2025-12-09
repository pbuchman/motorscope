/**
 * Tests for Gemini Response Mapper
 */

import { generateListingId, mapToCarListing } from '../mapper';

describe('Gemini Mapper', () => {
  describe('generateListingId', () => {
    it('should generate VIN-based ID for valid VIN', () => {
      const id = generateListingId('1C4SDJCT8LC248766', 'https://example.com/listing/123');
      expect(id).toBe('vin_1C4SDJCT8LC248766');
    });

    it('should generate URL-based ID when VIN is undefined', () => {
      const id = generateListingId(undefined, 'https://example.com/listing/123');
      expect(id).toMatch(/^url_[A-Za-z0-9+/=]+$/);
    });

    it('should generate URL-based ID for invalid VIN', () => {
      const id = generateListingId('INVALID', 'https://example.com/listing/123');
      expect(id).toMatch(/^url_/);
    });

    it('should generate URL-based ID for VIN with invalid characters', () => {
      const id = generateListingId('1C4SDJCTILC24876', 'https://example.com/listing/123');
      expect(id).toMatch(/^url_/);
    });

    it('should clean VIN before using', () => {
      const id = generateListingId('1c4sdjct8lc248766', 'https://example.com/listing/123');
      expect(id).toBe('vin_1C4SDJCT8LC248766');
    });

    it('should generate consistent URL-based IDs', () => {
      const url = 'https://example.com/listing/123';
      const id1 = generateListingId(undefined, url);
      const id2 = generateListingId(undefined, url);
      expect(id1).toBe(id2);
    });

    it('should generate different IDs for significantly different URLs', () => {
      const id1 = generateListingId(undefined, 'https://example.com/listing/123');
      const id2 = generateListingId(undefined, 'https://different-domain.com/other/path');
      expect(id1).not.toBe(id2);
    });
  });

  describe('mapToCarListing', () => {
    const validData = {
      title: 'BMW 320d 2020',
      pricing: {
        currentPrice: 150000,
        currency: 'PLN',
        originalPrice: 160000,
        negotiable: true,
      },
      vehicle: {
        vin: '1C4SDJCT8LC248766',
        make: 'BMW',
        model: '320d',
        productionYear: 2020,
        mileage: { value: 50000, unit: 'km' },
        engine: {
          fuelType: 'Diesel',
          powerHp: 190,
        },
        drivetrain: {
          transmissionType: 'Automatic',
        },
        condition: {
          isNew: false,
          accidentFreeDeclared: true,
        },
        colorAndInterior: {
          exteriorColor: 'Black',
        },
      },
      location: {
        city: 'Warsaw',
        region: 'Mazowieckie',
        countryCode: 'PL',
      },
      seller: {
        name: 'Auto Dealer',
        phone: '123456789',
        isCompany: true,
      },
      dates: {
        postedAt: '2025-12-01T10:00:00Z',
      },
    };

    const url = 'https://www.otomoto.pl/oferta/bmw-320d?ref=test';
    const pageTitle = 'BMW 320d - Otomoto';

    it('should map basic fields correctly', () => {
      const result = mapToCarListing(validData, url, pageTitle);

      expect(result.title).toBe('BMW 320d 2020');
      expect(result.currentPrice).toBe(150000);
      expect(result.currency).toBe('PLN');
      expect(result.originalPrice).toBe(160000);
      expect(result.negotiable).toBe(true);
    });

    it('should generate VIN-based ID for valid VIN', () => {
      const result = mapToCarListing(validData, url, pageTitle);
      expect(result.id).toBe('vin_1C4SDJCT8LC248766');
    });

    it('should normalize URL in source', () => {
      const result = mapToCarListing(validData, url, pageTitle);
      expect(result.source?.url).toBe('https://www.otomoto.pl/oferta/bmw-320d');
      expect(result.source?.url).not.toContain('?ref=');
    });

    it('should extract platform from URL', () => {
      const result = mapToCarListing(validData, url, pageTitle);
      expect(result.source?.platform).toBe('www.otomoto.pl');
    });

    it('should map vehicle data correctly', () => {
      const result = mapToCarListing(validData, url, pageTitle);

      expect(result.vehicle?.make).toBe('BMW');
      expect(result.vehicle?.model).toBe('320d');
      expect(result.vehicle?.productionYear).toBe(2020);
      expect(result.vehicle?.vin).toBe('1C4SDJCT8LC248766');
      expect(result.vehicle?.mileage?.value).toBe(50000);
      expect(result.vehicle?.mileage?.unit).toBe('km');
      expect(result.vehicle?.engine?.fuelType).toBe('Diesel');
      expect(result.vehicle?.engine?.powerHp).toBe(190);
    });

    it('should map location data correctly', () => {
      const result = mapToCarListing(validData, url, pageTitle);

      expect(result.location?.city).toBe('Warsaw');
      expect(result.location?.region).toBe('Mazowieckie');
      expect(result.location?.countryCode).toBe('PL');
    });

    it('should map seller data correctly', () => {
      const result = mapToCarListing(validData, url, pageTitle);

      expect(result.seller?.name).toBe('Auto Dealer');
      expect(result.seller?.phone).toBe('123456789');
      expect(result.seller?.isCompany).toBe(true);
    });

    it('should initialize price history with current price', () => {
      const result = mapToCarListing(validData, url, pageTitle);

      expect(result.priceHistory).toHaveLength(1);
      expect(result.priceHistory?.[0].price).toBe(150000);
      expect(result.priceHistory?.[0].currency).toBe('PLN');
      expect(result.priceHistory?.[0].date).toBeDefined();
    });

    it('should use page title when data title is missing', () => {
      const dataWithoutTitle = { ...validData, title: undefined };
      const result = mapToCarListing(dataWithoutTitle as any, url, pageTitle);
      expect(result.title).toBe(pageTitle);
    });

    it('should use scraped image URL when provided', () => {
      const scrapedImageUrl = 'https://example.com/image.jpg';
      const result = mapToCarListing(validData, url, pageTitle, scrapedImageUrl);
      expect(result.thumbnailUrl).toBe(scrapedImageUrl);
    });

    it('should use placeholder when no image URL provided', () => {
      const result = mapToCarListing(validData, url, pageTitle);
      expect(result.thumbnailUrl).toContain('placehold');
    });

    it('should handle missing optional fields', () => {
      const minimalData = {
        title: 'Test Listing',
        pricing: {
          currentPrice: 100000,
          currency: 'PLN',
        },
        vehicle: {},
      };

      const result = mapToCarListing(minimalData, url, pageTitle);

      expect(result.title).toBe('Test Listing');
      expect(result.vehicle?.make).toBeNull();
      expect(result.vehicle?.model).toBeNull();
      expect(result.location?.city).toBeNull();
      expect(result.seller?.name).toBeNull();
    });

    it('should set schema version', () => {
      const result = mapToCarListing(validData, url, pageTitle);
      expect(result.schemaVersion).toBe('1.0.0');
    });
  });
});

