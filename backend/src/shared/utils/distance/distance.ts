import { InvalidCoordinatesError } from "./errors.js";

export * from "./errors.js";

export interface Coordinates {
    readonly lat: number;
    readonly lng: number;
}

/** Mean Earth radius (IUGG), in kilometers */
const EARTH_RADIUS_KM = 6371.0088;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const isValidCoordinates = ({ lat, lng }: Coordinates) =>
    Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

/**
 * Straight-line ("as the crow flies") distance between two points on Earth,
 * using the haversine formula. Returns kilometers, unrounded.
 */
export function getDistanceInKm(from: Coordinates, to: Coordinates): number {
    if (!isValidCoordinates(from)) throw new InvalidCoordinatesError(from);
    if (!isValidCoordinates(to)) throw new InvalidCoordinatesError(to);

    const dLat = toRadians(to.lat - from.lat);
    const dLng = toRadians(to.lng - from.lng);

    const a =
        Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;

    // Clamp guards against floating-point drift slightly above 1 for antipodal points
    const c = 2 * Math.asin(Math.min(1, Math.sqrt(a)));

    return EARTH_RADIUS_KM * c;
}

