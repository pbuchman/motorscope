/**
 * Car Listing Response Schema
 *
 * Defines the structured output schema for Gemini when parsing car listings.
 * This is a large schema that maps to our CarListing type.
 */

import {Type} from "@google/genai";

/**
 * JSON Schema for full car listing extraction.
 * Used with Gemini's structured output feature.
 */
export const carListingSchema = {
    type: Type.OBJECT,
    description: "Extracted car listing data from a vehicle marketplace page",
    properties: {
        title: {
            type: Type.STRING,
            description: "The listing title, usually containing make, model, and year"
        },

        vehicle: {
            type: Type.OBJECT,
            description: "All vehicle-specific information",
            properties: {
                vin: {
                    type: Type.STRING,
                    nullable: true,
                    description: "Vehicle Identification Number - EXACTLY 17 alphanumeric characters (excluding I, O, Q). Set to null if not found or invalid."
                },
                make: {
                    type: Type.STRING,
                    nullable: true,
                    description: "Vehicle manufacturer (e.g., BMW, Audi, Toyota)"
                },
                model: {
                    type: Type.STRING,
                    nullable: true,
                    description: "Vehicle model name (e.g., Seria 5, A4, Camry)"
                },
                generation: {
                    type: Type.STRING,
                    nullable: true,
                    description: "Model generation code if available (e.g., G30, B9, XV70)"
                },
                trim: {
                    type: Type.STRING,
                    nullable: true,
                    description: "Trim level or package (e.g., M Sport, S-line, Limited)"
                },
                bodyType: {
                    type: Type.STRING,
                    nullable: true,
                    description: "Body style (e.g., Sedan, SUV, Kombi/Estate, Hatchback, Coupe)"
                },
                productionYear: {
                    type: Type.NUMBER,
                    nullable: true,
                    description: "Year the vehicle was manufactured"
                },
                firstRegistrationYear: {
                    type: Type.NUMBER,
                    nullable: true,
                    description: "Year of first registration (may differ from production year)"
                },
                mileage: {
                    type: Type.OBJECT,
                    description: "Vehicle odometer reading",
                    properties: {
                        value: {
                            type: Type.NUMBER,
                            nullable: true,
                            description: "Numeric mileage value (e.g., 125000)"
                        },
                        unit: {
                            type: Type.STRING,
                            nullable: true,
                            description: "Unit of measurement: 'km' or 'mi'"
                        },
                    },
                },
                engine: {
                    type: Type.OBJECT,
                    description: "Engine specifications",
                    properties: {
                        capacityCc: {
                            type: Type.NUMBER,
                            nullable: true,
                            description: "Engine displacement in cubic centimeters (e.g., 1998 for 2.0L)"
                        },
                        fuelType: {
                            type: Type.STRING,
                            nullable: true,
                            description: "Fuel type (e.g., Benzyna/Petrol, Diesel, Elektryczny/Electric, Hybryda/Hybrid, LPG)"
                        },
                        powerKw: {
                            type: Type.NUMBER,
                            nullable: true,
                            description: "Engine power in kilowatts"
                        },
                        powerHp: {
                            type: Type.NUMBER,
                            nullable: true,
                            description: "Engine power in horsepower (KM/PS/HP)"
                        },
                        engineCode: {
                            type: Type.STRING,
                            nullable: true,
                            description: "Manufacturer engine code (e.g., B47, EA888)"
                        },
                        euroStandard: {
                            type: Type.STRING,
                            nullable: true,
                            description: "Emission standard (e.g., Euro 6, Euro 5)"
                        },
                        hybridType: {
                            type: Type.STRING,
                            nullable: true,
                            description: "For hybrids: 'mild', 'full', 'plug-in'"
                        },
                    },
                },
                drivetrain: {
                    type: Type.OBJECT,
                    description: "Transmission and drive configuration",
                    properties: {
                        transmissionType: {
                            type: Type.STRING,
                            nullable: true,
                            description: "Transmission type (e.g., Automatyczna/Automatic, Manualna/Manual)"
                        },
                        transmissionSubtype: {
                            type: Type.STRING,
                            nullable: true,
                            description: "Specific transmission type (e.g., DSG, CVT, Tiptronic)"
                        },
                        gearsCount: {
                            type: Type.NUMBER,
                            nullable: true,
                            description: "Number of gears"
                        },
                        driveType: {
                            type: Type.STRING,
                            nullable: true,
                            description: "Drive configuration (e.g., FWD, RWD, AWD/4x4)"
                        },
                    },
                },
                condition: {
                    type: Type.OBJECT,
                    description: "Vehicle condition declarations - only set if explicitly stated in listing",
                    properties: {
                        isNew: {
                            type: Type.BOOLEAN,
                            nullable: true,
                            description: "true if vehicle is brand new, false if used, null if not stated"
                        },
                        isImported: {
                            type: Type.BOOLEAN,
                            nullable: true,
                            description: "true if imported from another country, null if not stated"
                        },
                        accidentFreeDeclared: {
                            type: Type.BOOLEAN,
                            nullable: true,
                            description: "true if seller declares 'bezwypadkowy'/accident-free, null if not stated"
                        },
                        serviceHistoryDeclared: {
                            type: Type.BOOLEAN,
                            nullable: true,
                            description: "true if seller mentions full service history/ASO, null if not stated"
                        },
                    },
                },
                colorAndInterior: {
                    type: Type.OBJECT,
                    description: "Color and interior details",
                    properties: {
                        exteriorColor: {
                            type: Type.STRING,
                            nullable: true,
                            description: "Exterior paint color (e.g., Czarny/Black, Biały/White)"
                        },
                        interiorColor: {
                            type: Type.STRING,
                            nullable: true,
                            description: "Interior color"
                        },
                        upholsteryType: {
                            type: Type.STRING,
                            nullable: true,
                            description: "Interior material (e.g., Skóra/Leather, Alcantara, Tkanina/Fabric)"
                        },
                    },
                },
                registration: {
                    type: Type.OBJECT,
                    description: "Registration and origin information",
                    properties: {
                        plateNumber: {
                            type: Type.STRING,
                            nullable: true,
                            description: "License plate number if visible"
                        },
                        originCountry: {
                            type: Type.STRING,
                            nullable: true,
                            description: "Country the vehicle was IMPORTED FROM or originally registered in (e.g., 'Niemcy'/'Germany', 'USA'). This is the ORIGIN country, not current location."
                        },
                        registeredInCountryCode: {
                            type: Type.STRING,
                            nullable: true,
                            description: "Country code where vehicle is currently registered (e.g., 'PL', 'DE')"
                        },
                    },
                },
            },
        },

        pricing: {
            type: Type.OBJECT,
            description: "Pricing information",
            properties: {
                currency: {
                    type: Type.STRING,
                    description: "Currency code (PLN, EUR, USD, GBP)"
                },
                currentPrice: {
                    type: Type.NUMBER,
                    description: "Current asking price as a number (no formatting)"
                },
                originalPrice: {
                    type: Type.NUMBER,
                    nullable: true,
                    description: "Original price before discount, if shown"
                },
                negotiable: {
                    type: Type.BOOLEAN,
                    nullable: true,
                    description: "true if price is marked as negotiable"
                },
            },
            required: ["currency", "currentPrice"],
        },

        location: {
            type: Type.OBJECT,
            description: "Seller/vehicle location",
            properties: {
                city: {
                    type: Type.STRING,
                    nullable: true,
                    description: "City name"
                },
                region: {
                    type: Type.STRING,
                    nullable: true,
                    description: "Region/voivodeship/state"
                },
                postalCode: {
                    type: Type.STRING,
                    nullable: true,
                    description: "Postal/ZIP code"
                },
                countryCode: {
                    type: Type.STRING,
                    nullable: true,
                    description: "Country code (PL, DE, etc.)"
                },
            },
        },

        seller: {
            type: Type.OBJECT,
            description: "Seller information",
            properties: {
                type: {
                    type: Type.STRING,
                    nullable: true,
                    description: "Seller type (e.g., 'private', 'dealer')"
                },
                name: {
                    type: Type.STRING,
                    nullable: true,
                    description: "Seller or dealership name"
                },
                phone: {
                    type: Type.STRING,
                    nullable: true,
                    description: "Seller phone number if visible on the listing"
                },
                isCompany: {
                    type: Type.BOOLEAN,
                    nullable: true,
                    description: "true if seller is a company/dealer"
                },
            },
        },

        dates: {
            type: Type.OBJECT,
            description: "Listing date information",
            properties: {
                postedAt: {
                    type: Type.STRING,
                    nullable: true,
                    description: "When the listing was posted (ISO 8601 format)"
                },
            },
        },
    },
    required: ["title", "pricing", "vehicle"],
};

/**
 * JSON Schema for listing refresh (price/status only).
 * Lighter schema for periodic updates.
 */
export const refreshSchema = {
    type: Type.OBJECT,
    properties: {
        price: {type: Type.NUMBER},
        currency: {type: Type.STRING},
        isAvailable: {type: Type.BOOLEAN},
        isSold: {type: Type.BOOLEAN},
    },
    required: ["price", "currency", "isAvailable"],
};

