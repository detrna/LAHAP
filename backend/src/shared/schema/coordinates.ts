import type { z } from "zod";
import { decimalSchema } from "./decimal.js";

const COORDINATE_SCALE = 8;

export const latitudeSchema = decimalSchema({ scale: COORDINATE_SCALE, min: -90, max: 90 });

export const longitudeSchema = decimalSchema({ scale: COORDINATE_SCALE, min: -180, max: 180 });

export interface CoordinatePair {
    readonly latitude?: number | null | undefined;
    readonly longitude?: number | null | undefined;
}

export function refineCoordinatesTogether(value: CoordinatePair, ctx: z.RefinementCtx): void {
    const hasLatitude = value.latitude !== undefined && value.latitude !== null;
    const hasLongitude = value.longitude !== undefined && value.longitude !== null;
    if (hasLatitude !== hasLongitude) {
        ctx.addIssue({
            code: "custom",
            path: [hasLatitude ? "longitude" : "latitude"],
            message: "latitude and longitude must be sent together",
        });
    }
}

export function refineCoordinatesPatch(value: CoordinatePair, ctx: z.RefinementCtx): void {
    const hasLatitude = value.latitude !== undefined;
    const hasLongitude = value.longitude !== undefined;
    if (hasLatitude !== hasLongitude) {
        ctx.addIssue({
            code: "custom",
            path: [hasLatitude ? "longitude" : "latitude"],
            message: "latitude and longitude must be sent together",
        });
        return;
    }
    if (hasLatitude && (value.latitude === null) !== (value.longitude === null)) {
        ctx.addIssue({
            code: "custom",
            path: [value.latitude === null ? "longitude" : "latitude"],
            message: "latitude and longitude must both be null to clear them",
        });
    }
}
