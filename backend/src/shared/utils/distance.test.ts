import { describe, expect, it } from "vitest";
import { AppError } from "../errors/app-error.js";
import { getDistanceInKm, InvalidCoordinatesError, type Coordinates } from "./distance.js";

const MONAS: Coordinates = { lat: -6.1754, lng: 106.8272 };
const GEDUNG_SATE: Coordinates = { lat: -6.9025, lng: 107.6188 };
const LONDON: Coordinates = { lat: 51.5074, lng: -0.1278 };
const PARIS: Coordinates = { lat: 48.8566, lng: 2.3522 };

describe("getDistanceInKm", () => {
    it("returns 0 for the same point", () => {
        expect(getDistanceInKm(MONAS, MONAS)).toBe(0);
    });

    it("calculates Jakarta (Monas) to Bandung (Gedung Sate) at roughly 119 km", () => {
        const km = getDistanceInKm(MONAS, GEDUNG_SATE);
        expect(km).toBeGreaterThan(118);
        expect(km).toBeLessThan(120);
    });

    it("calculates London to Paris at roughly 343.5 km", () => {
        const km = getDistanceInKm(LONDON, PARIS);
        expect(km).toBeGreaterThan(343);
        expect(km).toBeLessThan(344.5);
    });

    it("is symmetric", () => {
        expect(getDistanceInKm(MONAS, GEDUNG_SATE)).toBeCloseTo(getDistanceInKm(GEDUNG_SATE, MONAS), 9);
    });

    it("returns about 111.2 km for one degree of longitude at the equator", () => {
        expect(getDistanceInKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(111.195, 2);
    });

    it("returns half the Earth's circumference for antipodal points", () => {
        expect(getDistanceInKm({ lat: 0, lng: 0 }, { lat: 0, lng: 180 })).toBeCloseTo(Math.PI * 6371.0088, 3);
    });

    it("handles crossing the antimeridian (shortest path, not the long way around)", () => {
        const km = getDistanceInKm({ lat: 0, lng: 179.5 }, { lat: 0, lng: -179.5 });
        expect(km).toBeCloseTo(111.195, 2);
    });

    it.each<[string, Coordinates]>([
        ["latitude above 90", { lat: 90.1, lng: 0 }],
        ["latitude below -90", { lat: -90.1, lng: 0 }],
        ["longitude above 180", { lat: 0, lng: 180.1 }],
        ["longitude below -180", { lat: 0, lng: -180.1 }],
        ["NaN latitude", { lat: Number.NaN, lng: 0 }],
        ["infinite longitude", { lat: 0, lng: Number.POSITIVE_INFINITY }],
    ])("throws InvalidCoordinatesError for %s", (_label, bad) => {
        expect(() => getDistanceInKm(bad, MONAS)).toThrow(InvalidCoordinatesError);
        expect(() => getDistanceInKm(MONAS, bad)).toThrow(InvalidCoordinatesError);
    });

    it("throws an AppError with a 400 status and INVALID_COORDINATES code", () => {
        try {
            getDistanceInKm({ lat: 100, lng: 0 }, MONAS);
            expect.unreachable();
        } catch (err) {
            expect(err).toBeInstanceOf(AppError);
            if (err instanceof AppError) {
                expect(err.statusCode).toBe(400);
                expect(err.code).toBe("INVALID_COORDINATES");
            }
        }
    });
});

